<script setup>
import PageHeader from "../common/PageHeader.vue";
import ImportPanel from "./ImportPanel.vue";
import CharacterList from "./CharacterList.vue";
import WorldBookList from "./WorldBookList.vue";
import { state } from "../../store/linePhone.js";
</script>

<template>
  <section class="view active library-view">
    <PageHeader title="资料库" subtitle="导入之后可直接编辑；全部只保存在当前设备。" />
    <ImportPanel />
    <CharacterList :characters="state.characters" />
    <WorldBookList :books="state.worldBooks" />
  </section>
</template>
