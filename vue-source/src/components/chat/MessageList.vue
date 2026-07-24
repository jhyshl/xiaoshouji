<script setup>
import { nextTick, onMounted, ref, watch } from "vue";
import MessageBubble from "./MessageBubble.vue";

const props = defineProps({ messages: { type: Array, required: true } });
const host = ref(null);

function scrollBottom() {
  nextTick(() => {
    if (host.value) host.value.scrollTop = host.value.scrollHeight;
  });
}

onMounted(scrollBottom);
watch(() => props.messages.length, scrollBottom);
</script>

<template>
  <div ref="host" class="message-list">
    <div v-if="!messages.length" class="empty-state chat-empty">
      <span>⋯</span>
      <p>先写下一条消息吧</p>
    </div>
    <MessageBubble v-for="message in messages" :key="message.id" :message="message" />
  </div>
</template>
