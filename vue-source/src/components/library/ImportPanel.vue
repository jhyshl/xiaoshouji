<script setup>
import { importCharacterFile, importWorldBookFile } from "../../composables/useLibrary.js";

async function characterSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  await importCharacterFile(file);
}

async function worldBookSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  await importWorldBookFile(file);
}
</script>

<template>
  <section class="import-grid">
    <label class="import-card">
      <span>＋</span>
      <strong>导入角色卡</strong>
      <small>支持酒馆 JSON / PNG</small>
      <input type="file" accept=".json,.png,application/json,image/png" @change="characterSelected" />
    </label>
    <label class="import-card">
      <span>⌘</span>
      <strong>导入世界书</strong>
      <small>支持 JSON 与角色卡内嵌</small>
      <input type="file" accept=".json,application/json" @change="worldBookSelected" />
    </label>
  </section>
</template>
