<script setup>
import { computed } from "vue";
import AppAvatar from "../common/AppAvatar.vue";
import PageHeader from "../common/PageHeader.vue";
import {
  authState,
  signInWithDiscord,
  signOut,
} from "../../services/auth.js";

const name = computed(
  () => authState.profile?.discord_username || "Discord 用户",
);
const avatar = computed(
  () => authState.profile?.discord_avatar_url || "",
);
const validUntil = computed(() => {
  const value = authState.profile?.membership_valid_until;
  if (!value) return "等待验证";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
});
</script>

<template>
  <section class="view active account-view">
    <PageHeader title="账户" subtitle="Discord 身份与小手机访问状态。" />
    <article class="account-card">
      <div class="account-identity">
        <AppAvatar :src="avatar" :name="name" size="large" />
        <div>
          <small>DISCORD</small>
          <h2>{{ name }}</h2>
          <p><i></i> 已通过社区身份验证</p>
        </div>
      </div>
      <dl class="account-details">
        <div>
          <dt>账户状态</dt>
          <dd>{{ authState.profile?.status === "active" ? "已启用" : "待验证" }}</dd>
        </div>
        <div>
          <dt>验证有效期</dt>
          <dd>{{ validUntil }}</dd>
        </div>
        <div>
          <dt>本地资料</dt>
          <dd>已按当前账户隔离保存</dd>
        </div>
      </dl>
      <button class="wide-soft-button" type="button" @click="signInWithDiscord">
        重新验证 Discord
      </button>
      <button class="danger-button" type="button" @click="signOut">退出登录</button>
    </article>
  </section>
</template>
