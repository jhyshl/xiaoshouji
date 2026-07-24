<script setup>
import { sending } from "../../store/linePhone.js";
</script>

<template>
  <div v-if="sending" class="typing-line" aria-live="polite">
    <span></span><span></span><span></span>
    AI 正在组织短回复
  </div>
</template>
