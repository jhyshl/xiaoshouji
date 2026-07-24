<script setup>
import { state } from "../../store/linePhone.js";
</script>

<template>
  <section class="settings-card">
    <div class="settings-card-title">
      <span>GENERATION</span>
      <strong>回复参数</strong>
    </div>
    <label class="field-row">
      <span><strong>上下文消息数</strong><small>玩家一轮、AI 一轮各算 1 条。</small></span>
      <input v-model.number="state.settings.contextTurns" type="number" min="0" max="200" step="1" />
    </label>
    <label class="field-row">
      <span><strong>温度</strong><small>越高越自由。</small></span>
      <input v-model.number="state.settings.temperature" type="number" min="0" max="2" step="0.1" />
    </label>
    <label class="field-row">
      <span><strong>最大输出 Token</strong><small>短回复通常 300～600 即可。</small></span>
      <input v-model.number="state.settings.maxTokens" type="number" min="64" max="4096" step="1" />
    </label>
  </section>
</template>
