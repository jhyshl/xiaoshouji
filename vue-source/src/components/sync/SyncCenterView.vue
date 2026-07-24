<script setup>
import { computed, ref } from "vue";
import PageHeader from "../common/PageHeader.vue";
import DeviceStatusCard from "./DeviceStatusCard.vue";
import LocalDataInventory from "./LocalDataInventory.vue";
import CloudStateCard from "./CloudStateCard.vue";
import SaveMismatchCard from "./SaveMismatchCard.vue";
import BranchList from "./BranchList.vue";
import { bindTavernCharacter } from "../../composables/useBranches.js";
import { state } from "../../store/linePhone.js";

const bindingDrafts = ref({});
const tavernAssets = computed(() =>
  Object.entries(state.sync.tavernInbox)
    .map(([key, inbox]) => ({
      key,
      name:
        inbox.character?.card?.name ||
        inbox.active?.characterName ||
        inbox.characterName ||
        "未命名酒馆角色",
      cardSynced: Boolean(inbox.character?.card),
      bookCount: inbox.assembledLorebooks?.length || inbox.lorebooks?.books?.length || 0,
      entryCount: (inbox.assembledLorebooks || []).reduce(
        (sum, book) => sum + (book.entries?.length || 0),
        0,
      ),
    }))
    .filter((item) => item.cardSynced || item.bookCount),
);
const unboundTavernCharacters = computed(() =>
  Object.entries(state.sync.tavernInbox)
    .filter(([key]) => !state.sync.characterBindings[key])
    .map(([key, inbox]) => ({
      key,
      name:
        inbox.active?.characterName ||
        inbox.characterName ||
        "未命名酒馆角色",
      saveName: inbox.active?.saveName || "当前存档",
    })),
);
const mismatches = computed(() =>
  Object.entries(state.sync.mismatches)
    .map(([characterId, mismatch]) => ({
      character: state.characters.find((item) => item.id === characterId),
      mismatch,
    }))
    .filter((item) => item.character),
);

function bind(item) {
  const characterId = bindingDrafts.value[item.key];
  if (bindTavernCharacter(item.key, characterId)) {
    delete bindingDrafts.value[item.key];
  }
}
</script>

<template>
  <section class="view active sync-view">
    <PageHeader title="同步中心" subtitle="查看本机内容、酒馆存档和多端最新状态。" />
    <DeviceStatusCard />
    <article v-if="tavernAssets.length" class="sync-card tavern-assets-card">
      <header class="sync-card-heading">
        <div>
          <small>TAVERN ASSETS</small>
          <h2>酒馆资料同步</h2>
        </div>
      </header>
      <section v-for="item in tavernAssets" :key="item.key">
        <span>
          <strong>{{ item.name }}</strong>
          <small>
            {{ item.cardSynced ? "角色卡已同步" : "等待角色卡" }} ·
            {{ item.bookCount }} 本世界书 · {{ item.entryCount }} 个条目
          </small>
        </span>
      </section>
    </article>
    <SaveMismatchCard
      v-for="item in mismatches"
      :key="item.character.id"
      :character="item.character"
      :mismatch="item.mismatch"
    />
    <article v-if="unboundTavernCharacters.length" class="sync-card binding-card">
      <header class="sync-card-heading">
        <div>
          <small>CHARACTER BINDING</small>
          <h2>绑定酒馆角色</h2>
        </div>
      </header>
      <section v-for="item in unboundTavernCharacters" :key="item.key">
        <span>
          <strong>{{ item.name }}</strong>
          <small>{{ item.saveName }}</small>
        </span>
        <select v-model="bindingDrafts[item.key]">
          <option value="">选择小手机角色</option>
          <option v-for="character in state.characters" :key="character.id" :value="character.id">
            {{ character.name }}
          </option>
        </select>
        <button type="button" :disabled="!bindingDrafts[item.key]" @click="bind(item)">绑定</button>
      </section>
    </article>
    <LocalDataInventory />
    <CloudStateCard />
    <BranchList
      v-for="character in state.characters"
      :key="character.id"
      :character="character"
    />
  </section>
</template>
