<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import PhoneFrame from "./components/layout/PhoneFrame.vue";
import HomeView from "./components/home/HomeView.vue";
import ContactsView from "./components/contacts/ContactsView.vue";
import ChatView from "./components/chat/ChatView.vue";
import LibraryView from "./components/library/LibraryView.vue";
import PersonaView from "./components/persona/PersonaView.vue";
import SettingsView from "./components/settings/SettingsView.vue";
import CharacterEditorModal from "./components/library/CharacterEditorModal.vue";
import WorldBookEditorModal from "./components/library/WorldBookEditorModal.vue";
import MessageEditorModal from "./components/chat/MessageEditorModal.vue";
import PromptPreviewModal from "./components/settings/PromptPreviewModal.vue";
import AppToast from "./components/common/AppToast.vue";
import { activeView, closeAllModals, modalState } from "./store/linePhone.js";

const views = {
  home: HomeView,
  contacts: ContactsView,
  chat: ChatView,
  library: LibraryView,
  persona: PersonaView,
  settings: SettingsView,
};
const activeComponent = computed(() => views[activeView.value] || HomeView);

function handleKeydown(event) {
  if (event.key === "Escape") closeAllModals();
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <PhoneFrame>
    <KeepAlive>
      <component :is="activeComponent" />
    </KeepAlive>
  </PhoneFrame>
  <CharacterEditorModal v-if="modalState.characterId" />
  <WorldBookEditorModal v-if="modalState.worldBookId" />
  <MessageEditorModal v-if="modalState.messageId" />
  <PromptPreviewModal v-if="modalState.promptPreview" />
  <AppToast />
</template>
