<script setup>
defineProps({
  eyebrow: { type: String, default: "LINEPHONE" },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});
</script>

<template>
  <header class="page-header">
    <div>
      <small>{{ eyebrow }}</small>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <slot />
  </header>
</template>
