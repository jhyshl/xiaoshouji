<script setup>
defineProps({
  itemId: { type: String, required: true },
  kind: { type: String, required: true },
  dragging: { type: Boolean, default: false },
});
</script>

<template>
  <article
    class="desktop-item"
    :class="[`desktop-item-${kind}`, { dragging }]"
    :data-home-item="itemId"
  >
    <slot />
  </article>
</template>
