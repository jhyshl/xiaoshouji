<script setup>
import { computed, ref } from "vue";
import BaseModal from "../common/BaseModal.vue";
import { deleteMessage, saveMessage } from "../../composables/useChat.js";
import {
  currentCharacter,
  messagesForCharacter,
  modalState,
} from "../../store/linePhone.js";

const message = computed(() =>
  messagesForCharacter(currentCharacter.value?.id).find(
    (item) => item.id === modalState.messageId,
  ),
);
const content = ref(message.value?.content || "");
</script>

<template>
  <BaseModal title="编辑消息" @close="modalState.messageId = null">
    <form v-if="message" @submit.prevent="saveMessage(message.id, content)">
      <label class="modal-field">
        <span>消息内容</span>
        <textarea v-model="content" rows="7" required></textarea>
      </label>
      <div class="modal-actions split-actions">
        <button class="danger-button" type="button" @click="deleteMessage(message.id)">删除</button>
        <button class="primary-button" type="submit">保存修改</button>
      </div>
    </form>
    <p v-else class="empty-state">这条消息已经不存在。</p>
  </BaseModal>
</template>
