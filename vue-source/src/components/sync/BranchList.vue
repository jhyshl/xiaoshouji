<script setup>
import { computed, ref } from "vue";
import {
  createChatBranch,
  renameChatBranch,
  switchChatBranch,
} from "../../composables/useBranches.js";
import {
  branchesForCharacter,
  state,
} from "../../store/linePhone.js";

const props = defineProps({ character: { type: Object, required: true } });
const draftTitle = ref("");
const branches = computed(() => branchesForCharacter(props.character.id));

function addBranch() {
  const branch = createChatBranch({
    characterId: props.character.id,
    title: draftTitle.value || "新的空白聊天",
  });
  draftTitle.value = "";
  return branch;
}

function rename(branch) {
  const value = window.prompt("分支名称", branch.title);
  if (value) renameChatBranch(branch.id, value);
}
</script>

<template>
  <article class="sync-card branch-card">
    <header class="sync-card-heading">
      <div>
        <small>CHAT BRANCHES</small>
        <h2>{{ character.name }}</h2>
      </div>
      <b>{{ branches.length }}</b>
    </header>
    <div class="branch-list">
      <section
        v-for="branch in branches"
        :key="branch.id"
        :class="{ active: state.activeBranchIds[character.id] === branch.id }"
      >
        <button type="button" class="branch-main" @click="switchChatBranch(character.id, branch.id)">
          <span>
            <strong>{{ branch.title }}</strong>
            <small>
              {{ branch.messages.length }} 条气泡 ·
              {{ branch.tavernSaveId ? "已绑定酒馆存档" : "小手机独立分支" }}
            </small>
          </span>
          <b>{{ state.activeBranchIds[character.id] === branch.id ? "使用中" : "切换" }}</b>
        </button>
        <button type="button" class="branch-edit" @click="rename(branch)">编辑</button>
      </section>
    </div>
    <label class="sync-inline-field branch-create">
      <input v-model.trim="draftTitle" maxlength="80" placeholder="新分支名称（可选）" />
      <button type="button" @click="addBranch">新建空白分支</button>
    </label>
  </article>
</template>
