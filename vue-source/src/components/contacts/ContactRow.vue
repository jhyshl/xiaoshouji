<script setup>
import { computed } from "vue";
import AppAvatar from "../common/AppAvatar.vue";
import { formatRelative } from "../../utils/text.js";
import { messagesForCharacter, openChat } from "../../store/linePhone.js";

const props = defineProps({ character: { type: Object, required: true } });
const messages = computed(() => messagesForCharacter(props.character.id));
const latest = computed(() => messages.value.at(-1));
</script>

<template>
  <button type="button" class="contact-row" @click="openChat(character.id)">
    <AppAvatar :src="character.avatar" :name="character.name" />
    <span class="contact-copy">
      <strong>{{ character.name }}</strong>
      <small>{{ latest?.content || "开始一段新聊天" }}</small>
    </span>
    <time>{{ formatRelative(latest?.createdAt) }}</time>
  </button>
</template>
