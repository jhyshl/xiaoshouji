<script setup>
import PageHeader from "../common/PageHeader.vue";
import PersonaAvatarPicker from "./PersonaAvatarPicker.vue";
import PersonaForm from "./PersonaForm.vue";
</script>

<template>
  <section class="view active persona-view">
    <PageHeader title="玩家人设" subtitle="独立管理你的称呼、头像和长期设定。" />
    <PersonaAvatarPicker />
    <PersonaForm />
  </section>
</template>
