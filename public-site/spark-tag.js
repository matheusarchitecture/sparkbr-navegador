(function () {
  try {
    var id = window.SPARK_GTAG_ID || "";
    var ga = window.SPARK_GA_ID || "";
    if (!id && !ga) return;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga || id);
    document.head.appendChild(s);
    gtag("js", new Date());
    if (id) gtag("config", id);
    if (ga) gtag("config", ga);
    window.sparkTrack = function (ev, params) {
      try { gtag("event", ev, params || {}); } catch (e) {}
    };
  } catch (e) {}
})();
