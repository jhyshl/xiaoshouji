import { reactive } from "vue";
import { activeBranchForCharacter, branchesForCharacter, state } from "../store/linePhone.js";
import { supabase } from "./supabase.js";
import { getDeviceIdentity, renameLocalDevice } from "./deviceIdentity.js";

const APP_VERSION = "3.1.0";
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

function compactMessages(messages) {
  return (Array.isArray(messages) ? messages : []).slice(-50).map((message) => ({
    id: message.id,
    turnId: message.turnId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || null,
    source: message.source || "phone",
    queued: Boolean(message.queued),
  }));
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

function applyTavernSnapshot(snapshot) {
  const payload = snapshot.payload || {};
  const tavernCharacterKey =
    payload.tavernCharacterKey || payload.characterKey || payload.characterId;
  if (!tavernCharacterKey) return;
  const inbox = (state.sync.tavernInbox[tavernCharacterKey] ||= {
    characterName: payload.characterName || "",
  });
  inbox.characterName ||= payload.characterName || "";
  inbox.revision = Math.max(Number(inbox.revision) || 0, Number(snapshot.revision) || 0);
  inbox.updatedAt = snapshot.updated_at || new Date().toISOString();
  if (snapshot.entity_type === "tavern.active") inbox.active = payload;
  if (snapshot.entity_type === "tavern.summary") inbox.summary = payload;
  if (snapshot.entity_type === "tavern.recent") inbox.recent = payload;

  const characterId =
    state.sync.characterBindings[tavernCharacterKey] ||
    autoBindCharacter(tavernCharacterKey, payload.characterName || inbox.characterName);
  if (characterId) {
    const branch = branchesForCharacter(characterId).find(
      (item) =>
        item.tavernCharacterKey === tavernCharacterKey &&
        item.tavernSaveId === payload.saveId,
    );
    if (branch) {
      if (snapshot.entity_type === "tavern.summary") branch.tavernSummary = payload;
      if (snapshot.entity_type === "tavern.recent") branch.tavernRecent = payload;
      branch.updatedAt = Date.now();
    }
  }
  updateMismatch(tavernCharacterKey);
}

function applyPhoneSnapshot(snapshot) {
  const payload = snapshot.payload || {};
  const characterId = payload.characterId;
  if (!characterId || !state.characters.some((item) => item.id === characterId)) return;
  const branchId = payload.branchId;
  let branch = state.chatBranches[branchId];
  if (!branch && branchId) {
    branch = {
      id: branchId,
      characterId,
      title: payload.branchTitle || "同步聊天",
      origin: payload.origin || "phone",
      tavernSaveId: payload.tavernSaveId || "",
      tavernCharacterKey: payload.tavernCharacterKey || "",
      messages: [],
      tavernSummary: payload.tavernSummary || null,
      tavernRecent: payload.tavernRecent || null,
      cloudRevision: 0,
      createdAt: Number(payload.createdAt) || Date.now(),
      updatedAt: Date.now(),
    };
    state.chatBranches[branch.id] = branch;
  }
  if (!branch || branch.characterId !== characterId) return;
  branch.cloudRevision = Math.max(
    Number(branch.cloudRevision) || 0,
    Number(snapshot.revision) || 0,
  );
  if (!branch.localDirtyAt && snapshot.source_device_id !== syncState.device.id) {
    branch.messages = compactMessages(payload.messages);
    branch.title = payload.branchTitle || branch.title;
    branch.tavernSaveId = payload.tavernSaveId || "";
    branch.tavernCharacterKey = payload.tavernCharacterKey || "";
    branch.tavernSummary = payload.tavernSummary || branch.tavernSummary;
    branch.tavernRecent = payload.tavernRecent || branch.tavernRecent;
    branch.updatedAt = Number(payload.updatedAt) || Date.now();
  }
  if (!state.activeBranchIds[characterId]) {
    state.activeBranchIds[characterId] = branch.id;
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
  const dirtyCharacters = [
    ...new Set(
      Object.values(state.chatBranches)
        .filter((branch) => branch.localDirtyAt)
        .map((branch) => branch.characterId),
    ),
  ];
  for (const characterId of dirtyCharacters) {
    await syncPhoneChatNow(characterId, "offline.flush");
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

export async function syncPhoneChatNow(characterId, kind = "chat.update") {
  const character = state.characters.find((item) => item.id === characterId);
  const branch = activeBranchForCharacter(characterId);
  if (!character || !branch || !syncState.initialized) return null;
  const payload = {
    schemaVersion: 1,
    characterId,
    characterName: character.name,
    branchId: branch.id,
    branchTitle: branch.title,
    origin: branch.origin,
    tavernSaveId: branch.tavernSaveId || "",
    tavernCharacterKey: branch.tavernCharacterKey || "",
    messages: compactMessages(branch.messages),
    tavernSummary: branch.tavernSummary || null,
    tavernRecent: branch.tavernRecent || null,
    createdAt: branch.createdAt,
    updatedAt: Date.now(),
  };
  const result = await commitSyncSnapshot({
    entityType: "phone.chat",
    entityId: `character:${characterId}`,
    snapshotPayload: payload,
    eventPayload: {
      kind,
      characterId,
      branchId: branch.id,
      updatedAt: payload.updatedAt,
    },
  });
  if (result) {
    branch.cloudRevision = result.revision;
    branch.localDirtyAt = 0;
  }
  return result;
}

export function queuePhoneChatSync(characterId, kind = "chat.update") {
  const branch = activeBranchForCharacter(characterId);
  if (!branch) return;
  branch.updatedAt = Date.now();
  branch.localDirtyAt = Date.now();
  clearTimeout(writeTimers.get(characterId));
  writeTimers.set(
    characterId,
    setTimeout(() => {
      writeTimers.delete(characterId);
      syncPhoneChatNow(characterId, kind).catch((error) => {
        syncState.error = error.message || "聊天上传失败";
      });
    }, 700),
  );
}
