<script setup>
import { computed } from "vue";
import ChatHeader from "./ChatHeader.vue";
import MessageList from "./MessageList.vue";
import QueuedSendBar from "./QueuedSendBar.vue";
import ChatComposer from "./ChatComposer.vue";
import TypingIndicator from "./TypingIndicator.vue";
import {
  currentCharacter,
  messagesForCharacter,
  navigate,
  queuedMessages,
} from "../../store/linePhone.js";

const messages = computed(() =>
  currentCharacter.value ? messagesForCharacter(currentCharacter.value.id) : [],
);
const queuedCount = computed(() =>
  currentCharacter.value ? queuedMessages(currentCharacter.value.id).length : 0,
);
</script>

<template>
  <section class="view active chat-view">
    <template v-if="currentCharacter">
      <ChatHeader />
      <MessageList :messages="messages" />
      <TypingIndicator />
      <QueuedSendBar :count="queuedCount" />
      <ChatComposer />
    </template>
    <div v-else class="empty-state chat-empty">
      <span>○</span>
      <p>请先导入并选择一个角色</p>
      <button class="primary-button" type="button" @click="navigate('library')">前往资料库</button>
    </div>
  </section>
</template>
