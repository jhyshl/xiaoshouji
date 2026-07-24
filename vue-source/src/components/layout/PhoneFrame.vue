<script setup>
import StatusBar from "./StatusBar.vue";
import BottomNav from "./BottomNav.vue";
</script>

<template>
  <div class="device-shell">
    <div class="device-frame">
      <span class="device-speaker" aria-hidden="true"></span>
      <div class="app-shell">
        <StatusBar />
        <main class="app-main">
          <slot />
        </main>
        <BottomNav />
      </div>
    </div>
  </div>
</template>
