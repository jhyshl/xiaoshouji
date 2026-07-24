<script setup>
import { computed } from "vue";
import { initialOf } from "../../utils/text.js";

const props = defineProps({
  src: { type: String, default: "" },
  name: { type: String, default: "L" },
  size: { type: String, default: "normal" },
});
const initial = computed(() => initialOf(props.name));
</script>

<template>
  <span class="avatar" :class="`avatar-${size}`">
    <img v-if="src" :src="src" alt="" />
    <template v-else>{{ initial }}</template>
  </span>
</template>
