const APP_VERSION_META = document.querySelector('meta[name="app-version"]');
const APP_VERSION = (APP_VERSION_META?.getAttribute("content") || "").trim() || "dev";

const INFO_EL = document.getElementById("pwaInfo");

function setInfoHtml(html) {
  if (!INFO_EL) return;
  INFO_EL.innerHTML = html;
}

function isPwaCapable() {
  return "serviceWorker" in navigator && window.isSecureContext;
}

function showNotSupportedHint() {
  // File:// or non-secure contexts can't use service workers.
  if (!INFO_EL) return;
  if (!("serviceWorker" in navigator)) return;
  if (window.isSecureContext) return;
  setInfoHtml(`<span class="pwa-muted">PWA: Service Worker nur über HTTPS/localhost.</span>`);
}

async function registerServiceWorker() {
  if (!isPwaCapable()) {
    showNotSupportedHint();
    return null;
  }

  const reg = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });

  // If there is an update waiting already (e.g. after refresh).
  if (reg.waiting && navigator.serviceWorker.controller) {
    setInfoHtml(
      `<a href="#" class="pwa-link" data-action="pwa-update">Update installieren</a>`
    );
  }

  reg.addEventListener("updatefound", () => {
    const sw = reg.installing;
    if (!sw) return;

    sw.addEventListener("statechange", () => {
      // When a new SW is installed and there's already a controller, it's an update.
      if (sw.state === "installed" && navigator.serviceWorker.controller) {
        setInfoHtml(
          `<a href="#" class="pwa-link" data-action="pwa-update">Update installieren</a>`
        );
      }
    });
  });

  // When SW takes control, refresh to load fresh assets.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });

  return reg;
}

async function applyUpdate(reg) {
  if (!reg?.waiting) return;
  reg.waiting.postMessage({ type: "SKIP_WAITING", version: APP_VERSION });
}

async function checkForUpdate(reg) {
  try {
    await reg?.update?.();
  } catch {
    // ignore
  }
}

let _registration = null;
registerServiceWorker()
  .then((reg) => {
    _registration = reg;
    // Periodic update check (best-effort).
    window.setTimeout(() => checkForUpdate(reg), 8_000);
    window.setInterval(() => checkForUpdate(reg), 60 * 60 * 1000);
  })
  .catch(() => {
    showNotSupportedHint();
  });

document.addEventListener("click", (e) => {
  const a = e.target?.closest?.("a[data-action='pwa-update']");
  if (!a) return;
  e.preventDefault();
  applyUpdate(_registration);
});

