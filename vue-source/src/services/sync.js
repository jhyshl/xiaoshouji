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
  const characterName = card.name || payload.characterName || "同步角色";
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
      name: card.name || payload.characterName || "未命名酒馆角色",
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
      name: remoteBook.name || "酒馆世界书",
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
    remoteSaveName: remote.saveName || "酒馆存档",
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
  branch.updatedAt = Date.now();
  return branch;
}

function applyTavernSnapshot(snapshot) {
  const payload = snapshot.payload || {};
  const tavernCharacterKey =
    payload.tavernCharacterKey || payload.characterKey || payload.characterId;
  if (!tavernCharacterKey) return;
  const inbox = (state.sync.tavernInbox[tavernCharacterKey] ||= {
    characterName: payload.characterName || "",
  });
  if (payload.characterName) inbox.characterName = payload.characterName;
  inbox.revision = Math.max(Number(inbox.revision) || 0, Number(snapshot.revision) || 0);
  inbox.updatedAt = snapshot.updated_at || new Date().toISOString();
  if (snapshot.entity_type === "tavern.active") inbox.active = payload;
  if (snapshot.entity_type === "tavern.summary") inbox.summary = payload;
  if (snapshot.entity_type === "tavern.recent") inbox.recent = payload;
  if (snapshot.entity_type === "tavern.character") {
    inbox.character = payload;
    ensureTavernCharacter(payload);
  }
  if (snapshot.entity_type === "tavern.lorebooks") inbox.lorebooks = payload;
  if (snapshot.entity_type === "tavern.lorebook.part") {
    inbox.lorebookParts ||= {};
    inbox.lorebookParts[snapshot.entity_id] = payload;
  }

  const characterId =
    state.sync.characterBindings[tavernCharacterKey] ||
    autoBindCharacter(tavernCharacterKey, payload.characterName || inbox.characterName);
  if (characterId) hydrateTavernMemory(tavernCharacterKey, characterId);
  if (
    snapshot.entity_type === "tavern.character" ||
    snapshot.entity_type === "tavern.lorebooks" ||
    snapshot.entity_type === "tavern.lorebook.part"
  ) {
    rebuildTavernLorebooks(tavernCharacterKey);
  }
  updateMismatch(tavernCharacterKey);
}

function applyPhoneSnapshot(snapshot) {
  const payload = snapshot.payload || {};
  const character = ensurePhoneCharacter(snapshot);
  if (!character) return;
  const characterId = character.id;
  const legacyMainBranch = /_main$/i.test(String(payload.branchId || ""));
  const cloudBranchId =
    payload.cloudBranchId ||
    (legacyMainBranch ? "main" : payload.branchId) ||
    "main";
  let branch = branchesForCharacter(characterId).find(
    (item) => item.cloudBranchId === cloudBranchId,
  );
  if (!branch && !payload.tavernCharacterKey && !payload.tavernSaveId) {
    const knownTavernKey =
      character.tavernCharacterKey ||
      Object.entries(state.sync.characterBindings).find(
        ([, boundCharacterId]) => boundCharacterId === characterId,
      )?.[0] ||
      "";
    const activeSaveId =
      state.sync.tavernInbox[knownTavernKey]?.active?.saveId || "";
    branch = branchesForCharacter(characterId).find(
      (item) =>
        item.tavernCharacterKey === knownTavernKey &&
        item.tavernSaveId === activeSaveId,
    );
  }
  if (!branch) {
    branch = {
      id: createId("branch"),
      characterId,
      title: payload.branchTitle || "同步聊天",
      origin: payload.origin || "phone",
      tavernSaveId: payload.tavernSaveId || "",
      tavernCharacterKey: payload.tavernCharacterKey || "",
      cloudBranchId,
      messages: [],
      deletedMessageIds: [],
      phoneSummary: payload.phoneSummary || null,
      tavernSummary: payload.tavernSummary || null,
      tavernRecent: payload.tavernRecent || null,
      cloudRevision: 0,
      createdAt: Number(payload.createdAt) || Date.now(),
      updatedAt: Date.now(),
    };
    state.chatBranches[branch.id] = branch;
  }

  const priorRevision = Number(branch.cloudRevision) || 0;
  const remoteRevision = Number(snapshot.revision) || 0;
  const remoteMessages = (Array.isArray(payload.messages) ? payload.messages : [])
    .filter((message) => message?.id && message?.content)
    .map(compactMessage);
  const remoteIds = new Set(remoteMessages.map((message) => message.id));
  const remoteDeleted = new Set(
    Array.isArray(payload.deletedMessageIds)
      ? payload.deletedMessageIds.map(String)
      : [],
  );
  const localDeleted = new Set(
    Array.isArray(branch.deletedMessageIds)
      ? branch.deletedMessageIds.map(String)
      : [],
  );
  const deletedIds = new Set([...localDeleted, ...remoteDeleted]);
  const localById = new Map(
    (branch.messages || []).map((message) => [message.id, message]),
  );

  remoteMessages.forEach((remoteMessage) => {
    const localMessage = localById.get(remoteMessage.id);
    const localTimestamp =
      Number(localMessage?.updatedAt) || Number(localMessage?.createdAt) || 0;
    const remoteTimestamp =
      Number(remoteMessage.updatedAt) || Number(remoteMessage.createdAt) || 0;
    if (!localMessage || remoteTimestamp >= localTimestamp) {
      localById.set(remoteMessage.id, remoteMessage);
    }
  });
  branch.messages = [...localById.values()]
    .filter((message) => !deletedIds.has(message.id))
    .sort(
      (left, right) =>
        (Number(left.createdAt) || 0) - (Number(right.createdAt) || 0),
    );
  const repairedQueuedMessages = clearAnsweredQueuedMessages(branch.messages);
  branch.deletedMessageIds = [...deletedIds].slice(-200);
  branch.cloudBranchId =
    branch.tavernCharacterKey && branch.tavernSaveId
      ? `tavern_${stableTextHash(
          `${branch.tavernCharacterKey}|${branch.tavernSaveId}`,
        )}`
      : cloudBranchId;
  branch.cloudRevision = Math.max(priorRevision, remoteRevision);
  branch.title = payload.branchTitle || branch.title;
  branch.tavernSaveId = payload.tavernSaveId || branch.tavernSaveId || "";
  branch.tavernCharacterKey =
    payload.tavernCharacterKey || branch.tavernCharacterKey || "";
  if (Object.prototype.hasOwnProperty.call(payload, "phoneSummary")) {
    if (!payload.phoneSummary && remoteRevision >= priorRevision) {
      branch.phoneSummary = null;
    } else if (payload.phoneSummary) {
      const localSummaryTime = Number(branch.phoneSummary?.updatedAt) || 0;
      const remoteSummaryTime = Number(payload.phoneSummary.updatedAt) || 0;
      if (remoteSummaryTime >= localSummaryTime) {
        branch.phoneSummary = payload.phoneSummary;
      }
    }
  }
  branch.tavernSummary = payload.tavernSummary || branch.tavernSummary;
  branch.tavernRecent = payload.tavernRecent || branch.tavernRecent;
  branch.updatedAt = Math.max(
    Number(branch.updatedAt) || 0,
    Number(payload.updatedAt) || Date.now(),
  );
  if (!state.activeBranchIds[characterId]) {
    state.activeBranchIds[characterId] = branch.id;
  }
  state.currentCharacterId ||= characterId;

  const windowStartedAt =
    Number(payload.windowStartedAt) ||
    Number(remoteMessages[0]?.createdAt) ||
    Number.MAX_SAFE_INTEGER;
  const hasRecentLocalOnly = branch.messages.some(
    (message) =>
      Number(message.createdAt) >= windowStartedAt &&
      !remoteIds.has(message.id) &&
      !deletedIds.has(message.id),
  );
  const hasLocalOnlyDeletion = [...localDeleted].some(
    (messageId) => !remoteDeleted.has(messageId),
  );
  if (
    snapshot.source_device_id !== syncState.device.id &&
    remoteRevision >= priorRevision &&
    (hasRecentLocalOnly || hasLocalOnlyDeletion)
  ) {
    queuePhoneChatSync(characterId, "chat.converge", branch.id);
  } else if (repairedQueuedMessages) {
    queuePhoneChatSync(characterId, "message.repair", branch.id);
  }
}

function applySnapshot(snapshot) {
  if (!snapshot) return;
  upsertSnapshotCache(snapshot);
  if (snapshot.is_deleted) return;
  if (snapshot.entity_type.startsWith("tavern.")) applyTavernSnapshot(snapshot);
  if (snapshot.entity_type === "phone.chat") applyPhoneSnapshot(snapshot);
}

async function fetchSnapshot(entityType, entityId) {
  const { data, error } = await supabase
    .from("latest_snapshots")
    .select(SNAPSHOT_FIELDS)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  if (error) throw error;
  if (data) applySnapshot(data);
  return data;
}

export async function refreshBranchMemoryForAi(characterId, branchId = "") {
  const character = state.characters.find((item) => item.id === characterId);
  const initialBranch =
    state.chatBranches[branchId] || activeBranchForCharacter(characterId);
  if (!character || !initialBranch || !syncState.initialized) return initialBranch;

  await pullPromise.catch(() => {});
  const tavernCharacterKey =
    initialBranch.tavernCharacterKey ||
    character.tavernCharacterKey ||
    Object.entries(state.sync.characterBindings).find(
      ([, boundCharacterId]) => boundCharacterId === characterId,
    )?.[0] ||
    "";
  if (!tavernCharacterKey) return initialBranch;

  const entityId = `character:${tavernCharacterKey}`;
  try {
    await fetchSnapshot("tavern.active", entityId);
    await Promise.all([
      fetchSnapshot("tavern.summary", entityId),
      fetchSnapshot("tavern.recent", entityId),
    ]);
    return (
      hydrateTavernMemory(tavernCharacterKey, characterId) ||
      state.chatBranches[branchId] ||
      activeBranchForCharacter(characterId)
    );
  } catch (error) {
    syncState.error = error.message || "AI 回复前刷新酒馆记忆失败";
    return (
      hydrateTavernMemory(tavernCharacterKey, characterId) ||
      state.chatBranches[branchId] ||
      activeBranchForCharacter(characterId)
    );
  }
}

async function acknowledge(seq) {
  if (!seq || !syncState.device.id) return;
  const { error } = await supabase.rpc("ack_sync_cursor", {
    p_device_id: syncState.device.id,
    p_last_ack_seq: seq,
  });
  if (error) throw error;
  state.sync.lastAckSeq = Math.max(Number(state.sync.lastAckSeq) || 0, Number(seq) || 0);
}

async function pullPendingEvents() {
  let cursor = Math.max(0, Number(state.sync.lastAckSeq) || 0);
  for (;;) {
    const { data, error } = await supabase
      .from("sync_events")
      .select(
        "server_seq,event_id,source_device_id,entity_type,entity_id,operation,revision,payload,created_at",
      )
      .gt("server_seq", cursor)
      .order("server_seq", { ascending: true })
      .limit(200);
    if (error) throw error;
    if (!data?.length) break;
    for (const event of data) {
      if (event.operation !== "delete") {
        await fetchSnapshot(event.entity_type, event.entity_id);
      }
      cursor = Number(event.server_seq);
    }
    await acknowledge(cursor);
    if (data.length < 200) break;
  }
  syncState.lastPullAt = Date.now();
}

function queuePull() {
  pullPromise = pullPromise
    .then(() => pullPendingEvents())
    .catch((error) => {
      syncState.error = error.message || "同步事件读取失败";
    });
  return pullPromise;
}

async function loadCloudState() {
  const [devicesResult, snapshotsResult, usageResult] = await Promise.all([
    supabase.from("user_devices").select(DEVICE_FIELDS).order("last_seen_at", {
      ascending: false,
    }),
    supabase.from("latest_snapshots").select(SNAPSHOT_FIELDS),
    supabase.from("user_sync_usage").select("*").maybeSingle(),
  ]);
  if (devicesResult.error) throw devicesResult.error;
  if (snapshotsResult.error) throw snapshotsResult.error;
  if (usageResult.error) throw usageResult.error;
  syncState.devices = devicesResult.data || [];
  syncState.snapshots = [];
  revisionIndex.clear();
  (snapshotsResult.data || []).forEach(applySnapshot);
  Object.keys(state.sync.tavernInbox).forEach((tavernCharacterKey) => {
    hydrateTavernMemory(tavernCharacterKey);
    updateMismatch(tavernCharacterKey);
  });
  syncState.usage = usageResult.data || null;
}

async function registerDevice() {
  syncState.device = getDeviceIdentity();
  const { data, error } = await supabase.rpc("register_sync_device", {
    p_device_id: syncState.device.id,
    p_device_name: syncState.device.name,
    p_platform: syncState.device.platform,
    p_app_version: APP_VERSION,
  });
  if (error) throw error;
  const registered = Array.isArray(data) ? data[0] : data;
  state.sync.lastAckSeq = Math.max(
    Number(state.sync.lastAckSeq) || 0,
    Number(registered?.last_ack_seq) || 0,
    Number(registered?.joined_seq) || 0,
  );
  return registered;
}

function subscribeRealtime(userId) {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`linephone-sync-${syncState.device.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sync_events",
        filter: `user_id=eq.${userId}`,
      },
      () => queuePull(),
    )
    .subscribe((status) => {
      syncState.connected = status === "SUBSCRIBED";
    });
}

async function flushDirtyBranches() {
  const latestDirtyByCharacter = new Map();
  Object.values(state.chatBranches)
    .filter((branch) => branch.localDirtyAt)
    .forEach((branch) => {
      const prior = latestDirtyByCharacter.get(branch.characterId);
      if (!prior || branch.localDirtyAt > prior.localDirtyAt) {
        latestDirtyByCharacter.set(branch.characterId, branch);
      }
    });
  for (const branch of latestDirtyByCharacter.values()) {
    await syncPhoneChatNow(branch.characterId, "offline.flush", branch.id);
  }
}

export async function initializeSync(userId) {
  if (!userId || (syncState.initialized && syncState.userId === userId)) return;
  syncState.busy = true;
  syncState.error = "";
  syncState.userId = userId;
  try {
    await registerDevice();
    await loadCloudState();
    subscribeRealtime(userId);
    await queuePull();
    syncState.initialized = true;
    await flushDirtyBranches();
  } catch (error) {
    syncState.error = error.message || "同步初始化失败";
  } finally {
    syncState.busy = false;
  }
}

export function stopSync() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = null;
  writeTimers.forEach((timer) => clearTimeout(timer));
  writeTimers.clear();
  syncState.initialized = false;
  syncState.connected = false;
  syncState.userId = "";
}

export async function refreshSyncData() {
  if (!syncState.userId) return;
  syncState.busy = true;
  syncState.error = "";
  try {
    await registerDevice();
    await loadCloudState();
    await queuePull();
  } catch (error) {
    syncState.error = error.message || "同步刷新失败";
  } finally {
    syncState.busy = false;
  }
}

export async function updateDeviceName(name) {
  syncState.device = renameLocalDevice(name);
  await registerDevice();
  await loadCloudState();
}

export async function commitSyncSnapshot({
  entityType,
  entityId,
  snapshotPayload,
  eventPayload = null,
}) {
  if (!syncState.initialized || !syncState.device.id) return null;
  const key = entityKey(entityType, entityId);
  let revision = (revisionIndex.get(key) || 0) + 1;
  const eventId = crypto.randomUUID();
  const request = () =>
    supabase.rpc("commit_sync_change", {
      p_event_id: eventId,
      p_source_device_id: syncState.device.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_revision: revision,
      p_operation: "upsert",
      p_snapshot_payload: snapshotPayload,
      p_event_payload: eventPayload || snapshotPayload,
    });

  syncState.pendingWrites += 1;
  try {
    let result = await request();
    if (
      result.error &&
      String(result.error.message || "").includes("stale_snapshot_revision")
    ) {
      const current = await fetchSnapshot(entityType, entityId);
      revision = (Number(current?.revision) || 0) + 1;
      result = await request();
    }
    if (result.error) throw result.error;
    revisionIndex.set(key, revision);
    return { serverSeq: Number(result.data) || 0, revision };
  } finally {
    syncState.pendingWrites = Math.max(0, syncState.pendingWrites - 1);
  }
}

export async function syncPhoneChatNow(
  characterId,
  kind = "chat.update",
  branchId = "",
) {
  const character = state.characters.find((item) => item.id === characterId);
  const branch =
    state.chatBranches[branchId] || activeBranchForCharacter(characterId);
  if (!character || !branch || !syncState.initialized) return null;
  const characterSyncKey = cloudCharacterKey(character);
  branch.cloudBranchId ||=
    branch.tavernSaveId
      ? `tavern_${stableTextHash(
          `${branch.tavernCharacterKey}|${branch.tavernSaveId}`,
        )}`
      : "main";
  const messages = compactMessages(branch.messages, branch.phoneSummary);
  const dirtyAtStart = Number(branch.localDirtyAt) || Date.now();
  const payload = {
    schemaVersion: 2,
    characterSyncKey,
    characterId,
    characterName: character.name,
    characterCard: characterCardPayload(character),
    characterUpdatedAt:
      Number(character.updatedAt) || Number(character.importedAt) || Date.now(),
    branchId: branch.id,
    cloudBranchId: branch.cloudBranchId,
    branchTitle: branch.title,
    origin: branch.origin,
    tavernSaveId: branch.tavernSaveId || "",
    tavernCharacterKey: branch.tavernCharacterKey || "",
    messages,
    windowStartedAt: Number(messages[0]?.createdAt) || 0,
    deletedMessageIds: (branch.deletedMessageIds || []).slice(-200),
    phoneSummary: branch.phoneSummary || null,
    createdAt: branch.createdAt,
    updatedAt: Date.now(),
  };
  const result = await commitSyncSnapshot({
    entityType: "phone.chat",
    entityId: `character:${characterSyncKey}`,
    snapshotPayload: payload,
    eventPayload: {
      kind,
      characterSyncKey,
      cloudBranchId: branch.cloudBranchId,
      updatedAt: payload.updatedAt,
    },
  });
  if (result) {
    branch.cloudRevision = result.revision;
    if ((Number(branch.localDirtyAt) || 0) <= dirtyAtStart) {
      branch.localDirtyAt = 0;
    }
  }
  return result;
}

export function queuePhoneChatSync(
  characterId,
  kind = "chat.update",
  branchId = "",
) {
  const branch =
    state.chatBranches[branchId] || activeBranchForCharacter(characterId);
  if (!branch) return;
  branch.updatedAt = Date.now();
  branch.localDirtyAt = Date.now();
  const timerKey = branch.id;
  clearTimeout(writeTimers.get(timerKey));
  writeTimers.set(
    timerKey,
    setTimeout(() => {
      writeTimers.delete(timerKey);
      syncPhoneChatNow(characterId, kind, branch.id).catch((error) => {
        syncState.error = error.message || "聊天上传失败";
      });
    }, 700),
  );
}
