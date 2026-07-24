<script setup>
import AppAvatar from "../common/AppAvatar.vue";
import { currentCharacter, modalState, navigate } from "../../store/linePhone.js";
</script>

<template>
  <header class="chat-header">
    <button type="button" class="icon-button" aria-label="返回消息列表" @click="navigate('contacts')">‹</button>
    <button
      v-if="currentCharacter"
      type="button"
      class="chat-person"
      @click="modalState.characterId = currentCharacter.id"
    >
      <AppAvatar :src="currentCharacter.avatar" :name="currentCharacter.name" size="small" />
      <span>
        <strong>{{ currentCharacter.name }}</strong>
        <small>本地记忆 · 可编辑角色卡</small>
      </span>
    </button>
    <button
      v-if="currentCharacter"
      type="button"
      class="icon-button"
      aria-label="编辑角色卡"
      @click="modalState.characterId = currentCharacter.id"
    >
      ···
    </button>
  </header>
</template>
