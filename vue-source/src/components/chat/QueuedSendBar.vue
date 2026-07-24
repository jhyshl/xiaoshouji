<script setup>
import { confirmQueuedMessages } from "../../composables/useChat.js";
import { sending } from "../../store/linePhone.js";

defineProps({ count: { type: Number, required: true } });
</script>

<template>
  <div v-if="count" class="queue-confirm">
    <span>
      <strong>待交给 AI · {{ count }} 个气泡 / 1 轮</strong>
      <small>这些气泡已经显示，但还没有请求 AI。</small>
    </span>
    <button type="button" :disabled="sending" @click="confirmQueuedMessages">
      {{ sending ? "发送中…" : "确认发送 ↑" }}
    </button>
  </div>
</template>
