<script setup>
defineProps({
  glyph: { type: String, required: true },
  label: { type: String, required: true },
});
defineEmits(["open"]);
</script>

<template>
  <button class="home-app-icon" type="button" @click="$emit('open')">
    <span>{{ glyph }}</span>
    <strong>{{ label }}</strong>
  </button>
</template>
