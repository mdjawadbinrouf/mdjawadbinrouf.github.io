// Hero: an interactive power grid drawn behind the introduction.
// Power stations send energy pulses along transmission lines to substations.
// Moving the pointer draws demand: pulses route toward the substation nearest the pointer.
// Clicking the hero, or the "Add rooftop solar" button, connects a new solar site.
// This is an illustration, not a model of a real grid.
(function () {
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("grid");
  if (!hero || !canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0;
  var nodes = [], edges = [], pulses = [];
  var pointer = null, target = null;
  var solarCount = 0;
  var counter = document.getElementById("solar-count");
  var COLORS = { station: "#f4b63f", sub: "#a9a4ff", solar: "#5fd4c8", line: "rgba(169,164,255,0.22)" };

  var seed = 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function addEdge(a, b) {
    if (a === b) return;
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return;
    }
    edges.push({ a: a, b: b });
    nodes[a].links.push(b);
    nodes[b].links.push(a);
  }

  function nearest(x, y, count, skip) {
    return nodes
      .map(function (n, i) { return { i: i, d: Math.hypot(n.x - x, n.y - y) }; })
      .filter(function (o) { return o.i !== skip; })
      .sort(function (p, q) { return p.d - q.d; })
      .slice(0, count)
      .map(function (o) { return o.i; });
  }

  function build() {
    seed = 7;
    nodes = []; edges = []; pulses = []; solarCount = 0;
    var cols = w < 700 ? 4 : 7, rows = 4;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = (c + 0.5 + (rand() - 0.5) * 0.7) * (w / cols);
        var y = (r + 0.5 + (rand() - 0.5) * 0.6) * (h / rows);
        nodes.push({ x: x, y: y, type: "sub", links: [], glow: 0 });
      }
    }
    var stations = w < 700 ? 3 : 5;
    for (var s = 0; s < stations; s++) {
      nodes[Math.floor(rand() * nodes.length)].type = "station";
    }
    nodes.forEach(function (n, i) {
      nearest(n.x, n.y, 2, i).forEach(function (j) { addEdge(i, j); });
    });
    updateCounter();
  }

  function addSolar(x, y) {
    if (solarCount >= 14) return;
    var near = nearest(x, y, 2, -1);
    nodes.push({ x: x, y: y, type: "solar", links: [], glow: 1 });
    var i = nodes.length - 1;
    near.forEach(function (j) { addEdge(i, j); });
    solarCount++;
    updateCounter();
    if (reduce) draw(0);
  }

  function updateCounter() {
    if (!counter) return;
    counter.textContent = solarCount === 0
      ? "No rooftop solar connected yet."
      : solarCount + (solarCount === 1 ? " rooftop solar site" : " rooftop solar sites") + " connected.";
  }

  function nextHop(from, prev) {
    var n = nodes[from];
    var options = n.links.filter(function (j) { return j !== prev; });
    if (!options.length) options = n.links;
    if (target !== null && rand() < 0.75) {
      var t = nodes[target];
      options.sort(function (a, b) {
        return Math.hypot(nodes[a].x - t.x, nodes[a].y - t.y) - Math.hypot(nodes[b].x - t.x, nodes[b].y - t.y);
      });
      return options[0];
    }
    return options[Math.floor(rand() * options.length)];
  }

  function spawn() {
    var sources = [];
    nodes.forEach(function (n, i) { if (n.type !== "sub") sources.push(i); });
    if (!sources.length) return;
    var from = sources[Math.floor(rand() * sources.length)];
    var to = nextHop(from, -1);
    if (to === undefined) return;
    pulses.push({ from: from, to: to, t: 0, hops: 0, color: nodes[from].type === "solar" ? COLORS.solar : COLORS.station });
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // Fade the grid under the text column so the introduction stays readable.
  function fade(x) {
    var edge = Math.min(w * 0.62, 640);
    return w < 700 ? 0.45 : Math.max(0.28, Math.min(1, (x - edge * 0.35) / (edge * 0.65)));
  }

  var last = 0, spawnClock = 0;
  function draw(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    ctx.clearRect(0, 0, w, h);

    edges.forEach(function (e) {
      var a = nodes[e.a], b = nodes[e.b];
      ctx.globalAlpha = fade((a.x + b.x) / 2);
      ctx.strokeStyle = (a.type === "solar" || b.type === "solar") ? "rgba(95,212,200,0.35)" : COLORS.line;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    if (!reduce) {
      spawnClock += dt;
      while (spawnClock > 0.12) { spawn(); spawnClock -= 0.12; }
      pulses = pulses.filter(function (p) {
        var a = nodes[p.from], b = nodes[p.to];
        var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        p.t += (dt * 140) / len;
        if (p.t >= 1) {
          b.glow = Math.min(1, b.glow + 0.35);
          p.hops++;
          if (p.hops > 5 || p.to === target) return false;
          var nxt = nextHop(p.to, p.from);
          if (nxt === undefined) return false;
          p.from = p.to; p.to = nxt; p.t = 0;
          return true;
        }
        var x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        ctx.globalAlpha = fade(x);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
        return true;
      });
    }

    nodes.forEach(function (n, i) {
      n.glow = Math.max(0, n.glow - dt * 0.8);
      var isTarget = i === target;
      ctx.globalAlpha = fade(n.x);
      var r = n.type === "station" ? 6 : n.type === "solar" ? 5 : 3.5;
      if (n.glow > 0.02 || isTarget) {
        ctx.fillStyle = n.type === "solar" ? "rgba(95,212,200,0.28)" : n.type === "station" ? "rgba(244,182,63,0.3)" : "rgba(169,164,255,0.28)";
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 8 + n.glow * 6 + (isTarget ? 6 : 0), 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = COLORS[n.type];
      if (n.type === "solar") {
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(Math.PI / 4);
        ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }

  function local(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  hero.addEventListener("pointermove", function (ev) {
    pointer = local(ev);
    var subs = nearest(pointer.x, pointer.y, 1, -1);
    target = subs.length ? subs[0] : null;
    if (reduce) draw(0);
  });
  hero.addEventListener("pointerleave", function () { pointer = null; target = null; if (reduce) draw(0); });
  hero.addEventListener("click", function (ev) {
    if (ev.target.closest("a, button")) return;
    var p = local(ev);
    addSolar(p.x, p.y);
  });

  var add = document.getElementById("add-solar");
  if (add) add.addEventListener("click", function () {
    addSolar(w * (0.55 + rand() * 0.4), h * (0.15 + rand() * 0.7));
  });
  var reset = document.getElementById("reset-grid");
  if (reset) reset.addEventListener("click", function () { build(); if (reduce) draw(0); });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); if (reduce) draw(0); }, 150);
  });

  resize();
  if (reduce) draw(0); else requestAnimationFrame(draw);
})();
