<script setup>
import AppAvatar from "../common/AppAvatar.vue";
import { updatePlayerAvatar } from "../../composables/useSettings.js";
import { state } from "../../store/linePhone.js";

async function selected(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  await updatePlayerAvatar(file);
}
</script>

<template>
  <div class="persona-avatar-panel">
    <AppAvatar :src="state.profile.avatar" :name="state.profile.name" />
    <label class="soft-button">
      选择玩家头像
      <input type="file" accept="image/*" @change="selected" />
    </label>
    <button v-if="state.profile.avatar" type="button" @click="state.profile.avatar = ''">移除</button>
  </div>
</template>
