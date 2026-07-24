<script setup>
import { computed } from "vue";
import { currentCharacter } from "../../store/linePhone.js";

const subtitle = computed(() =>
  currentCharacter.value
    ? `${currentCharacter.value.name} 的资料和记忆已保存在当前设备。`
    : "消息先进入聊天，再由你决定何时交给 AI。",
);
</script>

<template>
  <article class="today-widget">
    <p>今天</p>
    <strong>把想说的话，慢慢发完。</strong>
    <span>{{ subtitle }}</span>
  </article>
</template>
