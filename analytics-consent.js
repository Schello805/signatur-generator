const CONSENT_KEY = "signaturgenerator:analytics-consent:v1";

function $(id) {
  return document.getElementById(id);
}

function getConsent() {
  const v = window.localStorage.getItem(CONSENT_KEY);
  if (v === "yes" || v === "no") return v;
  return null;
}

function setConsent(value) {
  window.localStorage.setItem(CONSENT_KEY, value);
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
  const accept = $("consentAccept");
  const decline = $("consentDecline");
  if (accept) {
    accept.addEventListener("click", () => {
      setConsent("yes");
      hideBar();
      loadMatomo();
    });
  }
  if (decline) {
    decline.addEventListener("click", () => {
      setConsent("no");
      hideBar();
    });
  }
}

function main() {
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
  window.setTimeout(showBar, 900);
}

main();

