<script setup>
import PageHeader from "../common/PageHeader.vue";
import ApiSettings from "./ApiSettings.vue";
import GenerationSettings from "./GenerationSettings.vue";
import SystemPromptEditor from "./SystemPromptEditor.vue";
import ReplyRulesEditor from "./ReplyRulesEditor.vue";
import BackupPanel from "./BackupPanel.vue";
import { showToast } from "../../store/linePhone.js";
</script>

<template>
  <section class="view active settings-view">
    <PageHeader title="设置" subtitle="API、上下文、提示词和本地数据管理。" />
    <ApiSettings />
    <GenerationSettings />
    <SystemPromptEditor />
    <ReplyRulesEditor />
    <BackupPanel />
    <button class="primary-button full-button settings-save" type="button" @click="showToast('设置已保存在本机')">
      保存设置
    </button>
  </section>
</template>
