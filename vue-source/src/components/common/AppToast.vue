<script setup>
import { toastMessage } from "../../store/linePhone.js";
</script>

<template>
  <Transition name="toast">
    <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
  </Transition>
</template>
