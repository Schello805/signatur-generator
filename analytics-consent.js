const CONSENT_KEY = "signaturgenerator:analytics-consent:v1";
let wired = false;
let memoryConsent = null;

function $(id) {
  return document.getElementById(id);
}

function getConsent() {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    if (v === "yes" || v === "no") return v;
  } catch {
    // Some privacy modes can block localStorage; fall back to in-memory consent for this session.
  }
  if (memoryConsent === "yes" || memoryConsent === "no") return memoryConsent;
  return null;
}

function setConsent(value) {
  memoryConsent = value;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

function showBar() {
  const bar = $("analyticsConsent");
  if (!bar) return;
  bar.hidden = false;
  document.body.classList.add("consent-visible");
}

function hideBar() {
  const bar = $("analyticsConsent");
  if (!bar) return;
  bar.hidden = true;
  document.body.classList.remove("consent-visible");
}

function loadMatomo() {
  if (window.__sgMatomoLoaded) return;
  window.__sgMatomoLoaded = true;

  const u = "https://analytics.schellenberger.biz/";
  const _paq = (window._paq = window._paq || []);
  _paq.push(["setTrackerUrl", u + "matomo.php"]);
  _paq.push(["setSiteId", "36"]);
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);

  const d = document;
  const g = d.createElement("script");
  const s = d.getElementsByTagName("script")[0];
  g.async = true;
  g.src = u + "matomo.js";
  s?.parentNode?.insertBefore?.(g, s);
  if (!s) d.head.appendChild(g);
}

function wireUi() {
  if (wired) return true;
  const accept = $("consentAccept");
  const decline = $("consentDecline");
  if (!accept || !decline) return false;
  accept.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      setConsent("yes");
    } finally {
      hideBar();
      loadMatomo();
    }
  });
  decline.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      setConsent("no");
    } finally {
      hideBar();
    }
  });

  // Fallback: event delegation (in case markup is re-rendered in the future).
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "consentAccept") {
      e.preventDefault();
      try {
        setConsent("yes");
      } finally {
        hideBar();
        loadMatomo();
      }
    }
    if (t.id === "consentDecline") {
      e.preventDefault();
      try {
        setConsent("no");
      } finally {
        hideBar();
      }
    }
  });
  wired = true;
  return true;
}

function main() {
  // The consent markup is placed at the end of <body> on some pages.
  // Ensure handlers are wired only after the DOM is fully parsed.
  wireUi();
  const consent = getConsent();
  if (consent === "yes") {
    hideBar();
    loadMatomo();
    return;
  }
  if (consent === "no") {
    hideBar();
    return;
  }
  // Dezent: erst nach kurzem Delay einblenden.
  window.setTimeout(() => {
    wireUi();
    showBar();
  }, 900);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main, { once: true });
} else {
  main();
}
