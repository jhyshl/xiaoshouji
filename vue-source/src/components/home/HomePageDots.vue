<script setup>
defineProps({
  count: { type: Number, required: true },
  active: { type: Number, required: true },
});
defineEmits(["select"]);
</script>

<template>
  <nav class="home-page-dots" aria-label="桌面分页" data-edit-control>
    <button
      v-for="index in count"
      :key="index"
      type="button"
      :class="{ active: index - 1 === active }"
      :aria-label="`切换到第 ${index} 页`"
      @click="$emit('select', index - 1)"
    ></button>
  </nav>
</template>
