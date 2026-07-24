<script setup>
import { activeView, currentCharacter, navigate } from "../../store/linePhone.js";

const items = [
  { view: "home", icon: "⌂", label: "首页" },
  { view: "contacts", icon: "○", label: "消息" },
  { view: "library", icon: "⌘", label: "资料库" },
  { view: "persona", icon: "♙", label: "人设" },
  { view: "settings", icon: "⌁", label: "设置" },
];

function go(view) {
  if (view === "contacts" && currentCharacter.value) {
    navigate("contacts");
    return;
  }
  navigate(view);
}

function isActive(view) {
  return activeView.value === view || (activeView.value === "chat" && view === "contacts");
}
</script>

<template>
  <nav class="bottom-nav" aria-label="主要导航">
    <button
      v-for="item in items"
      :key="item.view"
      type="button"
      :class="{ active: isActive(item.view) }"
      @click="go(item.view)"
    >
      <span>{{ item.icon }}</span>
      <small>{{ item.label }}</small>
    </button>
  </nav>
</template>
