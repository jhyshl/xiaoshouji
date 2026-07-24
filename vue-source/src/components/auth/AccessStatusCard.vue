<script setup>
import { computed } from "vue";
import {
  authState,
  signInWithDiscord,
  signOut,
} from "../../services/auth.js";
import AppAvatar from "../common/AppAvatar.vue";

const name = computed(
  () =>
    authState.profile?.discord_username ||
    authState.user?.user_metadata?.full_name ||
    "Discord 用户",
);
const avatar = computed(
  () =>
    authState.profile?.discord_avatar_url ||
    authState.user?.user_metadata?.avatar_url ||
    "",
);
const statusCopy = computed(() => {
  if (authState.verifying) return "正在核验社区和身份组…";
  if (authState.profile?.status === "suspended") return "账户已暂停";
  if (authState.profile?.status === "rejected") return "账户未获准";
  if (authState.profile?.status === "pending") return "账户暂未启用";
  return "需要重新验证 Discord";
});
</script>

<template>
  <article class="auth-card">
    <div class="auth-profile">
      <AppAvatar :src="avatar" :name="name" size="large" />
      <div>
        <small>DISCORD ACCOUNT</small>
        <h1>{{ name }}</h1>
        <p>{{ statusCopy }}</p>
      </div>
    </div>

    <p v-if="authState.errorMessage" class="auth-error">{{ authState.errorMessage }}</p>
    <p v-else class="auth-notice">
      重新授权后，小手机会再次检查你是否仍在指定社区并拥有所需身份组。
    </p>

    <button
      class="discord-button"
      type="button"
      :disabled="authState.busy || authState.verifying"
      @click="signInWithDiscord"
    >
      {{ authState.verifying ? "验证中…" : "重新验证 Discord" }}
    </button>
    <button class="auth-text-button" type="button" :disabled="authState.busy" @click="signOut">
      退出当前账户
    </button>
  </article>
</template>
