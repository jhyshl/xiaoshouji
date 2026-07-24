<script setup>
import WorldBookCard from "./WorldBookCard.vue";
defineProps({ books: { type: Array, required: true } });
</script>

<template>
  <section class="library-section">
    <div class="section-title">
      <span>LOREBOOKS</span>
      <strong>世界书</strong>
    </div>
    <div v-if="books.length" class="library-list">
      <WorldBookCard v-for="book in books" :key="book.id" :book="book" />
    </div>
    <div v-else class="empty-state compact-empty"><p>还没有导入世界书</p></div>
  </section>
</template>
