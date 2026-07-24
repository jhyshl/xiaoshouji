<script setup>
import { authState, signInWithDiscord } from "../../services/auth.js";
</script>

<template>
  <article class="auth-card">
    <div class="auth-brand">
      <span class="auth-mark">L</span>
      <div>
        <small>LINEPHONE</small>
        <h1>小手机</h1>
      </div>
    </div>
    <div class="auth-copy">
      <p>使用 Discord 身份进入</p>
      <h2>仅向指定社区成员开放</h2>
      <span>登录后会核验社区与身份组，不会读取或保存你的 Discord 密码。</span>
    </div>
    <p v-if="authState.errorMessage" class="auth-error">{{ authState.errorMessage }}</p>
    <button
      class="discord-button"
      type="button"
      :disabled="authState.busy"
      @click="signInWithDiscord"
    >
      <span>◌</span>
      {{ authState.busy ? "正在跳转…" : "使用 Discord 登录" }}
    </button>
    <small class="auth-footnote">登录即表示你同意在本机保存小手机数据。</small>
  </article>
</template>
