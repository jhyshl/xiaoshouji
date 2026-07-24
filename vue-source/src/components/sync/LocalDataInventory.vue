<script setup>
import { computed } from "vue";
import { branchesForCharacter, state } from "../../store/linePhone.js";

const totalMessages = computed(() =>
  Object.values(state.chatBranches).reduce(
    (sum, branch) => sum + (branch.messages?.length || 0),
    0,
  ),
);
</script>

<template>
  <article class="sync-card local-inventory-card">
    <header class="sync-card-heading">
      <div>
        <small>LOCAL STORAGE</small>
        <h2>这台设备保存的内容</h2>
      </div>
      <b>{{ totalMessages }} 条</b>
    </header>
    <dl class="sync-metrics">
      <div>
        <dt>角色</dt>
        <dd>{{ state.characters.length }}</dd>
      </div>
      <div>
        <dt>世界书</dt>
        <dd>{{ state.worldBooks.length }}</dd>
      </div>
      <div>
        <dt>聊天分支</dt>
        <dd>{{ Object.keys(state.chatBranches).length }}</dd>
      </div>
    </dl>
    <div v-if="state.characters.length" class="inventory-list">
      <section v-for="character in state.characters" :key="character.id">
        <strong>{{ character.name }}</strong>
        <span>
          {{ branchesForCharacter(character.id).length }} 个分支 ·
          {{
            branchesForCharacter(character.id).reduce(
              (sum, branch) => sum + branch.messages.length,
              0,
            )
          }}
          条气泡
        </span>
        <small>
          {{
            branchesForCharacter(character.id).filter((branch) => branch.tavernSaveId)
              .length
          }}
          个酒馆存档已绑定
        </small>
      </section>
    </div>
    <p v-else class="sync-empty">当前设备还没有导入角色。</p>
  </article>
</template>
