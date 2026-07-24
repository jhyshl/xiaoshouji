<script setup>
import HomeClock from "./HomeClock.vue";
import TodayWidget from "./TodayWidget.vue";
import HomeAppGrid from "./HomeAppGrid.vue";
import RecentContact from "./RecentContact.vue";
import QuickDock from "./QuickDock.vue";
</script>

<template>
  <section class="view active home-screen">
    <div class="home-wallpaper">
      <div class="wallpaper-branch" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i>
      </div>
      <HomeClock />
      <TodayWidget />
      <HomeAppGrid />
      <RecentContact />
      <QuickDock />
    </div>
  </section>
</template>
