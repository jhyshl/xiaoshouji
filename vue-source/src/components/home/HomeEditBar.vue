<script setup>
defineProps({ visible: { type: Boolean, default: false } });
defineEmits(["done"]);
</script>

<template>
  <div v-if="visible" class="home-edit-bar" data-edit-control>
    <span>拖动图标或组件；拖到屏幕两侧可换页</span>
    <button type="button" @click="$emit('done')">完成</button>
  </div>
</template>
