<script setup>
defineProps({
  title: { type: String, required: true },
  wide: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);
</script>

<template>
  <div class="modal-layer" role="dialog" aria-modal="true" @click.self="emit('close')">
    <section class="modal-panel" :class="{ 'large-modal': wide }">
      <header class="modal-header">
        <div>
          <small>LINEPHONE</small>
          <h2>{{ title }}</h2>
        </div>
        <button type="button" aria-label="关闭" @click="emit('close')">×</button>
      </header>
      <slot />
    </section>
  </div>
</template>
