const DEVICE_KEY = "linephone.sync.device.v1";

function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return "pwa";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

function defaultDeviceName(platform) {
  const labels = {
    pwa: "小手机 PWA",
    ios: "iPhone / iPad",
    android: "Android 手机",
    web: "网页设备",
  };
  return labels[platform] || "小手机设备";
}

export function getDeviceIdentity() {
  const platform = detectPlatform();
  try {
    const saved = JSON.parse(localStorage.getItem(DEVICE_KEY) || "null");
    if (saved?.id) {
      return {
        id: saved.id,
        name: saved.name || defaultDeviceName(platform),
        platform: saved.platform || platform,
      };
    }
  } catch {
    // Recreate malformed local metadata.
  }
  const device = {
    id: crypto.randomUUID(),
    name: defaultDeviceName(platform),
    platform,
  };
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  return device;
}

export function renameLocalDevice(name) {
  const device = getDeviceIdentity();
  const clean = String(name || "").trim().slice(0, 80);
  if (!clean) return device;
  const next = { ...device, name: clean };
  localStorage.setItem(DEVICE_KEY, JSON.stringify(next));
  return next;
}
