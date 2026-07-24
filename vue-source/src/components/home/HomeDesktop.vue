<script setup>
import { computed, onUnmounted, ref } from "vue";
import HomeEditBar from "./HomeEditBar.vue";
import HomePage from "./HomePage.vue";
import HomePageDots from "./HomePageDots.vue";
import {
  homePages,
  moveHomeItemBefore,
  moveHomeItemToPage,
} from "../../composables/useHomeLayout.js";
import { exportBackup } from "../../composables/useSettings.js";
import { navigate } from "../../store/linePhone.js";

const activePage = ref(0);
const editing = ref(false);
const draggingId = ref("");
const gesture = ref(null);
let longPressTimer = null;
let edgeTimer = null;
let suppressClickUntil = 0;

const trackStyle = computed(() => ({
  transform: `translate3d(-${activePage.value * 100}%, 0, 0)`,
}));

function clearTimers() {
  window.clearTimeout(longPressTimer);
  window.clearTimeout(edgeTimer);
  longPressTimer = null;
  edgeTimer = null;
}

function releasePointer(current) {
  if (!current?.host?.hasPointerCapture?.(current.pointerId)) return;
  current.host.releasePointerCapture(current.pointerId);
}

function beginDrag(itemId) {
  if (!itemId) return;
  editing.value = true;
  draggingId.value = itemId;
  suppressClickUntil = Date.now() + 600;
  navigator.vibrate?.(20);
}

function pointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const item = event.target.closest("[data-home-item]");
  gesture.value = {
    pointerId: event.pointerId,
    host: event.currentTarget,
    itemId: item?.dataset.homeItem || "",
    startX: event.clientX,
    startY: event.clientY,
    x: event.clientX,
    y: event.clientY,
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
  clearTimers();
  if (editing.value && gesture.value.itemId) beginDrag(gesture.value.itemId);
  else if (gesture.value.itemId) {
    longPressTimer = window.setTimeout(() => beginDrag(gesture.value.itemId), 480);
  }
}

function scheduleEdgeMove(direction) {
  if (edgeTimer || !draggingId.value) return;
  const nextPage = activePage.value + direction;
  if (nextPage < 0 || nextPage >= homePages.value.length) return;
  edgeTimer = window.setTimeout(() => {
    activePage.value = nextPage;
    moveHomeItemToPage(draggingId.value, nextPage);
    edgeTimer = null;
  }, 360);
}

function pointerMove(event) {
  const current = gesture.value;
  if (!current || current.pointerId !== event.pointerId) return;
  current.x = event.clientX;
  current.y = event.clientY;
  const distance = Math.hypot(current.x - current.startX, current.y - current.startY);
  if (!draggingId.value && distance > 12) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if (!draggingId.value) return;

  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const targetItem = target?.closest("[data-home-item]")?.dataset.homeItem;
  if (targetItem && targetItem !== draggingId.value) {
    moveHomeItemBefore(draggingId.value, targetItem);
  }

  const bounds = event.currentTarget.getBoundingClientRect();
  window.clearTimeout(edgeTimer);
  edgeTimer = null;
  if (event.clientX < bounds.left + 42) scheduleEdgeMove(-1);
  else if (event.clientX > bounds.right - 42) scheduleEdgeMove(1);
}

function finishGesture(event) {
  const current = gesture.value;
  if (!current || current.pointerId !== event.pointerId) return;
  releasePointer(current);
  clearTimers();
  if (draggingId.value) {
    draggingId.value = "";
    suppressClickUntil = Date.now() + 450;
  } else {
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      const direction = dx < 0 ? 1 : -1;
      activePage.value = Math.min(
        homePages.value.length - 1,
        Math.max(0, activePage.value + direction),
      );
      suppressClickUntil = Date.now() + 350;
    }
  }
  gesture.value = null;
}

function cancelGesture() {
  const current = gesture.value;
  releasePointer(current);
  clearTimers();
  draggingId.value = "";
  gesture.value = null;
}

function guardClick(event) {
  if (event.target.closest("[data-edit-control]")) return;
  if (editing.value || Date.now() < suppressClickUntil) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function openItem(itemId) {
  if (editing.value || Date.now() < suppressClickUntil) return;
  const destinations = {
    messages: "contacts",
    contacts: "contacts",
    library: "library",
    persona: "persona",
    settings: "settings",
  };
  if (itemId === "backup") exportBackup();
  else if (destinations[itemId]) navigate(destinations[itemId]);
}

function finishEditing() {
  editing.value = false;
  draggingId.value = "";
}

onUnmounted(clearTimers);
</script>

<template>
  <div
    class="home-desktop"
    :class="{ editing }"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="finishGesture"
    @pointercancel="cancelGesture"
    @contextmenu.prevent
    @click.capture="guardClick"
  >
    <HomeEditBar :visible="editing" @done="finishEditing" />
    <div class="home-pages-viewport">
      <div class="home-pages-track" :style="trackStyle">
        <HomePage
          v-for="(page, index) in homePages"
          :key="index"
          :items="page"
          :page-index="index"
          :dragging-id="draggingId"
          @open="openItem"
        />
      </div>
    </div>
    <HomePageDots
      :count="homePages.length"
      :active="activePage"
      @select="activePage = $event"
    />
  </div>
</template>
