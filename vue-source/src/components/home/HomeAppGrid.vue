<script setup>
import { navigate } from "../../store/linePhone.js";

const apps = [
  { view: "contacts", glyph: "○", label: "消息" },
  { view: "contacts", glyph: "⌕", label: "联系人" },
  { view: "library", glyph: "⌘", label: "资料库" },
  { view: "settings", glyph: "⌁", label: "设置" },
];
</script>

<template>
  <div class="phone-app-grid" aria-label="应用">
    <button v-for="app in apps" :key="`${app.view}-${app.label}`" type="button" @click="navigate(app.view)">
      <span>{{ app.glyph }}</span>
      <strong>{{ app.label }}</strong>
    </button>
  </div>
</template>
