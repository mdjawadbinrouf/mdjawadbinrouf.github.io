// Small enhancements for the one page site: menu, filters, summaries toggle, photo viewer, current section.
(function () {
  "use strict";

  // Mobile menu
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  // Filter chips
  var state = { exp: "all", area: "all", status: "all" };

  function press(group, value) {
    document.querySelectorAll('.chip[data-filter-group="' + group + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.filter === value));
    });
  }

  function applyExperience() {
    document.querySelectorAll('[data-filter-target="exp"] .card').forEach(function (c) {
      var tags = (c.dataset.tags || "").split(" ");
      c.hidden = !(state.exp === "all" || tags.indexOf(state.exp) !== -1);
    });
  }

  function applyResearch() {
    var shown = 0;
    document.querySelectorAll('[data-filter-target="research"] .pub').forEach(function (p) {
      var ok = (state.area === "all" || p.dataset.area === state.area) &&
               (state.status === "all" || p.dataset.status === state.status);
      p.hidden = !ok;
      if (ok) shown++;
    });
    var empty = document.querySelector("#research .empty");
    if (empty) empty.hidden = shown !== 0;
  }

  document.querySelectorAll(".chip[data-filter-group]").forEach(function (b) {
    b.addEventListener("click", function () {
      var g = b.dataset.filterGroup;
      state[g] = b.dataset.filter;
      press(g, state[g]);
      if (g === "exp") applyExperience(); else applyResearch();
    });
  });

  // Plain summaries switch
  var sw = document.getElementById("summary-switch");
  var pubs = document.querySelector(".pubs");
  if (sw && pubs) {
    sw.addEventListener("click", function () {
      var on = sw.getAttribute("aria-pressed") === "true";
      sw.setAttribute("aria-pressed", String(!on));
      pubs.classList.toggle("hide-summaries", on);
    });
  }

  // Photo viewer
  var box = document.getElementById("lightbox");
  if (box && typeof box.showModal === "function") {
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-full]"));
    var img = box.querySelector("img");
    var cap = box.querySelector("figcaption");
    var idx = 0;
    var opener = null;

    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx];
      img.src = it.dataset.full;
      img.alt = (it.querySelector("img") || {}).alt || "";
      cap.textContent = it.dataset.caption || "";
    }

    items.forEach(function (it, i) {
      it.addEventListener("click", function () {
        opener = it;
        show(i);
        box.showModal();
      });
    });
    box.querySelector(".lb-close").addEventListener("click", function () { box.close(); });
    box.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    box.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    box.addEventListener("close", function () { if (opener) opener.focus(); });
  }

  // Highlight the section in view
  if ("IntersectionObserver" in window && nav) {
    var links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && links[en.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-current"); });
          links[en.target.id].classList.add("is-current");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }
})();
