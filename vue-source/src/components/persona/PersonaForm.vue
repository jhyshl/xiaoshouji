<script setup>
import { state, showToast } from "../../store/linePhone.js";
</script>

<template>
  <form class="settings-card persona-form" @submit.prevent="showToast('玩家人设已保存在本机')">
    <label class="field-row">
      <span><strong>玩家称呼</strong><small>角色在聊天中如何称呼你。</small></span>
      <input v-model="state.profile.name" type="text" maxlength="40" />
    </label>
    <label class="stacked-field">
      <span><strong>玩家人设</strong><small>这里的内容会通过 <code v-pre>{{player_persona}}</code> 注入系统提示词。</small></span>
      <textarea
        v-model="state.profile.persona"
        rows="14"
        placeholder="外貌、性格、经历、与角色的关系，以及希望 AI 一直记住的信息……"
      ></textarea>
    </label>
    <button class="primary-button full-button" type="submit">保存玩家人设</button>
  </form>
</template>
