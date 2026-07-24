import { computed } from "vue";
import { state } from "../store/linePhone.js";

export const homePages = computed(() => state.homeLayout.pages);

function locate(itemId) {
  for (let pageIndex = 0; pageIndex < state.homeLayout.pages.length; pageIndex += 1) {
    const itemIndex = state.homeLayout.pages[pageIndex].indexOf(itemId);
    if (itemIndex >= 0) return { pageIndex, itemIndex };
  }
  return null;
}

function removeItem(itemId) {
  const location = locate(itemId);
  if (!location) return null;
  state.homeLayout.pages[location.pageIndex].splice(location.itemIndex, 1);
  return location;
}

export function moveHomeItemBefore(itemId, targetId) {
  if (itemId === targetId) return;
  const target = locate(targetId);
  if (!target) return;
  removeItem(itemId);
  const refreshedTarget = locate(targetId);
  if (!refreshedTarget) return;
  state.homeLayout.pages[refreshedTarget.pageIndex].splice(
    refreshedTarget.itemIndex,
    0,
    itemId,
  );
}

export function moveHomeItemToPage(itemId, pageIndex) {
  const pages = state.homeLayout.pages;
  if (!pages[pageIndex]) return;
  const current = locate(itemId);
  if (current?.pageIndex === pageIndex) return;
  removeItem(itemId);
  pages[pageIndex].push(itemId);
}
