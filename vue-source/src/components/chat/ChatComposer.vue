<script setup>
import { nextTick, ref } from "vue";
import { stageMessage } from "../../composables/useChat.js";
import { sending } from "../../store/linePhone.js";

const content = ref("");
const textarea = ref(null);

function submit() {
  if (stageMessage(content.value)) {
    content.value = "";
    nextTick(() => {
      if (textarea.value) textarea.value.style.height = "";
    });
  }
}

function resize() {
  if (!textarea.value) return;
  textarea.value.style.height = "auto";
  textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 120)}px`;
}
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <textarea
      ref="textarea"
      v-model="content"
      rows="1"
      placeholder="写下一条消息…"
      :disabled="sending"
      @input="resize"
    ></textarea>
    <button type="submit" class="composer-send" :disabled="sending || !content.trim()" aria-label="发送到聊天">
      ↑
    </button>
  </form>
</template>
