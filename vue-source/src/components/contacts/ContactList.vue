<script setup>
import ContactRow from "./ContactRow.vue";

defineProps({
  characters: { type: Array, required: true },
  searching: { type: Boolean, default: false },
});
</script>

<template>
  <div class="contact-list">
    <ContactRow v-for="character in characters" :key="character.id" :character="character" />
    <div v-if="!characters.length" class="empty-state">
      <span>○</span>
      <p v-if="searching">没有找到这个角色</p>
      <p v-else>导入角色卡后<br />联系人会出现在这里</p>
    </div>
  </div>
</template>
