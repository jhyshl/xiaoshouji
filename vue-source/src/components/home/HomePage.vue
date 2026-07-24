<script setup>
import HomeClock from "./HomeClock.vue";
import TodayWidget from "./TodayWidget.vue";
import RecentContact from "./RecentContact.vue";
import HomeAppIcon from "./HomeAppIcon.vue";
import MovableHomeItem from "./MovableHomeItem.vue";

defineProps({
  items: { type: Array, required: true },
  pageIndex: { type: Number, required: true },
  draggingId: { type: String, default: "" },
});
const emit = defineEmits(["open"]);

const apps = {
  messages: { glyph: "○", label: "消息" },
  contacts: { glyph: "⌕", label: "联系人" },
  library: { glyph: "⌘", label: "资料库" },
  persona: { glyph: "♙", label: "玩家人设" },
  account: { glyph: "◎", label: "账户" },
  sync: { glyph: "⇄", label: "同步中心" },
  settings: { glyph: "⌁", label: "设置" },
  backup: { glyph: "↗", label: "导出备份" },
};

function kindOf(itemId) {
  return ["clock", "today", "recent"].includes(itemId) ? "widget" : "app";
}
</script>

<template>
  <section class="home-page" :data-home-page="pageIndex" :aria-label="`桌面第 ${pageIndex + 1} 页`">
    <MovableHomeItem
      v-for="itemId in items"
      :key="itemId"
      :item-id="itemId"
      :kind="kindOf(itemId)"
      :dragging="draggingId === itemId"
    >
      <HomeClock v-if="itemId === 'clock'" />
      <TodayWidget v-else-if="itemId === 'today'" />
      <RecentContact v-else-if="itemId === 'recent'" />
      <HomeAppIcon
        v-else
        :glyph="apps[itemId].glyph"
        :label="apps[itemId].label"
        @open="emit('open', itemId)"
      />
    </MovableHomeItem>
  </section>
</template>
