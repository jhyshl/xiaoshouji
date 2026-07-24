<script setup>
import CharacterCard from "./CharacterCard.vue";
defineProps({ characters: { type: Array, required: true } });
</script>

<template>
  <section class="library-section">
    <div class="section-title">
      <span>CHARACTERS</span>
      <strong>角色卡</strong>
    </div>
    <div v-if="characters.length" class="library-list">
      <CharacterCard v-for="character in characters" :key="character.id" :character="character" />
    </div>
    <div v-else class="empty-state compact-empty"><p>还没有导入角色卡</p></div>
  </section>
</template>
