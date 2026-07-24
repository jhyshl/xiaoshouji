<script setup>
import { ref, watch } from "vue";
import { refreshSyncData, syncState, updateDeviceName } from "../../services/sync.js";
import { showToast } from "../../store/linePhone.js";

const deviceName = ref(syncState.device.name);
watch(
  () => syncState.device.name,
  (value) => {
    deviceName.value = value;
  },
);

async function saveName() {
  try {
    await updateDeviceName(deviceName.value);
    showToast("设备名称已更新");
  } catch (error) {
    showToast(`设备更新失败：${error.message || "未知错误"}`);
  }
}
</script>

<template>
  <article class="sync-card device-status-card">
    <header class="sync-card-heading">
      <div>
        <small>THIS DEVICE</small>
        <h2>当前设备</h2>
      </div>
      <span :class="['sync-dot', { online: syncState.connected }]"></span>
    </header>
    <label class="sync-inline-field">
      <span>设备名称</span>
      <input v-model.trim="deviceName" maxlength="80" />
      <button type="button" @click="saveName">保存</button>
    </label>
    <dl class="sync-metrics">
      <div>
        <dt>类型</dt>
        <dd>{{ syncState.device.platform }}</dd>
      </div>
      <div>
        <dt>云端连接</dt>
        <dd>{{ syncState.connected ? "实时在线" : "等待连接" }}</dd>
      </div>
      <div>
        <dt>待上传</dt>
        <dd>{{ syncState.pendingWrites }}</dd>
      </div>
    </dl>
    <p v-if="syncState.error" class="sync-error">{{ syncState.error }}</p>
    <button class="wide-soft-button" type="button" :disabled="syncState.busy" @click="refreshSyncData">
      {{ syncState.busy ? "同步中…" : "立即刷新" }}
    </button>
  </article>
</template>
