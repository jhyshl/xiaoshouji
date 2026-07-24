<script setup>
import { ref } from "vue";
import { fetchModels } from "../../composables/useSettings.js";
import { state } from "../../store/linePhone.js";

const loading = ref(false);

async function loadModels() {
  loading.value = true;
  await fetchModels();
  loading.value = false;
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>API</span>
      <strong>连接与模型</strong>
    </div>
    <label class="stacked-field">
      <span><strong>API 地址</strong><small>填写 Chat Completions 兼容地址。</small></span>
      <input v-model.trim="state.settings.apiUrl" type="url" placeholder="https://example.com/v1" />
    </label>
    <label class="stacked-field">
      <span><strong>API Key</strong><small>只保存在当前设备，不进入备份。</small></span>
      <input v-model="state.settings.apiKey" type="password" autocomplete="off" />
    </label>
    <div class="model-row">
      <label class="stacked-field">
        <span><strong>模型</strong><small>先拉取，再从列表选择。</small></span>
        <select v-model="state.settings.model">
          <option value="" disabled>请先拉取模型</option>
          <option v-for="model in state.settings.modelOptions" :key="model" :value="model">{{ model }}</option>
        </select>
      </label>
      <button class="soft-button" type="button" :disabled="loading" @click="loadModels">
        {{ loading ? "拉取中…" : "拉取模型" }}
      </button>
    </div>
  </section>
</template>
