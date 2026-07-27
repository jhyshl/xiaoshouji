const APP_MODULE = "./index.js";
const ENTRY_ID = "linephone-sync-settings-entry";
const LAUNCHER_ID = "linephone-sync-launcher";
const VERSION = "1.1.3";

let appPromise = null;
let observer = null;
let retryTimer = null;

function loadApp() {
  if (!appPromise) {
    appPromise = import(APP_MODULE).catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

function showLoadError(error) {
  console.error("[linephone_sync] application failed to load", error);
  const message = `小手机同步加载失败：${error?.message || error || "未知错误"}`;
  if (globalThis.toastr?.error) {
    globalThis.toastr.error(message);
  } else {
    globalThis.alert?.(message);
  }
}

async function openPanel(event) {
  event?.preventDefault();
  event?.stopPropagation();
  try {
    const app = await loadApp();
    if (typeof app.openPanel !== "function") {
      throw new Error("控制面板入口不可用");
    }
    await app.openPanel();
  } catch (error) {
    showLoadError(error);
  }
}

function settingsHost() {
  return (
    document.querySelector("#extensions_settings") ||
    document.querySelector("#extensions_settings2")
  );
}

function mountLauncher() {
  let launcher = document.getElementById(LAUNCHER_ID);
  if (!launcher) {
    launcher = document.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.className = "lp-sync-launcher";
    launcher.type = "button";
    launcher.title = "小手机同步";
    launcher.textContent = "⇄";
  }
  if (launcher.dataset.linephoneBootstrapBound !== "true") {
    launcher.dataset.linephoneBootstrapBound = "true";
    launcher.addEventListener("click", openPanel);
  }
  if (!launcher.isConnected) {
    document.body.append(launcher);
  }
  return launcher;
}

function mountSettingsEntry() {
  const existing = document.getElementById(ENTRY_ID);
  if (existing?.isConnected) return existing;
  const host = settingsHost();
  if (!host) return null;
  const entry = document.createElement("div");
  entry.id = ENTRY_ID;
  entry.className =
    "extension_container lp-settings-entry linephone-sync-settings-entry";
  entry.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>LinePhone 小手机同步</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <p>同步当前角色、绑定世界书、聊天楼层和阶段总结。</p>
        <button type="button" class="menu_button" data-action="open-linephone">
          打开小手机同步控制面板
        </button>
      </div>
    </div>
  `;
  entry
    .querySelector("[data-action=open-linephone]")
    .addEventListener("click", openPanel);
  host.append(entry);
  return entry;
}

function mount() {
  if (!document.body) return false;
  mountLauncher();
  const entry = mountSettingsEntry();
  clearTimeout(retryTimer);
  retryTimer = null;
  if (!observer) {
    observer = new MutationObserver(() => {
      if (!document.getElementById(LAUNCHER_ID)) mountLauncher();
      if (!document.getElementById(ENTRY_ID)) mountSettingsEntry();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (!entry) {
    retryTimer = setTimeout(mount, 800);
  }
  return true;
}

function start() {
  if (mount()) return;
  document.addEventListener("DOMContentLoaded", mount, { once: true });
}

export async function onActivate() {
  start();
  return loadApp();
}

export async function onEnable() {
  start();
  return loadApp();
}

start();
Promise.resolve()
  .then(loadApp)
  .catch((error) => {
    console.warn(`[linephone_sync] v${VERSION} UI loaded; application is waiting`, error);
  });
