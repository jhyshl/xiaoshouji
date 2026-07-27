import { reactive } from "vue";
import {
  activeBranchForCharacter,
  branchesForCharacter,
  ensureDefaultBranch,
  state,
} from "../store/linePhone.js";
import { supabase } from "./supabase.js";
import { getDeviceIdentity, renameLocalDevice } from "./deviceIdentity.js";
import { clearAnsweredQueuedMessages } from "../utils/messages.js";
import { createId, stableTextHash } from "../utils/text.js";

const APP_VERSION = "3.3.7";
const SNAPSHOT_FIELDS =
  "entity_type,entity_id,source_device_id,revision,is_deleted,payload,updated_at";
const DEVICE_FIELDS =
  "id,device_name,platform,app_version,joined_seq,last_ack_seq,first_seen_at,last_seen_at,revoked_at";

export const syncState = reactive({
  initialized: false,
  busy: false,
  connected: false,
  error: "",
  userId: "",
  device: getDeviceIdentity(),
  devices: [],
  snapshots: [],
  usage: null,
  lastPullAt: 0,
  pendingWrites: 0,
});

const revisionIndex = new Map();
const writeTimers = new Map();
let realtimeChannel = null;
let pullPromise = Promise.resolve();

function entityKey(entityType, entityId) {
  return `${entityType}|${entityId}`;
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase();
}

function compactMessage(message) {
  return {
    id: message.id,
    turnId: message.turnId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || null,
    source: message.source || "phone",
    queued: Boolean(message.queued),
  };
}

function compactMessages(messages, phoneSummary = null) {
  const coveredThroughAt =
    phoneSummary?.content && !phoneSummary?.stale
      ? Number(phoneSummary.coveredThroughAt) || 0
      : 0;
  const source = (Array.isArray(messages) ? messages : [])
    .filter(
      (message) =>
        !coveredThroughAt || Number(message.createdAt) > coveredThroughAt,
    )
    .slice(-120)
    .map(compactMessage);
  while (
    source.length > 1 &&
    new Blob([JSON.stringify(source)]).size > 145 * 1024
  ) {
    source.shift();
  }
  return source;
}

function characterCardPayload(character) {
  const card = {
    name: character.name || "",
    description: character.description || "",
    personality: character.personality || "",
    scenario: character.scenario || "",
    firstMes: character.firstMes || "",
    mesExample: character.mesExample || "",
    systemPrompt: character.systemPrompt || "",
    postHistoryInstructions: character.postHistoryInstructions || "",
    creatorNotes: character.creatorNotes || "",
    tags: Array.isArray(character.tags)
      ? character.tags.slice(0, 50).map((tag) => String(tag).slice(0, 200))
      : [],
    sourceFormat: character.sourceFormat || "",
    sourceFile: character.sourceFile || "",
  };
  const textFields = Object.keys(card).filter(
    (field) => typeof card[field] === "string" && field !== "name",
  );
  while (
    new Blob([JSON.stringify(card)]).size > 70 * 1024 &&
    textFields.some((field) => card[field].length > 500)
  ) {
    const longest = textFields
      .slice()
      .sort((left, right) => card[right].length - card[left].length)[0];
    card[longest] = card[longest].slice(
      0,
      Math.max(500, Math.floor(card[longest].length * 0.72)),
    );
  }
  return card;
}

function cloudCharacterKey(character) {
  if (character.syncKey) return character.syncKey;
  character.syncKey = character.tavernCharacterKey
    ? `tavern_${stableTextHash(character.tavernCharacterKey)}`
    : character.id;
  return character.syncKey;
}

function snapshotCharacterKey(snapshot, payload) {
  return (
    payload.characterSyncKey ||
    payload.characterId ||
    String(snapshot.entity_id || "").replace(/^character:/, "")
  );
}

function ensurePhoneCharacter(snapshot) {
  const payload = snapshot.payload || {};
  const syncKey = snapshotCharacterKey(snapshot, payload);
  if (!syncKey) return null;
  const card = payload.characterCard || {};
  const characterName = card.name || payload.characterName || "åŒæ­¥è§’è‰²";
  let character =
    state.characters.find((item) => item.syncKey === syncKey) ||
    state.characters.find((item) => item.id === payload.characterId);

  if (!character) {
    const matches = state.characters.filter(
      (item) => normalizeName(item.name) === normalizeName(characterName),
    );
    if (matches.length === 1) character = matches[0];
  }
  if (!character) {
    character = {
      id: createId("char"),
      name: characterName,
      description: "",
      personality: "",
      scenario: "",
      firstMes: "",
      mesExample: "",
      systemPrompt: "",
      postHistoryInstructions: "",
      creatorNotes: "",
      tags: [],
      avatar: "",
      sourceFormat: card.sourceFormat || "cloud-sync",
      sourceFile: card.sourceFile || "",
      importedAt: Date.now(),
    };
    state.characters.push(character);
  }

  character.syncKey = syncKey;
  const remoteUpdatedAt =
    Number(payload.characterUpdatedAt) || Number(payload.updatedAt) || 0;
  if (remoteUpdatedAt >= (Number(character.cloudCharacterUpdatedAt) || 0)) {
    [
      "name",
      "description",
      "personality",
      "scenario",
      "firstMes",
      "mesExample",
      "systemPrompt",
      "postHistoryInstructions",
      "creatorNotes",
      "sourceFormat",
      "sourceFile",
    ].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(card, field)) {
        character[field] = String(card[field] || "");
      }
    });
    if (Array.isArray(card.tags)) character.tags = card.tags.map(String);
    character.cloudCharacterUpdatedAt = remoteUpdatedAt;
  }
  return character;
}

function upsertSnapshotCache(snapshot) {
  const key = entityKey(snapshot.entity_type, snapshot.entity_id);
  revisionIndex.set(key, Number(snapshot.revision) || 0);
  const index = syncState.snapshots.findIndex(
    (item) =>
      item.entity_type === snapshot.entity_type &&
      item.entity_id === snapshot.entity_id,
  );
  if (index >= 0) syncState.snapshots.splice(index, 1, snapshot);
  else syncState.snapshots.push(snapshot);
}

function autoBindCharacter(tavernCharacterKey, characterName) {
  const existing = state.sync.characterBindings[tavernCharacterKey];
  if (state.characters.some((item) => item.id === existing)) return existing;
  const normalized = normalizeName(characterName);
  const matches = state.characters.filter(
    (character) => normalizeName(character.name) === normalized,
  );
  if (matches.length !== 1) return "";
  state.sync.characterBindings[tavernCharacterKey] = matches[0].id;
  return matches[0].id;
}

function syncedCharacterId(tavernCharacterKey) {
  return `char_${String(tavernCharacterKey || "")
    .replace(/[^a-z0-9_-]/gi, "_")
    .slice(0, 80)}`;
}

function ensureTavernCharacter(payload) {
  const tavernCharacterKey =
    payload?.tavernCharacterKey || payload?.characterKey || payload?.characterId;
  if (!tavernCharacterKey) return "";
  const card = payload.card || {};
  let characterId = state.sync.characterBindings[tavernCharacterKey];
  let character = state.characters.find((item) => item.id === characterId);
  if (!character) {
    character = state.characters.find(
      (item) => item.tavernCharacterKey === tavernCharacterKey,
    );
    characterId = character?.id || "";
  }
  if (!character) {
    characterId = autoBindCharacter(
      tavernCharacterKey,
      card.name || payload.characterName,
    );
    character = state.characters.find((item) => item.id === characterId);
  }
  if (!character) {
    characterId = syncedCharacterId(tavernCharacterKey);
    character = {
      id: characterId,
      name: card.name || payload.characterName || "æœªå‘½åé…’é¦†è§’è‰²",
      description: "",
      personality: "",
      scenario: "",
      firstMes: "",
      mesExample: "",
      systemPrompt: "",
      postHistoryInstructions: "",
      creatorNotes: "",
      tags: [],
      avatar: "",
      sourceFormat: "tavern-sync",
      sourceFile: "",
      importedAt: Date.now(),
    };
    state.characters.push(character);
  }

  const fields = [
    "description",
    "personality",
    "scenario",
    "firstMes",
    "mesExample",
    "systemPrompt",
    "postHistoryInstructions",
    "creatorNotes",
  ];
  character.name = card.name || payload.characterName || character.name;
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(card, field)) {
      character[field] = String(card[field] || "");
    }
  });
  if (Array.isArray(card.tags)) character.tags = card.tags.map(String);
  character.tavernCharacterKey = tavernCharacterKey;
  character.tavernSyncedAt = Number(payload.updatedAt) || Date.now();
  character.tavernCardHash = payload.contentHash || "";
  state.sync.characterBindings[tavernCharacterKey] = characterId;
  ensureDefaultBranch(characterId);
  return characterId;
}

function applySyncedLorebooks(tavernCharacterKey, characterId, books) {
  if (!characterId) return;
  const incomingIds = new Set();
  for (const remoteBook of books) {
    const localId = `book_${tavernCharacterKey}_${remoteBook.id}`;
    incomingIds.add(localId);
    const existing = state.worldBooks.find((book) => book.id === localId);
    const existingEntries = new Map(
      (existing?.entries || []).map((entry) => [String(entry.id), entry]),
    );
    const entries = (remoteBook.entries || []).map((entry, index) => {
      const id = String(entry.id ?? index);
      const prior = existingEntries.get(id);
      return {
        id,
        keys: Array.isArray(entry.keys) ? entry.keys.map(String) : [],
        secondaryKeys: Array.isArray(entry.secondaryKeys)
          ? entry.secondaryKeys.map(String)
          : [],
        content: String(entry.content || ""),
        constant: Boolean(entry.constant),
        selective: Boolean(entry.selective),
        enabled: prior ? prior.enabled !== false : entry.enabled !== false,
        sourceEnabled: entry.enabled !== false,
        priority: Number(entry.priority) || 0,
        comment: String(entry.comment || ""),
        position: Number(entry.position) || 0,
        truncated: Boolean(entry.truncated),
      };
    });
    const next = {
      id: localId,
      name: remoteBook.name || "é…’é¦†ä¸–ç•Œä¹¦",
      entries,
      enabled: existing ? existing.enabled !== false : remoteBook.enabled !== false,
      sourceEnabled: remoteBook.enabled !== false,
      characterId,
      importedAt: existing?.importedAt || Date.now(),
      updatedAt: Date.now(),
      sourceFormat: "tavern-sync",
      tavernCharacterKey,
      tavernBookId: remoteBook.id,
      tavernScopes: Array.isArray(remoteBook.scopes) ? remoteBook.scopes : [],
    };
    const index = state.worldBooks.findIndex((book) => book.id === localId);
    if (index >= 0) state.worldBooks.splice(index, 1, next);
    else state.worldBooks.push(next);
  }
  state.worldBooks = state.worldBooks.filter(
    (book) =>
      book.tavernCharacterKey !== tavernCharacterKey || incomingIds.has(book.id),
  );
}

function rebuildTavernLorebooks(tavernCharacterKey) {
  const inbox = state.sync.tavernInbox[tavernCharacterKey];
  const indexPayload = inbox?.lorebooks;
  if (!indexPayload || !Array.isArray(indexPayload.books)) return;
  const assembled = [];
  for (const book of indexPayload.books) {
    const partIds = Array.isArray(book.partEntityIds) ? book.partEntityIds : [];
    const parts = partIds
      .map((entityId) =>
        syncState.snapshots.find(
          (snapshot) =>
            snapshot.entity_type === "tavern.lorebook.part" &&
            snapshot.entity_id === entityId &&
            !snapshot.is_deleted,
        ),
      )
      .filter(Boolean);
    if (parts.length !== partIds.length) return;
    parts.sort(
      (left, right) =>
        Number(left.payload?.partIndex || 0) - Number(right.payload?.partIndex || 0),
    );
    assembled.push({
      id: book.id,
      name: book.name,
      scopes: book.scopes,
      enabled: book.enabled,
      entries: parts.flatMap((part) => part.payload?.entries || []),
    });
  }
  inbox.assembledLorebooks = assembled;
  const characterId =
    state.sync.characterBindings[tavernCharacterKey] ||
    ensureTavernCharacter(inbox.character || indexPayload);
  applySyncedLorebooks(tavernCharacterKey, characterId, assembled);
}

function updateMismatch(tavernCharacterKey) {
  const inbox = state.sync.tavernInbox[tavernCharacterKey];
  const remote = inbox?.active;
  if (!remote?.saveId) return;
  const characterId =
    state.sync.characterBindings[tavernCharacterKey] ||
    autoBindCharacter(tavernCharacterKey, remote.characterName);
  if (!characterId) return;

  const current = activeBranchForCharacter(characterId);
  const matching = branchesForCharacter(characterId).find(
    (branch) =>
      branch.tavernCharacterKey === tavernCharacterKey &&
      branch.tavernSaveId === remote.saveId,
  );
  if (current?.id === matching?.id) {
    delete state.sync.mismatches[characterId];
    return;
  }
  state.sync.mismatches[characterId] = {
    tavernCharacterKey,
    tavernCharacterName: remote.characterName || "",
    remoteSaveId: remote.saveId,
    remoteSaveName: remote.saveName || "é…’é¦†å­˜æ¡£",
    matchingBranchId: matching?.id || "",
    detectedAt: Date.now(),
  };
}

function hydrateTavernMemory(tavernCharacterKey, characterId = "") {
  const inbox = state.sync.tavernInbox[tavernCharacterKey];
  if (!inbox) return null;
  const boundCharacterId =
    characterId ||
    state.sync.characterBindings[tavernCharacterKey] ||
    autoBindCharacter(tavernCharacterKey, inbox.characterName);
  if (!boundCharacterId) return null;

  const character = state.characters.find((item) => item.id === boundCharacterId);
  if (character && !character.tavernCharacterKey) {
    character.tavernCharacterKey = tavernCharacterKey;
  }

  const activeSaveId = String(
    inbox.active?.saveId || inbox.summary?.saveId || inbox.recent?.saveId || "",
  );
  if (!activeSaveId) return null;

  let branch = branchesForCharacter(boundCharacterId).find(
    (item) =>
      item.tavernCharacterKey === tavernCharacterKey &&
      item.tavernSaveId === activeSaveId,
  );
  if (!branch) {
    const current = activeBranchForCharacter(boundCharacterId);
    const canBindCurrent =
      current &&
      (!current.tavernCharacterKey ||
        current.tavernCharacterKey === tavernCharacterKey) &&
      (!current.tavernSaveId || current.tavernSaveId === activeSaveId);
    if (canBindCurrent) {
      branch = current;
      branch.tavernCharacterKey = tavernCharacterKey;
      branch.tavernSaveId = activeSaveId;
      branch.cloudBranchId = `tavern_${stableTextHash(
        `${tavernCharacterKey}|${activeSaveId}`,
      )}`;
      branch.localDirtyAt = Date.now();
    }
  }
  if (!branch) return null;

  if (inbox.summary?.saveId === activeSaveId) {
    branch.tavernSummary = inbox.summary;
  }
  if (inbox.recent?.saveId === activeSaveId) {
    branch.tavernRecent = inbox.recent;
  }
  branch.updatedAt = Da×Mº¶‰žËkºwµçu•ÍÍ…•%‘Ìèmt°(€€€€€Á¡½¹•MÕµµ…ÉäèÁ…å±½…¹Á¡½¹•MÕµµ…Éäñð¹Õ±°°(€€€€€Ñ…Ù•É¹MÕµµ…ÉäèÁ…å±½…¹Ñ…Ù•É¹MÕµµ…Éäñð¹Õ±°°(€€€€€Ñ…Ù•É¹I••¹ÐèÁ…å±½…¹Ñ…Ù•É¹I••¹Ðñð¹Õ±°°(€€€€€±½Õ‘I•Ù¥Í¥½¸è€À°(€€€€€É•…Ñ•‘Ðè9Õµ‰•È¡Á…å±½…¹É•…Ñ•‘Ð¤ñð…Ñ”¹¹½Ü ¤°(€€€€€ÕÁ‘…Ñ•‘Ðè…Ñ”¹¹½Ü ¤°(€€€ôì(€€€ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ím‰É…¹ ¹¥‘t€ô‰É…¹ ì(€ô((€½¹ÍÐÁÉ¥½ÉI•Ù¥Í¥½¸€ô9Õµ‰•È¡‰É…¹ ¹±½Õ‘I•Ù¥Í¥½¸¤ñð€Àì(€½¹ÍÐÉ•µ½Ñ•I•Ù¥Í¥½¸€ô9Õµ‰•È¡Í¹…ÁÍ¡½Ð¹É•Ù¥Í¥½¸¤ñð€Àì(€½¹ÍÐÉ•µ½Ñ•5•ÍÍ…•Ì€ô€¡ÉÉ…ä¹¥ÍÉÉ…ä¡Á…å±½…¹µ•ÍÍ…•Ì¤€üÁ…å±½…¹µ•ÍÍ…•Ì€èmt¤(€€€€¹™¥±Ñ•È ¡µ•ÍÍ…”¤€ôøµ•ÍÍ…”ü¹¥€˜˜µ•ÍÍ…”ü¹½¹Ñ•¹Ð¤(€€€€¹µ…À¡½µÁ…Ñ5•ÍÍ…”¤ì(€½¹ÍÐÉ•µ½Ñ•%‘Ì€ô¹•ÜM•Ð¡É•µ½Ñ•5•ÍÍ…•Ì¹µ…À ¡µ•ÍÍ…”¤€ôøµ•ÍÍ…”¹¥¤¤ì(€½¹ÍÐÉ•µ½Ñ••±•Ñ•€ô¹•ÜM•Ð (€€€ÉÉ…ä¹¥ÍÉÉ…ä¡Á…å±½…¹‘•±•Ñ•‘5•ÍÍ…•%‘Ì¤(€€€€€€üÁ…å±½…¹‘•±•Ñ•‘5•ÍÍ…•%‘Ì¹µ…À¡MÑÉ¥¹œ¤(€€€€€€èmt°(€€¤ì(€½¹ÍÐ±½…±•±•Ñ•€ô¹•ÜM•Ð (€€€ÉÉ…ä¹¥ÍÉÉ…ä¡‰É…¹ ¹‘•±•Ñ•‘5•ÍÍ…•%‘Ì¤(€€€€€€ü‰É…¹ ¹‘•±•Ñ•‘5•ÍÍ…•%‘Ì¹µ…À¡MÑÉ¥¹œ¤(€€€€€€èmt°(€€¤ì(€½¹ÍÐ‘•±•Ñ•‘%‘Ì€ô¹•ÜM•Ð¡l¸¸¹±½…±•±•Ñ•°€¸¸¹É•µ½Ñ••±•Ñ•‘t¤ì(€½¹ÍÐ±½…±	å%€ô¹•Ü5…À (€€€€¡‰É…¹ ¹µ•ÍÍ…•Ìñðmt¤¹µ…À ¡µ•ÍÍ…”¤€ôømµ•ÍÍ…”¹¥°µ•ÍÍ…•t¤°(€€¤ì((€É•µ½Ñ•5•ÍÍ…•Ì¹™½É…  ¡É•µ½Ñ•5•ÍÍ…”¤€ôøì(€€€½¹ÍÐ±½…±5•ÍÍ…”€ô±½…±	å%¹•Ð¡É•µ½Ñ•5•ÍÍ…”¹¥¤ì(€€€½¹ÍÐ±½…±Q¥µ•ÍÑ…µÀ€ô(€€€€€9Õµ‰•È¡±½…±5•ÍÍ…”ü¹ÕÁ‘…Ñ•‘Ð¤ñð9Õµ‰•È¡±½…±5•ÍÍ…”ü¹É•…Ñ•‘Ð¤ñð€Àì(€€€½¹ÍÐÉ•µ½Ñ•Q¥µ•ÍÑ…µÀ€ô(€€€€€9Õµ‰•È¡É•µ½Ñ•5•ÍÍ…”¹ÕÁ‘…Ñ•‘Ð¤ñð9Õµ‰•È¡É•µ½Ñ•5•ÍÍ…”¹É•…Ñ•‘Ð¤ñð€Àì(€€€¥˜€ …±½…±5•ÍÍ…”ñðÉ•µ½Ñ•Q¥µ•ÍÑ…µÀ€øô±½…±Q¥µ•ÍÑ…µÀ¤ì(€€€€€±½…±	å%¹Í•Ð¡É•µ½Ñ•5•ÍÍ…”¹¥°É•µ½Ñ•5•ÍÍ…”¤ì(€€€ô(€ô¤ì(€‰É…¹ ¹µ•ÍÍ…•Ì€ôl¸¸¹±½…±	å%¹Ù…±Õ•Ì ¥t(€€€€¹™¥±Ñ•È ¡µ•ÍÍ…”¤€ôø€…‘•±•Ñ•‘%‘Ì¹¡…Ì¡µ•ÍÍ…”¹¥¤¤(€€€€¹Í½ÉÐ (€€€€€€¡±•™Ð°É¥¡Ð¤€ôø(€€€€€€€€¡9Õµ‰•È¡±•™Ð¹É•…Ñ•‘Ð¤ñð€À¤€´€¡9Õµ‰•È¡É¥¡Ð¹É•…Ñ•‘Ð¤ñð€À¤°(€€€€¤ì(€½¹ÍÐÉ•Á…¥É•‘EÕ•Õ•‘5•ÍÍ…•Ì€ô±•…É¹ÍÝ•É•‘EÕ•Õ•‘5•ÍÍ…•Ì¡‰É…¹ ¹µ•ÍÍ…•Ì¤ì(€‰É…¹ ¹‘•±•Ñ•‘5•ÍÍ…•%‘Ì€ôl¸¸¹‘•±•Ñ•‘%‘Ít¹Í±¥” ´ÈÀÀ¤ì(€‰É…¹ ¹±½Õ‘	É…¹¡%€ô(€€€‰É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•ä€˜˜‰É…¹ ¹Ñ…Ù•É¹M…Ù•%(€€€€€€üÑ…Ù•É¹|‘íÍÑ…‰±•Q•áÑ!…Í  (€€€€€€€€€€‘í‰É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•åõð‘í‰É…¹ ¹Ñ…Ù•É¹M…Ù•%‘õ€°(€€€€€€€€¥õ€(€€€€€€è±½Õ‘	É…¹¡%ì(€‰É…¹ ¹±½Õ‘I•Ù¥Í¥½¸€ô5…Ñ ¹µ…à¡ÁÉ¥½ÉI•Ù¥Í¥½¸°É•µ½Ñ•I•Ù¥Í¥½¸¤ì(€‰É…¹ ¹Ñ¥Ñ±”€ôÁ…å±½…¹‰É…¹¡Q¥Ñ±”ñð‰É…¹ ¹Ñ¥Ñ±”ì(€‰É…¹ ¹Ñ…Ù•É¹M…Ù•%€ôÁ…å±½…¹Ñ…Ù•É¹M…Ù•%ñð‰É…¹ ¹Ñ…Ù•É¹M…Ù•%ñð€ˆˆì(€‰É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•ä€ô(€€€Á…å±½…¹Ñ…Ù•É¹¡…É…Ñ•É-•äñð‰É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•äñð€ˆˆì(€¥˜€¡=‰©•Ð¹ÁÉ½Ñ½ÑåÁ”¹¡…Í=Ý¹AÉ½Á•ÉÑä¹…±°¡Á…å±½…°€‰Á¡½¹•MÕµµ…Éäˆ¤¤ì(€€€¥˜€ …Á…å±½…¹Á¡½¹•MÕµµ…Éä€˜˜É•µ½Ñ•I•Ù¥Í¥½¸€øôÁÉ¥½ÉI•Ù¥Í¥½¸¤ì(€€€€€‰É…¹ ¹Á¡½¹•MÕµµ…Éä€ô¹Õ±°ì(€€€ô•±Í”¥˜€¡Á…å±½…¹Á¡½¹•MÕµµ…Éä¤ì(€€€€€½¹ÍÐ±½…±MÕµµ…ÉåQ¥µ”€ô9Õµ‰•È¡‰É…¹ ¹Á¡½¹•MÕµµ…Éäü¹ÕÁ‘…Ñ•‘Ð¤ñð€Àì(€€€€€½¹ÍÐÉ•µ½Ñ•MÕµµ…ÉåQ¥µ”€ô9Õµ‰•È¡Á…å±½…¹Á¡½¹•MÕµµ…Éä¹ÕÁ‘…Ñ•‘Ð¤ñð€Àì(€€€€€¥˜€¡É•µ½Ñ•MÕµµ…ÉåQ¥µ”€øô±½…±MÕµµ…ÉåQ¥µ”¤ì(€€€€€€€‰É…¹ ¹Á¡½¹•MÕµµ…Éä€ôÁ…å±½…¹Á¡½¹•MÕµµ…Éäì(€€€€€ô(€€€ô(€ô(€‰É…¹ ¹Ñ…Ù•É¹MÕµµ…Éä€ôÁ…å±½…¹Ñ…Ù•É¹MÕµµ…Éäñð‰É…¹ ¹Ñ…Ù•É¹MÕµµ…Éäì(€‰É…¹ ¹Ñ…Ù•É¹I••¹Ð€ôÁ…å±½…¹Ñ…Ù•É¹I••¹Ðñð‰É…¹ ¹Ñ…Ù•É¹I••¹Ðì(€‰É…¹ ¹ÕÁ‘…Ñ•‘Ð€ô5…Ñ ¹µ…à (€€€9Õµ‰•È¡‰É…¹ ¹ÕÁ‘…Ñ•‘Ð¤ñð€À°(€€€9Õµ‰•È¡Á…å±½…¹ÕÁ‘…Ñ•‘Ð¤ñð…Ñ”¹¹½Ü ¤°(€€¤ì(€¥˜€ …ÍÑ…Ñ”¹…Ñ¥Ù•	É…¹¡%‘Ím¡…É…Ñ•É%‘t¤ì(€€€ÍÑ…Ñ”¹…Ñ¥Ù•	É…¹¡%‘Ím¡…É…Ñ•É%‘t€ô‰É…¹ ¹¥ì(€ô(€ÍÑ…Ñ”¹ÕÉÉ•¹Ñ¡…É…Ñ•É%ñðô¡…É…Ñ•É%ì((€½¹ÍÐÝ¥¹‘½ÝMÑ…ÉÑ•‘Ð€ô(€€€9Õµ‰•È¡Á…å±½…¹Ý¥¹‘½ÝMÑ…ÉÑ•‘Ð¤ñð(€€€9Õµ‰•È¡É•µ½Ñ•5•ÍÍ…•ÍlÁtü¹É•…Ñ•‘Ð¤ñð(€€€9Õµ‰•È¹5a}M}%9QHì(€½¹ÍÐ¡…ÍI••¹Ñ1½…±=¹±ä€ô‰É…¹ ¹µ•ÍÍ…•Ì¹Í½µ” (€€€€¡µ•ÍÍ…”¤€ôø(€€€€€9Õµ‰•È¡µ•ÍÍ…”¹É•…Ñ•‘Ð¤€øôÝ¥¹‘½ÝMÑ…ÉÑ•‘Ð€˜˜(€€€€€€…É•µ½Ñ•%‘Ì¹¡…Ì¡µ•ÍÍ…”¹¥¤€˜˜(€€€€€€…‘•±•Ñ•‘%‘Ì¹¡…Ì¡µ•ÍÍ…”¹¥¤°(€€¤ì(€½¹ÍÐ¡…Í1½…±=¹±å•±•Ñ¥½¸€ôl¸¸¹±½…±•±•Ñ•‘t¹Í½µ” (€€€€¡µ•ÍÍ…•%¤€ôø€…É•µ½Ñ••±•Ñ•¹¡…Ì¡µ•ÍÍ…•%¤°(€€¤ì(€¥˜€ (€€€Í¹…ÁÍ¡½Ð¹Í½ÕÉ•}‘•Ù¥•}¥€„ôôÍå¹MÑ…Ñ”¹‘•Ù¥”¹¥€˜˜(€€€É•µ½Ñ•I•Ù¥Í¥½¸€øôÁÉ¥½ÉI•Ù¥Í¥½¸€˜˜(€€€€¡¡…ÍI••¹Ñ1½…±=¹±äñð¡…Í1½…±=¹±å•±•Ñ¥½¸¤(€€¤ì(€€€ÅÕ•Õ•A¡½¹•¡…ÑMå¹Œ¡¡…É…Ñ•É%°€‰¡…Ð¹½¹Ù•É”ˆ°‰É…¹ ¹¥¤ì(€ô•±Í”¥˜€¡É•Á…¥É•‘EÕ•Õ•‘5•ÍÍ…•Ì¤ì(€€€ÅÕ•Õ•A¡½¹•¡…ÑMå¹Œ¡¡…É…Ñ•É%°€‰µ•ÍÍ…”¹É•Á…¥Èˆ°‰É…¹ ¹¥¤ì(€ô)ô()™Õ¹Ñ¥½¸…ÁÁ±åM¹…ÁÍ¡½Ð¡Í¹…ÁÍ¡½Ð¤ì(€¥˜€ …Í¹…ÁÍ¡½Ð¤É•ÑÕÉ¸ì(€ÕÁÍ•ÉÑM¹…ÁÍ¡½Ñ…¡”¡Í¹…ÁÍ¡½Ð¤ì(€¥˜€¡Í¹…ÁÍ¡½Ð¹¥Í}‘•±•Ñ•¤É•ÑÕÉ¸ì(€¥˜€¡Í¹…ÁÍ¡½Ð¹•¹Ñ¥Ñå}ÑåÁ”¹ÍÑ…ÉÑÍ]¥Ñ  ‰Ñ…Ù•É¸¸ˆ¤¤…ÁÁ±åQ…Ù•É¹M¹…ÁÍ¡½Ð¡Í¹…ÁÍ¡½Ð¤ì(€¥˜€¡Í¹…ÁÍ¡½Ð¹•¹Ñ¥Ñå}ÑåÁ”€ôôô€‰Á¡½¹”¹¡…Ðˆ¤…ÁÁ±åA¡½¹•M¹…ÁÍ¡½Ð¡Í¹…ÁÍ¡½Ð¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸™•Ñ¡M¹…ÁÍ¡½Ð¡•¹Ñ¥ÑåQåÁ”°•¹Ñ¥Ñå%¤ì(€½¹ÍÐì‘…Ñ„°•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”(€€€€¹™É½´ ‰±…Ñ•ÍÑ}Í¹…ÁÍ¡½ÑÌˆ¤(€€€€¹Í•±•Ð¡M9AM!=Q}%1L¤(€€€€¹•Ä ‰•¹Ñ¥Ñå}ÑåÁ”ˆ°•¹Ñ¥ÑåQåÁ”¤(€€€€¹•Ä ‰•¹Ñ¥Ñå}¥ˆ°•¹Ñ¥Ñå%¤(€€€€¹µ…å‰•M¥¹±” ¤ì(€¥˜€¡•ÉÉ½È¤Ñ¡É½Ü•ÉÉ½Èì(€¥˜€¡‘…Ñ„¤…ÁÁ±åM¹…ÁÍ¡½Ð¡‘…Ñ„¤ì(€É•ÑÕÉ¸‘…Ñ„ì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸É•™É•Í¡	É…¹¡5•µ½Éå½É¤¡¡…É…Ñ•É%°‰É…¹¡%€ô€ˆˆ¤ì(€½¹ÍÐ¡…É…Ñ•È€ôÍÑ…Ñ”¹¡…É…Ñ•ÉÌ¹™¥¹ ¡¥Ñ•´¤€ôø¥Ñ•´¹¥€ôôô¡…É…Ñ•É%¤ì(€½¹ÍÐ¥¹¥Ñ¥…±	É…¹ €ô(€€€ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ím‰É…¹¡%‘tñð…Ñ¥Ù•	É…¹¡½É¡…É…Ñ•È¡¡…É…Ñ•É%¤ì(€¥˜€ …¡…É…Ñ•Èñð€…¥¹¥Ñ¥…±	É…¹ ñð€…Íå¹MÑ…Ñ”¹¥¹¥Ñ¥…±¥é•¤É•ÑÕÉ¸¥¹¥Ñ¥…±	É…¹ ì((€…Ý…¥ÐÁÕ±±AÉ½µ¥Í”¹…Ñ   ¤€ôøíô¤ì(€½¹ÍÐÑ…Ù•É¹¡…É…Ñ•É-•ä€ô(€€€¥¹¥Ñ¥…±	É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•äñð(€€€¡…É…Ñ•È¹Ñ…Ù•É¹¡…É…Ñ•É-•äñð(€€€=‰©•Ð¹•¹ÑÉ¥•Ì¡ÍÑ…Ñ”¹Íå¹Œ¹¡…É…Ñ•É	¥¹‘¥¹Ì¤¹™¥¹ (€€€€€€¡l°‰½Õ¹‘¡…É…Ñ•É%‘t¤€ôø‰½Õ¹‘¡…É…Ñ•É%€ôôô¡…É…Ñ•É%°(€€€€¤ü¹lÁtñð(€€€€ˆˆì(€¥˜€ …Ñ…Ù•É¹¡…É…Ñ•É-•ä¤É•ÑÕÉ¸¥¹¥Ñ¥…±	É…¹ ì((€½¹ÍÐ•¹Ñ¥Ñå%€ô¡…É…Ñ•Èè‘íÑ…Ù•É¹¡…É…Ñ•É-•åõ€ì(€ÑÉäì(€€€…Ý…¥Ð™•Ñ¡M¹…ÁÍ¡½Ð ‰Ñ…Ù•É¸¹…Ñ¥Ù”ˆ°•¹Ñ¥Ñå%¤ì(€€€…Ý…¥ÐAÉ½µ¥Í”¹…±°¡l(€€€€€™•Ñ¡M¹…ÁÍ¡½Ð ‰Ñ…Ù•É¸¹ÍÕµµ…Éäˆ°•¹Ñ¥Ñå%¤°(€€€€€™•Ñ¡M¹…ÁÍ¡½Ð ‰Ñ…Ù•É¸¹É••¹Ðˆ°•¹Ñ¥Ñå%¤°(€€€t¤ì(€€€É•ÑÕÉ¸€ (€€€€€¡å‘É…Ñ•Q…Ù•É¹5•µ½Éä¡Ñ…Ù•É¹¡…É…Ñ•É-•ä°¡…É…Ñ•É%¤ñð(€€€€€ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ím‰É…¹¡%‘tñð(€€€€€…Ñ¥Ù•	É…¹¡½É¡…É…Ñ•È¡¡…É…Ñ•É%¤(€€€€¤ì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‰$ƒ–n{–’7–&7–"ßšZÃ¦K¦š¢ºÃ–þ–’Ç¢Ò”ˆì(€€€É•ÑÕÉ¸€ (€€€€€¡å‘É…Ñ•Q…Ù•É¹5•µ½Éä¡Ñ…Ù•É¹¡…É…Ñ•É-•ä°¡…É…Ñ•É%¤ñð(€€€€€ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ím‰É…¹¡%‘tñð(€€€€€…Ñ¥Ù•	É…¹¡½É¡…É…Ñ•È¡¡…É…Ñ•É%¤(€€€€¤ì(€ô)ô()…Íå¹Œ™Õ¹Ñ¥½¸…­¹½Ý±•‘”¡Í•Ä¤ì(€¥˜€ …Í•Äñð€…Íå¹MÑ…Ñ”¹‘•Ù¥”¹¥¤É•ÑÕÉ¸ì(€½¹ÍÐì•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”¹ÉÁŒ ‰…­}Íå¹}ÕÉÍ½Èˆ°ì(€€€Á}‘•Ù¥•}¥èÍå¹MÑ…Ñ”¹‘•Ù¥”¹¥°(€€€Á}±…ÍÑ}…­}Í•ÄèÍ•Ä°(€ô¤ì(€¥˜€¡•ÉÉ½È¤Ñ¡É½Ü•ÉÉ½Èì(€ÍÑ…Ñ”¹Íå¹Œ¹±…ÍÑ­M•Ä€ô5…Ñ ¹µ…à¡9Õµ‰•È¡ÍÑ…Ñ”¹Íå¹Œ¹±…ÍÑ­M•Ä¤ñð€À°9Õµ‰•È¡Í•Ä¤ñð€À¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸ÁÕ±±A•¹‘¥¹Ù•¹ÑÌ ¤ì(€±•ÐÕÉÍ½È€ô5…Ñ ¹µ…à À°9Õµ‰•È¡ÍÑ…Ñ”¹Íå¹Œ¹±…ÍÑ­M•Ä¤ñð€À¤ì(€™½È€ ìì¤ì(€€€½¹ÍÐì‘…Ñ„°•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”(€€€€€€¹™É½´ ‰Íå¹}•Ù•¹ÑÌˆ¤(€€€€€€¹Í•±•Ð (€€€€€€€€‰Í•ÉÙ•É}Í•Ä±•Ù•¹Ñ}¥±Í½ÕÉ•}‘•Ù¥•}¥±•¹Ñ¥Ñå}ÑåÁ”±•¹Ñ¥Ñå}¥±½Á•É…Ñ¥½¸±É•Ù¥Í¥½¸±Á…å±½…±É•…Ñ•‘}…Ðˆ°(€€€€€€¤(€€€€€€¹Ð ‰Í•ÉÙ•É}Í•Äˆ°ÕÉÍ½È¤(€€€€€€¹½É‘•È ‰Í•ÉÙ•É}Í•Äˆ°ì…Í•¹‘¥¹œèÑÉÕ”ô¤(€€€€€€¹±¥µ¥Ð ÈÀÀ¤ì(€€€¥˜€¡•ÉÉ½È¤Ñ¡É½Ü•ÉÉ½Èì(€€€¥˜€ …‘…Ñ„ü¹±•¹Ñ ¤‰É•…¬ì(€€€™½È€¡½¹ÍÐ•Ù•¹Ð½˜‘…Ñ„¤ì(€€€€€¥˜€¡•Ù•¹Ð¹½Á•É…Ñ¥½¸€„ôô€‰‘•±•Ñ”ˆ¤ì(€€€€€€€…Ý…¥Ð™•Ñ¡M¹…ÁÍ¡½Ð¡•Ù•¹Ð¹•¹Ñ¥Ñå}ÑåÁ”°•Ù•¹Ð¹•¹Ñ¥Ñå}¥¤ì(€€€€€ô(€€€€€ÕÉÍ½È€ô9Õµ‰•È¡•Ù•¹Ð¹Í•ÉÙ•É}Í•Ä¤ì(€€€ô(€€€…Ý…¥Ð…­¹½Ý±•‘”¡ÕÉÍ½È¤ì(€€€¥˜€¡‘…Ñ„¹±•¹Ñ €ð€ÈÀÀ¤‰É•…¬ì(€ô(€Íå¹MÑ…Ñ”¹±…ÍÑAÕ±±Ð€ô…Ñ”¹¹½Ü ¤ì)ô()™Õ¹Ñ¥½¸ÅÕ•Õ•AÕ±° ¤ì(€ÁÕ±±AÉ½µ¥Í”€ôÁÕ±±AÉ½µ¥Í”(€€€€¹Ñ¡•¸  ¤€ôøÁÕ±±A•¹‘¥¹Ù•¹ÑÌ ¤¤(€€€€¹…Ñ  ¡•ÉÉ½È¤€ôøì(€€€€€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹–B3š¶—’ê/’îÛ¢¾ï–>[–’Ç¢Ò”ˆì(€€€ô¤ì(€É•ÑÕÉ¸ÁÕ±±AÉ½µ¥Í”ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸±½…‘±½Õ‘MÑ…Ñ” ¤ì(€½¹ÍÐm‘•Ù¥•ÍI•ÍÕ±Ð°Í¹…ÁÍ¡½ÑÍI•ÍÕ±Ð°ÕÍ…•I•ÍÕ±Ñt€ô…Ý…¥ÐAÉ½µ¥Í”¹…±°¡l(€€€ÍÕÁ…‰…Í”¹™É½´ ‰ÕÍ•É}‘•Ù¥•Ìˆ¤¹Í•±•Ð¡Y%}%1L¤¹½É‘•È ‰±…ÍÑ}Í••¹}…Ðˆ°ì(€€€€€…Í•¹‘¥¹œè™…±Í”°(€€€ô¤°(€€€ÍÕÁ…‰…Í”¹™É½´ ‰±…Ñ•ÍÑ}Í¹…ÁÍ¡½ÑÌˆ¤¹Í•±•Ð¡M9AM!=Q}%1L¤°(€€€ÍÕÁ…‰…Í”¹™É½´ ‰ÕÍ•É}Íå¹}ÕÍ…”ˆ¤¹Í•±•Ð ˆ¨ˆ¤¹µ…å‰•M¥¹±” ¤°(€t¤ì(€¥˜€¡‘•Ù¥•ÍI•ÍÕ±Ð¹•ÉÉ½È¤Ñ¡É½Ü‘•Ù¥•ÍI•ÍÕ±Ð¹•ÉÉ½Èì(€¥˜€¡Í¹…ÁÍ¡½ÑÍI•ÍÕ±Ð¹•ÉÉ½È¤Ñ¡É½ÜÍ¹…ÁÍ¡½ÑÍI•ÍÕ±Ð¹•ÉÉ½Èì(€¥˜€¡ÕÍ…•I•ÍÕ±Ð¹•ÉÉ½È¤Ñ¡É½ÜÕÍ…•I•ÍÕ±Ð¹•ÉÉ½Èì(€Íå¹MÑ…Ñ”¹‘•Ù¥•Ì€ô‘•Ù¥•ÍI•ÍÕ±Ð¹‘…Ñ„ñðmtì(€Íå¹MÑ…Ñ”¹Í¹…ÁÍ¡½ÑÌ€ômtì(€É•Ù¥Í¥½¹%¹‘•à¹±•…È ¤ì(€€¡Í¹…ÁÍ¡½ÑÍI•ÍÕ±Ð¹‘…Ñ„ñðmt¤¹™½É… ¡…ÁÁ±åM¹…ÁÍ¡½Ð¤ì(€=‰©•Ð¹­•åÌ¡ÍÑ…Ñ”¹Íå¹Œ¹Ñ…Ù•É¹%¹‰½à¤¹™½É…  ¡Ñ…Ù•É¹¡…É…Ñ•É-•ä¤€ôøì(€€€¡å‘É…Ñ•Q…Ù•É¹5•µ½Éä¡Ñ…Ù•É¹¡…É…Ñ•É-•ä¤ì(€€€ÕÁ‘…Ñ•5¥Íµ…Ñ ¡Ñ…Ù•É¹¡…É…Ñ•É-•ä¤ì(€ô¤ì(€Íå¹MÑ…Ñ”¹ÕÍ…”€ôÕÍ…•I•ÍÕ±Ð¹‘…Ñ„ñð¹Õ±°ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸É•¥ÍÑ•É•Ù¥” ¤ì(€Íå¹MÑ…Ñ”¹‘•Ù¥”€ô•Ñ•Ù¥•%‘•¹Ñ¥Ñä ¤ì(€½¹ÍÐì‘…Ñ„°•ÉÉ½Èô€ô…Ý…¥ÐÍÕÁ…‰…Í”¹ÉÁŒ ‰É•¥ÍÑ•É}Íå¹}‘•Ù¥”ˆ°ì(€€€Á}‘•Ù¥•}¥èÍå¹MÑ…Ñ”¹‘•Ù¥”¹¥°(€€€Á}‘•Ù¥•}¹…µ”èÍå¹MÑ…Ñ”¹‘•Ù¥”¹¹…µ”°(€€€Á}Á±…Ñ™½É´èÍå¹MÑ…Ñ”¹‘•Ù¥”¹Á±…Ñ™½É´°(€€€Á}…ÁÁ}Ù•ÉÍ¥½¸èAA}YIM%=8°(€ô¤ì(€¥˜€¡•ÉÉ½È¤Ñ¡É½Ü•ÉÉ½Èì(€½¹ÍÐÉ•¥ÍÑ•É•€ôÉÉ…ä¹¥ÍÉÉ…ä¡‘…Ñ„¤€ü‘…Ñ…lÁt€è‘…Ñ„ì(€ÍÑ…Ñ”¹Íå¹Œ¹±…ÍÑ­M•Ä€ô5…Ñ ¹µ…à (€€€9Õµ‰•È¡ÍÑ…Ñ”¹Íå¹Œ¹±…ÍÑ­M•Ä¤ñð€À°(€€€9Õµ‰•È¡É•¥ÍÑ•É•ü¹±…ÍÑ}…­}Í•Ä¤ñð€À°(€€€9Õµ‰•È¡É•¥ÍÑ•É•ü¹©½¥¹•‘}Í•Ä¤ñð€À°(€€¤ì(€É•ÑÕÉ¸É•¥ÍÑ•É•ì)ô()™Õ¹Ñ¥½¸ÍÕ‰ÍÉ¥‰•I•…±Ñ¥µ”¡ÕÍ•É%¤ì(€¥˜€¡É•…±Ñ¥µ•¡…¹¹•°¤ÍÕÁ…‰…Í”¹É•µ½Ù•¡…¹¹•°¡É•…±Ñ¥µ•¡…¹¹•°¤ì(€É•…±Ñ¥µ•¡…¹¹•°€ôÍÕÁ…‰…Í”(€€€€¹¡…¹¹•°¡±¥¹•Á¡½¹”µÍå¹Œ´‘íÍå¹MÑ…Ñ”¹‘•Ù¥”¹¥‘õ€¤(€€€€¹½¸ (€€€€€€‰Á½ÍÑÉ•Í}¡…¹•Ìˆ°(€€€€€ì(€€€€€€€•Ù•¹Ðè€‰%9MIPˆ°(€€€€€€€Í¡•µ„è€‰ÁÕ‰±¥Œˆ°(€€€€€€€Ñ…‰±”è€‰Íå¹}•Ù•¹ÑÌˆ°(€€€€€€€™¥±Ñ•ÈèÕÍ•É}¥õ•Ä¸‘íÕÍ•É%‘õ€°(€€€€€ô°(€€€€€€ ¤€ôøÅÕ•Õ•AÕ±° ¤°(€€€€¤(€€€€¹ÍÕ‰ÍÉ¥‰” ¡ÍÑ…ÑÕÌ¤€ôøì(€€€€€Íå¹MÑ…Ñ”¹½¹¹•Ñ•€ôÍÑ…ÑÕÌ€ôôô€‰MU	MI%	ˆì(€€€ô¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸™±ÕÍ¡¥ÉÑå	É…¹¡•Ì ¤ì(€½¹ÍÐ±…Ñ•ÍÑ¥ÉÑå	å¡…É…Ñ•È€ô¹•Ü5…À ¤ì(€=‰©•Ð¹Ù…±Õ•Ì¡ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ì¤(€€€€¹™¥±Ñ•È ¡‰É…¹ ¤€ôø‰É…¹ ¹±½…±¥ÉÑåÐ¤(€€€€¹™½É…  ¡‰É…¹ ¤€ôøì(€€€€€½¹ÍÐÁÉ¥½È€ô±…Ñ•ÍÑ¥ÉÑå	å¡…É…Ñ•È¹•Ð¡‰É…¹ ¹¡…É…Ñ•É%¤ì(€€€€€¥˜€ …ÁÉ¥½Èñð‰É…¹ ¹±½…±¥ÉÑåÐ€øÁÉ¥½È¹±½…±¥ÉÑåÐ¤ì(€€€€€€€±…Ñ•ÍÑ¥ÉÑå	å¡…É…Ñ•È¹Í•Ð¡‰É…¹ ¹¡…É…Ñ•É%°‰É…¹ ¤ì(€€€€€ô(€€€ô¤ì(€™½È€¡½¹ÍÐ‰É…¹ ½˜±…Ñ•ÍÑ¥ÉÑå	å¡…É…Ñ•È¹Ù…±Õ•Ì ¤¤ì(€€€…Ý…¥ÐÍå¹A¡½¹•¡…Ñ9½Ü¡‰É…¹ ¹¡…É…Ñ•É%°€‰½™™±¥¹”¹™±ÕÍ ˆ°‰É…¹ ¹¥¤ì(€ô)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸¥¹¥Ñ¥…±¥é•Må¹Œ¡ÕÍ•É%¤ì(€¥˜€ …ÕÍ•É%ñð€¡Íå¹MÑ…Ñ”¹¥¹¥Ñ¥…±¥é•€˜˜Íå¹MÑ…Ñ”¹ÕÍ•É%€ôôôÕÍ•É%¤¤É•ÑÕÉ¸ì(€Íå¹MÑ…Ñ”¹‰ÕÍä€ôÑÉÕ”ì(€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô€ˆˆì(€Íå¹MÑ…Ñ”¹ÕÍ•É%€ôÕÍ•É%ì(€ÑÉäì(€€€…Ý…¥ÐÉ•¥ÍÑ•É•Ù¥” ¤ì(€€€…Ý…¥Ð±½…‘±½Õ‘MÑ…Ñ” ¤ì(€€€ÍÕ‰ÍÉ¥‰•I•…±Ñ¥µ”¡ÕÍ•É%¤ì(€€€…Ý…¥ÐÅÕ•Õ•AÕ±° ¤ì(€€€Íå¹MÑ…Ñ”¹¥¹¥Ñ¥…±¥é•€ôÑÉÕ”ì(€€€…Ý…¥Ð™±ÕÍ¡¥ÉÑå	É…¹¡•Ì ¤ì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹–B3š¶—–"w–ž/–2[–’Ç¢Ò”ˆì(€ô™¥¹…±±äì(€€€Íå¹MÑ…Ñ”¹‰ÕÍä€ô™…±Í”ì(€ô)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸ÍÑ½ÁMå¹Œ ¤ì(€¥˜€¡É•…±Ñ¥µ•¡…¹¹•°¤ÍÕÁ…‰…Í”¹É•µ½Ù•¡…¹¹•°¡É•…±Ñ¥µ•¡…¹¹•°¤ì(€É•…±Ñ¥µ•¡…¹¹•°€ô¹Õ±°ì(€ÝÉ¥Ñ•Q¥µ•ÉÌ¹™½É…  ¡Ñ¥µ•È¤€ôø±•…ÉQ¥µ•½ÕÐ¡Ñ¥µ•È¤¤ì(€ÝÉ¥Ñ•Q¥µ•ÉÌ¹±•…È ¤ì(€Íå¹MÑ…Ñ”¹¥¹¥Ñ¥…±¥é•€ô™…±Í”ì(€Íå¹MÑ…Ñ”¹½¹¹•Ñ•€ô™…±Í”ì(€Íå¹MÑ…Ñ”¹ÕÍ•É%€ô€ˆˆì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸É•™É•Í¡Må¹…Ñ„ ¤ì(€¥˜€ …Íå¹MÑ…Ñ”¹ÕÍ•É%¤É•ÑÕÉ¸ì(€Íå¹MÑ…Ñ”¹‰ÕÍä€ôÑÉÕ”ì(€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô€ˆˆì(€ÑÉäì(€€€…Ý…¥ÐÉ•¥ÍÑ•É•Ù¥” ¤ì(€€€…Ý…¥Ð±½…‘±½Õ‘MÑ…Ñ” ¤ì(€€€…Ý…¥ÐÅÕ•Õ•AÕ±° ¤ì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹–B3š¶—–"ßšZÃ–’Ç¢Ò”ˆì(€ô™¥¹…±±äì(€€€Íå¹MÑ…Ñ”¹‰ÕÍä€ô™…±Í”ì(€ô)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸ÕÁ‘…Ñ••Ù¥•9…µ”¡¹…µ”¤ì(€Íå¹MÑ…Ñ”¹‘•Ù¥”€ôÉ•¹…µ•1½…±•Ù¥”¡¹…µ”¤ì(€…Ý…¥ÐÉ•¥ÍÑ•É•Ù¥” ¤ì(€…Ý…¥Ð±½…‘±½Õ‘MÑ…Ñ” ¤ì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸½µµ¥ÑMå¹M¹…ÁÍ¡½Ð¡ì(€•¹Ñ¥ÑåQåÁ”°(€•¹Ñ¥Ñå%°(€Í¹…ÁÍ¡½ÑA…å±½…°(€•Ù•¹ÑA…å±½…€ô¹Õ±°°)ô¤ì(€¥˜€ …Íå¹MÑ…Ñ”¹¥¹¥Ñ¥…±¥é•ñð€…Íå¹MÑ…Ñ”¹‘•Ù¥”¹¥¤É•ÑÕÉ¸¹Õ±°ì(€½¹ÍÐ­•ä€ô•¹Ñ¥Ñå-•ä¡•¹Ñ¥ÑåQåÁ”°•¹Ñ¥Ñå%¤ì(€±•ÐÉ•Ù¥Í¥½¸€ô€¡É•Ù¥Í¥½¹%¹‘•à¹•Ð¡­•ä¤ñð€À¤€¬€Äì(€½¹ÍÐ•Ù•¹Ñ%€ôÉåÁÑ¼¹É…¹‘½µUU% ¤ì(€½¹ÍÐÉ•ÅÕ•ÍÐ€ô€ ¤€ôø(€€€ÍÕÁ…‰…Í”¹ÉÁŒ ‰½µµ¥Ñ}Íå¹}¡…¹”ˆ°ì(€€€€€Á}•Ù•¹Ñ}¥è•Ù•¹Ñ%°(€€€€€Á}Í½ÕÉ•}‘•Ù¥•}¥èÍå¹MÑ…Ñ”¹‘•Ù¥”¹¥°(€€€€€Á}•¹Ñ¥Ñå}ÑåÁ”è•¹Ñ¥ÑåQåÁ”°(€€€€€Á}•¹Ñ¥Ñå}¥è•¹Ñ¥Ñå%°(€€€€€Á}É•Ù¥Í¥½¸èÉ•Ù¥Í¥½¸°(€€€€€Á}½Á•É…Ñ¥½¸è€‰ÕÁÍ•ÉÐˆ°(€€€€€Á}Í¹…ÁÍ¡½Ñ}Á…å±½…èÍ¹…ÁÍ¡½ÑA…å±½…°(€€€€€Á}•Ù•¹Ñ}Á…å±½…è•Ù•¹ÑA…å±½…ñðÍ¹…ÁÍ¡½ÑA…å±½…°(€€€ô¤ì((€Íå¹MÑ…Ñ”¹Á•¹‘¥¹]É¥Ñ•Ì€¬ô€Äì(€ÑÉäì(€€€±•ÐÉ•ÍÕ±Ð€ô…Ý…¥ÐÉ•ÅÕ•ÍÐ ¤ì(€€€¥˜€ (€€€€€É•ÍÕ±Ð¹•ÉÉ½È€˜˜(€€€€€MÑÉ¥¹œ¡É•ÍÕ±Ð¹•ÉÉ½È¹µ•ÍÍ…”ñð€ˆˆ¤¹¥¹±Õ‘•Ì ‰ÍÑ…±•}Í¹…ÁÍ¡½Ñ}É•Ù¥Í¥½¸ˆ¤(€€€€¤ì(€€€€€½¹ÍÐÕÉÉ•¹Ð€ô…Ý…¥Ð™•Ñ¡M¹…ÁÍ¡½Ð¡•¹Ñ¥ÑåQåÁ”°•¹Ñ¥Ñå%¤ì(€€€€€É•Ù¥Í¥½¸€ô€¡9Õµ‰•È¡ÕÉÉ•¹Ðü¹É•Ù¥Í¥½¸¤ñð€À¤€¬€Äì(€€€€€É•ÍÕ±Ð€ô…Ý…¥ÐÉ•ÅÕ•ÍÐ ¤ì(€€€ô(€€€¥˜€¡É•ÍÕ±Ð¹•ÉÉ½È¤Ñ¡É½ÜÉ•ÍÕ±Ð¹•ÉÉ½Èì(€€€É•Ù¥Í¥½¹%¹‘•à¹Í•Ð¡­•ä°É•Ù¥Í¥½¸¤ì(€€€É•ÑÕÉ¸ìÍ•ÉÙ•ÉM•Äè9Õµ‰•È¡É•ÍÕ±Ð¹‘…Ñ„¤ñð€À°É•Ù¥Í¥½¸ôì(€ô™¥¹…±±äì(€€€Íå¹MÑ…Ñ”¹Á•¹‘¥¹]É¥Ñ•Ì€ô5…Ñ ¹µ…à À°Íå¹MÑ…Ñ”¹Á•¹‘¥¹]É¥Ñ•Ì€´€Ä¤ì(€ô)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸Íå¹A¡½¹•¡…Ñ9½Ü (€¡…É…Ñ•É%°(€­¥¹€ô€‰¡…Ð¹ÕÁ‘…Ñ”ˆ°(€‰É…¹¡%€ô€ˆˆ°(¤ì(€½¹ÍÐ¡…É…Ñ•È€ôÍÑ…Ñ”¹¡…É…Ñ•ÉÌ¹™¥¹ ¡¥Ñ•´¤€ôø¥Ñ•´¹¥€ôôô¡…É…Ñ•É%¤ì(€½¹ÍÐ‰É…¹ €ô(€€€ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ím‰É…¹¡%‘tñð…Ñ¥Ù•	É…¹¡½É¡…É…Ñ•È¡¡…É…Ñ•É%¤ì(€¥˜€ …¡…É…Ñ•Èñð€…‰É…¹ ñð€…Íå¹MÑ…Ñ”¹¥¹¥Ñ¥…±¥é•¤É•ÑÕÉ¸¹Õ±°ì(€½¹ÍÐ¡…É…Ñ•ÉMå¹-•ä€ô±½Õ‘¡…É…Ñ•É-•ä¡¡…É…Ñ•È¤ì(€‰É…¹ ¹±½Õ‘	É…¹¡%ñðô(€€€‰É…¹ ¹Ñ…Ù•É¹M…Ù•%(€€€€€€üÑ…Ù•É¹|‘íÍÑ…‰±•Q•áÑ!…Í  (€€€€€€€€€€‘í‰É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•åõð‘í‰É…¹ ¹Ñ…Ù•É¹M…Ù•%‘õ€°(€€€€€€€€¥õ€(€€€€€€è€‰µ…¥¸ˆì(€½¹ÍÐµ•ÍÍ…•Ì€ô½µÁ…Ñ5•ÍÍ…•Ì¡‰É…¹ ¹µ•ÍÍ…•Ì°‰É…¹ ¹Á¡½¹•MÕµµ…Éä¤ì(€½¹ÍÐ‘¥ÉÑåÑMÑ…ÉÐ€ô9Õµ‰•È¡‰É…¹ ¹±½…±¥ÉÑåÐ¤ñð…Ñ”¹¹½Ü ¤ì(€½¹ÍÐÁ…å±½…€ôì(€€€Í¡•µ…Y•ÉÍ¥½¸è€È°(€€€¡…É…Ñ•ÉMå¹-•ä°(€€€¡…É…Ñ•É%°(€€€¡…É…Ñ•É9…µ”è¡…É…Ñ•È¹¹…µ”°(€€€¡…É…Ñ•É…Éè¡…É…Ñ•É…É‘A…å±½…¡¡…É…Ñ•È¤°(€€€¡…É…Ñ•ÉUÁ‘…Ñ•‘Ðè(€€€€€9Õµ‰•È¡¡…É…Ñ•È¹ÕÁ‘…Ñ•‘Ð¤ñð9Õµ‰•È¡¡…É…Ñ•È¹¥µÁ½ÉÑ•‘Ð¤ñð…Ñ”¹¹½Ü ¤°(€€€‰É…¹¡%è‰É…¹ ¹¥°(€€€±½Õ‘	É…¹¡%è‰É…¹ ¹±½Õ‘	É…¹¡%°(€€€‰É…¹¡Q¥Ñ±”è‰É…¹ ¹Ñ¥Ñ±”°(€€€½É¥¥¸è‰É…¹ ¹½É¥¥¸°(€€€Ñ…Ù•É¹M…Ù•%è‰É…¹ ¹Ñ…Ù•É¹M…Ù•%ñð€ˆˆ°(€€€Ñ…Ù•É¹¡…É…Ñ•É-•äè‰É…¹ ¹Ñ…Ù•É¹¡…É…Ñ•É-•äñð€ˆˆ°(€€€µ•ÍÍ…•Ì°(€€€Ý¥¹‘½ÝMÑ…ÉÑ•‘Ðè9Õµ‰•È¡µ•ÍÍ…•ÍlÁtü¹É•…Ñ•‘Ð¤ñð€À°(€€€‘•±•Ñ•‘5•ÍÍ…•%‘Ìè€¡‰É…¹ ¹‘•±•Ñ•‘5•ÍÍ…•%‘Ìñðmt¤¹Í±¥” ´ÈÀÀ¤°(€€€Á¡½¹•MÕµµ…Éäè‰É…¹ ¹Á¡½¹•MÕµµ…Éäñð¹Õ±°°(€€€É•…Ñ•‘Ðè‰É…¹ ¹É•…Ñ•‘Ð°(€€€ÕÁ‘…Ñ•‘Ðè…Ñ”¹¹½Ü ¤°(€ôì(€½¹ÍÐÉ•ÍÕ±Ð€ô…Ý…¥Ð½µµ¥ÑMå¹M¹…ÁÍ¡½Ð¡ì(€€€•¹Ñ¥ÑåQåÁ”è€‰Á¡½¹”¹¡…Ðˆ°(€€€•¹Ñ¥Ñå%è¡…É…Ñ•Èè‘í¡…É…Ñ•ÉMå¹-•åõ€°(€€€Í¹…ÁÍ¡½ÑA…å±½…èÁ…å±½…°(€€€•Ù•¹ÑA…å±½…èì(€€€€€­¥¹°(€€€€€¡…É…Ñ•ÉMå¹-•ä°(€€€€€±½Õ‘	É…¹¡%è‰É…¹ ¹±½Õ‘	É…¹¡%°(€€€€€ÕÁ‘…Ñ•‘ÐèÁ…å±½…¹ÕÁ‘…Ñ•‘Ð°(€€€ô°(€ô¤ì(€¥˜€¡É•ÍÕ±Ð¤ì(€€€‰É…¹ ¹±½Õ‘I•Ù¥Í¥½¸€ôÉ•ÍÕ±Ð¹É•Ù¥Í¥½¸ì(€€€¥˜€ ¡9Õµ‰•È¡‰É…¹ ¹±½…±¥ÉÑåÐ¤ñð€À¤€ðô‘¥ÉÑåÑMÑ…ÉÐ¤ì(€€€€€‰É…¹ ¹±½…±¥ÉÑåÐ€ô€Àì(€€€ô(€ô(€É•ÑÕÉ¸É•ÍÕ±Ðì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸ÅÕ•Õ•A¡½¹•¡…ÑMå¹Œ (€¡…É…Ñ•É%°(€­¥¹€ô€‰¡…Ð¹ÕÁ‘…Ñ”ˆ°(€‰É…¹¡%€ô€ˆˆ°(¤ì(€½¹ÍÐ‰É…¹ €ô(€€€ÍÑ…Ñ”¹¡…Ñ	É…¹¡•Ím‰É…¹¡%‘tñð…Ñ¥Ù•	É…¹¡½É¡…É…Ñ•È¡¡…É…Ñ•É%¤ì(€¥˜€ …‰É…¹ ¤É•ÑÕÉ¸ì(€‰É…¹ ¹ÕÁ‘…Ñ•‘Ð€ô…Ñ”¹¹½Ü ¤ì(€‰É…¹ ¹±½…±¥ÉÑåÐ€ô…Ñ”¹¹½Ü ¤ì(€½¹ÍÐÑ¥µ•É-•ä€ô‰É…¹ ¹¥ì(€±•…ÉQ¥µ•½ÕÐ¡ÝÉ¥Ñ•Q¥µ•ÉÌ¹•Ð¡Ñ¥µ•É-•ä¤¤ì(€ÝÉ¥Ñ•Q¥µ•ÉÌ¹Í•Ð (€€€Ñ¥µ•É-•ä°(€€€Í•ÑQ¥µ•½ÕÐ  ¤€ôøì(€€€€€ÝÉ¥Ñ•Q¥µ•ÉÌ¹‘•±•Ñ”¡Ñ¥µ•É-•ä¤ì(€€€€€Íå¹A¡½¹•¡…Ñ9½Ü¡¡…É…Ñ•É%°­¥¹°‰É…¹ ¹¥¤¹…Ñ  ¡•ÉÉ½È¤€ôøì(€€€€€€€Íå¹MÑ…Ñ”¹•ÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹¢+–’§’â+’òƒ–’Ç¢Ò”ˆì(€€€€€ô¤ì(€€€ô°€ÜÀÀ¤°(€€¤ì)ô