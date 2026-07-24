<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const time = ref("");
let timer;

function updateTime() {
  time.value = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

onMounted(() => {
  updateTime();
  timer = window.setInterval(updateTime, 30_000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <header class="status-bar" aria-label="应用状态">
    <strong>{{ time }}</strong>
    <span class="status-icons" aria-hidden="true">▮▮▮ ◔ ▰</span>
  </header>
</template>
