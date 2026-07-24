<script setup>
import AppAvatar from "../common/AppAvatar.vue";
import { currentCharacter, modalState, state } from "../../store/linePhone.js";
import { formatTime } from "../../utils/text.js";

const props = defineProps({ message: { type: Object, required: true } });
let timer = null;
let startPoint = null;

function openEditor() {
  modalState.messageId = props.message.id;
}

function pointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  startPoint = { x: event.clientX, y: event.clientY };
  clearTimeout(timer);
  timer = window.setTimeout(openEditor, 560);
}

function pointerMove(event) {
  if (!startPoint) return;
  if (Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 12) {
    clearTimer();
  }
}

function clearTimer() {
  clearTimeout(timer);
  timer = null;
  startPoint = null;
}

function contextMenu(event) {
  event.preventDefault();
  openEditor();
}

function keydown(event) {
  if (event.key === "Enter" || event.key === "F2") {
    event.preventDefault();
    openEditor();
  }
}
</script>

<template>
  <article class="message-row" :class="message.role">
    <AppAvatar
      v-if="message.role === 'assistant'"
      :src="currentCharacter?.avatar"
      :name="currentCharacter?.name || 'C'"
      size="mini"
    />
    <div
      class="bubble"
      :class="{ queued: message.queued }"
      tabindex="0"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="clearTimer"
      @pointercancel="clearTimer"
      @pointerleave="clearTimer"
      @contextmenu="contextMenu"
      @keydown="keydown"
    >
      <p>{{ message.content }}</p>
      <time>
        <span v-if="message.queued" class="queue-mark">待发送</span>
        {{ formatTime(message.createdAt) }}
      </time>
    </div>
    <AppAvatar
      v-if="message.role === 'user'"
      :src="state.profile.avatar"
      :name="state.profile.name"
      size="mini"
    />
  </article>
</template>
