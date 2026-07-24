<script setup>
import { computed } from "vue";
import { modalState, state } from "../../store/linePhone.js";

const props = defineProps({ book: { type: Object, required: true } });
const enabledEntries = computed(() => props.book.entries.filter((entry) => entry.enabled).length);
const owner = computed(
  () => state.characters.find((item) => item.id === props.book.characterId)?.name || "全局",
);
</script>

<template>
  <article class="library-card worldbook-card" :class="{ muted: !book.enabled }">
    <label class="switch-control" title="启用或停用整本世界书">
      <input v-model="book.enabled" type="checkbox" />
      <span></span>
    </label>
    <div>
      <strong>{{ book.name }}</strong>
      <small>{{ enabledEntries }}/{{ book.entries.length }} 条启用 · {{ owner }}</small>
    </div>
    <button type="button" @click="modalState.worldBookId = book.id">编辑条目</button>
  </article>
</template>
