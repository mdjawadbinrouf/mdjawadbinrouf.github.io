// Menu, filters, description voices, photo viewer, current section and scroll reveal.
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Mobile menu
  var menu = $(".nav-menu"), links = $("#nav-links");
  function closeMenu() { menu.setAttribute("aria-expanded", "false"); links.classList.remove("open"); }
  if (menu && links) {
    menu.addEventListener("click", function () {
      var open = menu.getAttribute("aria-expanded") === "true";
      menu.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("open", !open);
    });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  // Filters and voices
  var state = { exp: "all", voice: "plain", area: "all", status: "all" };

  function apply(group) {
    if (group === "exp") {
      $$("#exp-grid .xp").forEach(function (c) {
        c.hidden = !(state.exp === "all" || (c.dataset.tags || "").split(" ").indexOf(state.exp) !== -1);
      });
    } else if (group === "voice") {
      $$("#exp-grid .desc").forEach(function (p) {
        var t = p.getAttribute("data-" + state.voice);
        if (t) p.textContent = t;
      });
    } else {
      var shown = 0;
      $$("#pub-list .pub").forEach(function (p) {
        var ok = (state.area === "all" || p.dataset.area === state.area) &&
                 (state.status === "all" || p.dataset.status === state.status);
        p.hidden = !ok;
        if (ok) shown++;
      });
      $(".pub-empty").hidden = shown > 0;
    }
  }

  $$(".chip[data-group]").forEach(function (b) {
    b.addEventListener("click", function () {
      var g = b.dataset.group;
      state[g] = b.dataset.value;
      $$('.chip[data-group="' + g + '"]').forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      apply(g);
    });
  });

  // Photo viewer
  var lb = $("#lightbox");
  if (lb) {
    var items = $$(".zoom[data-full]");
    var img = $("img", lb), cap = $("figcaption", lb), idx = 0, opener = null;
    var show = function (i) {
      idx = (i + items.length) % items.length;
      img.src = items[idx].dataset.full;
      img.alt = items[idx].dataset.caption || "";
      cap.textContent = items[idx].dataset.caption || "";
    };
    var close = function () { lb.hidden = true; document.body.classList.remove("lb-open"); if (opener) opener.focus(); };
    items.forEach(function (it, i) {
      it.addEventListener("click", function () {
        opener = it; show(i); lb.hidden = false; document.body.classList.add("lb-open"); $(".lb-close", lb).focus();
      });
    });
    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", function () { show(idx - 1); });
    $(".lb-next", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  if (!("IntersectionObserver" in window)) return;

  // Current section in the nav
  var map = {};
  $$('#nav-links a[href^="#"]').forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
  var navObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && map[en.target.id]) {
        Object.keys(map).forEach(function (k) { map[k].classList.remove("active"); });
        map[en.target.id].classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) navObs.observe(s); });

  // Gentle reveal on scroll
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var revObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("visible"); revObs.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$(".sec-head, .news li, .card, .pub, .row, .skill, .personal > div").forEach(function (el) {
    if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("reveal"); revObs.observe(el); }
  });
})();
