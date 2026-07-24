<script setup>
import { exportBackup, restoreBackup } from "../../composables/useSettings.js";

async function selected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  await restoreBackup(file);
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>LOCAL DATA</span>
      <strong>备份与恢复</strong>
    </div>
    <div class="backup-actions">
      <button class="soft-button" type="button" @click="exportBackup">导出完整备份</button>
      <label class="soft-button">
        恢复备份
        <input type="file" accept=".json,application/json" @change="selected" />
      </label>
    </div>
    <p class="helper-copy">备份不会包含 API Key。恢复前建议先导出一次当前数据。</p>
  </section>
</template>
