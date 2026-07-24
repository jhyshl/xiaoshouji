<script setup>
import PageHeader from "../common/PageHeader.vue";
import ImportPanel from "./ImportPanel.vue";
import CharacterList from "./CharacterList.vue";
import WorldBookList from "./WorldBookList.vue";
import { state } from "../../store/linePhone.js";
</script>

<template>
  <section class="view active library-view">
    <PageHeader
      title="资料库"
      subtitle="支持本地导入，也会自动接收酒馆当前角色卡与绑定世界书。"
    />
    <ImportPanel />
    <CharacterList :characters="state.characters" />
    <WorldBookList :books="state.worldBooks" />
  </section>
</template>
