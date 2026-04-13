// Matomo (self-hosted) tracking
// Note: This file is loaded as an external script (no <script> tag needed).

var _paq = (window._paq = window._paq || []);
(function () {
  var u = "https://analytics.schellenberger.biz/";
  _paq.push(["setTrackerUrl", u + "matomo.php"]);
  _paq.push(["setSiteId", "36"]);
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);
  var d = document,
    g = d.createElement("script"),
    s = d.getElementsByTagName("script")[0];
  g.async = true;
  g.src = u + "matomo.js";
  s.parentNode.insertBefore(g, s);
})();
