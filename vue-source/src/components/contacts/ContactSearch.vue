<script setup>
const model = defineModel({ type: String, default: "" });
</script>

<template>
  <label class="search-field">
    <span aria-hidden="true">⌕</span>
    <input v-model="model" type="search" placeholder="搜索联系人" />
  </label>
</template>
