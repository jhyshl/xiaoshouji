<script setup>
import { computed, reactive } from "vue";
import BaseModal from "../common/BaseModal.vue";
import AppAvatar from "../common/AppAvatar.vue";
import { deleteCharacter, saveCharacter } from "../../composables/useLibrary.js";
import { modalState, state, showToast } from "../../store/linePhone.js";
import { resizeImageFile } from "../../utils/files.js";

const source = computed(() =>
  state.characters.find((item) => item.id === modalState.characterId),
);
const draft = reactive(JSON.parse(JSON.stringify(source.value)));

async function avatarSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    draft.avatar = await resizeImageFile(file);
  } catch {
    showToast("头像读取失败");
  }
}
</script>

<template>
  <BaseModal title="编辑角色卡" wide @close="modalState.characterId = null">
    <form @submit.prevent="saveCharacter(draft)">
      <div class="character-avatar-editor">
        <AppAvatar :src="draft.avatar" :name="draft.name" />
        <label class="soft-button">
          更换头像
          <input type="file" accept="image/*" @change="avatarSelected" />
        </label>
        <button type="button" @click="draft.avatar = ''">移除头像</button>
      </div>
      <label class="modal-field"><span>角色名</span><input v-model="draft.name" required /></label>
      <label class="modal-field"><span>角色描述</span><textarea v-model="draft.description" rows="5"></textarea></label>
      <label class="modal-field"><span>性格</span><textarea v-model="draft.personality" rows="4"></textarea></label>
      <label class="modal-field"><span>场景</span><textarea v-model="draft.scenario" rows="4"></textarea></label>
      <label class="modal-field"><span>第一条消息</span><textarea v-model="draft.firstMes" rows="4"></textarea></label>
      <label class="modal-field"><span>对话示例</span><textarea v-model="draft.mesExample" rows="5"></textarea></label>
      <label class="modal-field"><span>角色卡系统提示词</span><textarea v-model="draft.systemPrompt" rows="4"></textarea></label>
      <label class="modal-field"><span>历史后指令</span><textarea v-model="draft.postHistoryInstructions" rows="4"></textarea></label>
      <div class="modal-actions split-actions">
        <button class="danger-button" type="button" @click="deleteCharacter(draft.id)">删除角色</button>
        <button class="primary-button" type="submit">保存角色卡</button>
      </div>
    </form>
  </BaseModal>
</template>
