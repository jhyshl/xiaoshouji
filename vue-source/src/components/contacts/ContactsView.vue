<script setup>
import { computed, ref } from "vue";
import PageHeader from "../common/PageHeader.vue";
import ContactSearch from "./ContactSearch.vue";
import ContactList from "./ContactList.vue";
import { lastActivity, navigate, state } from "../../store/linePhone.js";

const query = ref("");
const characters = computed(() => {
  const clean = query.value.trim().toLowerCase();
  return state.characters
    .filter((item) => item.name.toLowerCase().includes(clean))
    .slice()
    .sort((a, b) => lastActivity(b.id) - lastActivity(a.id));
});
</script>

<template>
  <section class="view active contacts-view">
    <PageHeader title="消息" subtitle="每个角色拥有独立聊天与记忆。">
      <button class="header-action" type="button" @click="navigate('library')">＋</button>
    </PageHeader>
    <ContactSearch v-model="query" />
    <ContactList :characters="characters" :searching="Boolean(query.trim())" />
  </section>
</template>
