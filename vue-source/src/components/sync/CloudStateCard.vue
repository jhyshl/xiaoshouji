<script setup>
import { computed } from "vue";
import { syncState } from "../../services/sync.js";

const usedBytes = computed(
  () =>
    Number(syncState.usage?.total_bytes) ||
    Number(syncState.usage?.used_bytes) ||
    Number(syncState.usage?.snapshot_bytes) +
      Number(syncState.usage?.event_bytes) ||
    0,
);
const limitBytes = computed(
  () =>
    Number(syncState.usage?.hard_limit_bytes) ||
    Number(syncState.usage?.limit_bytes) ||
    0,
);
const usagePercent = computed(() =>
  limitBytes.value ? Math.min(100, (usedBytes.value / limitBytes.value) * 100) : 0,
);

function readable(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
</script>

<template>
  <article class="sync-card cloud-state-card">
    <header class="sync-card-heading">
      <div>
        <small>CLOUD WINDOW</small>
        <h2>云端最新窗口</h2>
      </div>
      <b>{{ syncState.snapshots.length }} 项</b>
    </header>
    <p>
      云端只保存每个角色当前使用的分支、最新总结和未总结楼层；完整旧记录仍在各设备本地。
    </p>
    <div class="usage-track"><i :style="{ width: `${usagePercent}%` }"></i></div>
    <small>{{ readable(usedBytes) }} / {{ readable(limitBytes) }}</small>
    <div class="registered-devices">
      <section v-for="device in syncState.devices" :key="device.id">
        <span>
          <strong>{{ device.device_name }}</strong>
          <small>{{ device.platform }} · 游标 {{ device.last_ack_seq }}</small>
        </span>
        <time>{{ device.revoked_at ? "已撤销" : "已注册" }}</time>
      </section>
    </div>
  </article>
</template>
