<script setup>
import {
  previewFinalPrompt,
  resetSystemPrompt,
} from "../../composables/useSettings.js";
import { state } from "../../store/linePhone.js";
</script>

<template>
  <section class="settings-card prompt-editor-card">
    <div class="settings-card-title">
      <span>SYSTEM PROMPT</span>
      <strong>系统提示词模板</strong>
    </div>
    <p class="helper-copy">
      可用占位符：<code v-pre>{{char}}</code>、<code v-pre>{{user}}</code>、
      <code v-pre>{{player_persona}}</code>、<code v-pre>{{character_card}}</code>、
      <code v-pre>{{worldbook}}</code>、<code v-pre>{{reply_rules}}</code>
    </p>
    <textarea
      v-model="state.settings.systemPromptTemplate"
      class="prompt-textarea"
      rows="16"
      spellcheck="false"
    ></textarea>
    <div class="inline-actions">
      <button type="button" @click="resetSystemPrompt">恢复默认</button>
      <button class="soft-button" type="button" @click="previewFinalPrompt">预览最终提示词</button>
    </div>
  </section>
</template>
