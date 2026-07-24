<script setup>
import { computed, reactive } from "vue";
import BaseModal from "../common/BaseModal.vue";
import WorldBookEntryEditor from "./WorldBookEntryEditor.vue";
import {
  addWorldBookEntry,
  deleteWorldBook,
  saveWorldBook,
} from "../../composables/useLibrary.js";
import { modalState, state } from "../../store/linePhone.js";

const source = computed(() =>
  state.worldBooks.find((item) => item.id === modalState.worldBookId),
);
const draft = reactive(JSON.parse(JSON.stringify(source.value)));
</script>

<template>
  <BaseModal title="编辑世界书" wide @close="modalState.worldBookId = null">
    <form @submit.prevent="saveWorldBook(draft)">
      <label class="modal-field"><span>世界书名称</span><input v-model="draft.name" required /></label>
      <label class="toggle-row">
        <span><strong>启用整本世界书</strong><small>关闭后所有条目都不会注入。</small></span>
        <span class="switch-control"><input v-model="draft.enabled" type="checkbox" /><span></span></span>
      </label>
      <div class="worldbook-entry-list">
        <WorldBookEntryEditor
          v-for="(entry, index) in draft.entries"
          :key="entry.id"
          :entry="entry"
          :index="index"
          @delete="draft.entries.splice(index, 1)"
        />
      </div>
      <button class="soft-button full-button" type="button" @click="addWorldBookEntry(draft)">＋ 添加条目</button>
      <div class="modal-actions split-actions">
        <button class="danger-button" type="button" @click="deleteWorldBook(draft.id)">删除世界书</button>
        <button class="primary-button" type="submit">保存世界书</button>
      </div>
    </form>
  </BaseModal>
</template>
