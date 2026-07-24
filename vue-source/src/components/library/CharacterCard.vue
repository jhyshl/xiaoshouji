<script setup>
import { computed } from "vue";
import AppAvatar from "../common/AppAvatar.vue";
import {
  matchedWorldBookCount,
  modalState,
  openChat,
  queuedMessages,
  state,
} from "../../store/linePhone.js";

const props = defineProps({ character: { type: Object, required: true } });
const messageCount = computed(() => (state.chats[props.character.id] || []).length);
const queuedCount = computed(() => queuedMessages(props.character.id).length);
</script>

<template>
  <article class="library-card character-card">
    <AppAvatar :src="character.avatar" :name="character.name" />
    <div>
      <strong>{{ character.name }}</strong>
      <small>
        {{ messageCount }} 条气泡 · {{ matchedWorldBookCount(character.id) }} 本世界书
      </small>
      <small v-if="queuedCount">{{ queuedCount }} 个气泡待交给 AI</small>
    </div>
    <div class="card-actions">
      <button type="button" @click="modalState.characterId = character.id">编辑</button>
      <button type="button" @click="openChat(character.id)">聊天</button>
    </div>
  </article>
</template>
