<script setup>
import { exportBackup } from "../../composables/useSettings.js";
import { navigate } from "../../store/linePhone.js";

const actions = [
  { label: "消息", icon: "○", action: () => navigate("contacts") },
  { label: "资料库", icon: "＋", action: () => navigate("library") },
  { label: "玩家人设", icon: "♙", action: () => navigate("persona") },
  { label: "导出备份", icon: "↗", action: exportBackup },
];
</script>

<template>
  <div class="quick-dock">
    <button v-for="item in actions" :key="item.label" type="button" @click="item.action">
      <span>{{ item.icon }}</span>
      <small>{{ item.label }}</small>
    </button>
  </div>
</template>
