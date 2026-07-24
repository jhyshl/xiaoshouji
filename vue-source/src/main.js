import { createApp } from "vue";
import App from "./App.vue";
import { startPersistence } from "./store/linePhone.js";
import "./styles/main.css";

startPersistence();
createApp(App).mount("#app");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
