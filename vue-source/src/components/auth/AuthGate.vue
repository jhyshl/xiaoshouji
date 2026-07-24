<script setup>
import { authState } from "../../services/auth.js";
import AccessStatusCard from "./AccessStatusCard.vue";
import AuthSplash from "./AuthSplash.vue";
import DiscordLoginCard from "./DiscordLoginCard.vue";
</script>

<template>
  <AuthSplash v-if="!authState.initialized || authState.verifying" />
  <div v-else class="auth-screen">
    <AccessStatusCard v-if="authState.user" />
    <DiscordLoginCard v-else />
  </div>
</template>
