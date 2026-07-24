<script setup>
import { computed } from "vue";
import AppAvatar from "../common/AppAvatar.vue";
import {
  navigate,
  messagesForCharacter,
  openChat,
  recentCharacter,
} from "../../store/linePhone.js";

const lastMessage = computed(() => {
  const character = recentCharacter.value;
  if (!character) return "到资料库导入角色卡";
  return messagesForCharacter(character.id).at(-1)?.content || "点击开始聊天";
});

function open() {
  if (recentCharacter.value) openChat(recentCharacter.value.id);
  else navigate("library");
}
</script>

<template>
  <section class="recent-contact">
    <p>最近联系人</p>
    <button type="button" class="recent-contact-card" @click="open">
      <AppAvatar
        :src="recentCharacter?.avatar"
        :name="recentCharacter?.name || 'L'"
        size="small"
      />
      <span>
        <strong>{{ recentCharacter?.name || "尚未导入角色" }}</strong>
        <small>{{ lastMessage }}</small>
      </span>
      <b>↗</b>
    </button>
  </section>
</template>
