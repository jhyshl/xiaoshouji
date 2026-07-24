<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const time = ref("");
const date = ref("");
let timer;

function update() {
  const now = new Date();
  time.value = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  date.value = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
}

onMounted(() => {
  update();
  timer = window.setInterval(update, 30_000);
});
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <div class="home-date">
    <strong>{{ time }}</strong>
    <span>{{ date }}</span>
  </div>
</template>
