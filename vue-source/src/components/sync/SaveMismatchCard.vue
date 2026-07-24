<script setup>
import { resolveSaveMismatch } from "../../composables/useBranches.js";

defineProps({
  character: { type: Object, required: true },
  mismatch: { type: Object, required: true },
});
</script>

<template>
  <article class="sync-card mismatch-card">
    <small>SAVE CHANGED</small>
    <h2>{{ character.name }} 检测到不同酒馆存档</h2>
    <p>
      酒馆现在是“{{ mismatch.remoteSaveName }}”。当前小手机分支与它的存档 ID 不一致，
      请选择本机如何处理；旧分支不会被删除。
    </p>
    <div class="mismatch-actions">
      <button
        v-if="mismatch.matchingBranchId"
        class="primary-button"
        type="button"
        @click="resolveSaveMismatch(character.id, 'switch')"
      >
        切换到已有分支
      </button>
      <button type="button" @click="resolveSaveMismatch(character.id, 'blank')">
        新建空白分支
      </button>
      <button type="button" @click="resolveSaveMismatch(character.id, 'continue')">
        沿用当前聊天
      </button>
    </div>
  </article>
</template>
