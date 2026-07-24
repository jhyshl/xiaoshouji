<script setup>
import BaseModal from "../common/BaseModal.vue";
import { modalState } from "../../store/linePhone.js";
</script>

<template>
  <BaseModal title="最终系统提示词" wide @close="modalState.promptPreview = ''">
    <textarea class="prompt-preview-area" :value="modalState.promptPreview" rows="24" readonly></textarea>
    <p class="modal-note">
      这是当前玩家人设、角色卡、已启用世界书、系统提示词模板与回复规则合成后的最终版本。
    </p>
  </BaseModal>
</template>
