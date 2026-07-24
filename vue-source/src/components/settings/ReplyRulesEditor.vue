<script setup>
import { resetReplyRules } from "../../composables/useSettings.js";
import { state } from "../../store/linePhone.js";
</script>

<template>
  <section class="settings-card reply-rules-card">
    <div class="settings-card-title">
      <span v-pre>{{reply_rules}}</span>
      <strong>AI 回复规则</strong>
    </div>
    <p class="helper-copy">
      下面就是系统提示词中 <code v-pre>{{reply_rules}}</code> 的具体内容，可以直接修改测试。
    </p>
    <textarea
      v-model="state.settings.replyRules"
      class="prompt-textarea reply-rules-textarea"
      rows="12"
      spellcheck="false"
    ></textarea>
    <div class="inline-actions">
      <button type="button" @click="resetReplyRules">恢复默认回复规则</button>
    </div>
  </section>
</template>
