<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import PhoneFrame from "./components/layout/PhoneFrame.vue";
import AuthGate from "./components/auth/AuthGate.vue";
import AuthSplash from "./components/auth/AuthSplash.vue";
import HomeView from "./components/home/HomeView.vue";
import ContactsView from "./components/contacts/ContactsView.vue";
import ChatView from "./components/chat/ChatView.vue";
import LibraryView from "./components/library/LibraryView.vue";
import PersonaView from "./components/persona/PersonaView.vue";
import SettingsView from "./components/settings/SettingsView.vue";
import AccountView from "./components/account/AccountView.vue";
import SyncCenterView from "./components/sync/SyncCenterView.vue";
import CharacterEditorModal from "./components/library/CharacterEditorModal.vue";
import WorldBookEditorModal from "./components/library/WorldBookEditorModal.vue";
import MessageEditorModal from "./components/chat/MessageEditorModal.vue";
import PromptPreviewModal from "./components/settings/PromptPreviewModal.vue";
import AppToast from "./components/common/AppToast.vue";
import {
  activeView,
  closeAllModals,
  initializeStore,
  modalState,
} from "./store/linePhone.js";
import {
  authState,
  destroyAuth,
  hasActiveAccess,
  initializeAuth,
} from "./services/auth.js";
import { initializeSync, stopSync } from "./services/sync.js";

const views = {
  home: HomeView,
  contacts: ContactsView,
  chat: ChatView,
  library: LibraryView,
  persona: PersonaView,
  settings: SettingsView,
  account: AccountView,
  sync: SyncCenterView,
};
const activeComponent = computed(() => views[activeView.value] || HomeView);
const localDataReady = ref(false);
let storeLoadVersion = 0;

watch(
  () => [hasActiveAccess.value, authState.user?.id],
  async ([allowed, userId]) => {
    const version = ++storeLoadVersion;
    localDataReady.value = false;
    if (!allowed || !userId) {
      stopSync();
      return;
    }
    await initializeStore(userId);
    if (version === storeLoadVersion) {
      localDataReady.value = true;
      await initializeSync(userId);
    }
  },
  { immediate: true },
);

function handleKeydown(event) {
  if (event.key === "Escape") closeAllModals();
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  initializeAuth();
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  destroyAuth();
  stopSync();
});
</script>

<template>
  <AuthGate v-if="!hasActiveAccess" />
  <AuthSplash v-else-if="!localDataReady" />
  <PhoneFrame v-else>
    <KeepAlive>
      <component :is="activeComponent" />
    </KeepAlive>
  </PhoneFrame>
  <template v-if="hasActiveAccess && localDataReady">
    <CharacterEditorModal v-if="modalState.characterId" />
    <WorldBookEditorModal v-if="modalState.worldBookId" />
    <MessageEditorModal v-if="modalState.messageId" />
    <PromptPreviewModal v-if="modalState.promptPreview" />
    <AppToast />
  </template>
</template>
