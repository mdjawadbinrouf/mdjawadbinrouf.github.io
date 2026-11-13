// Hero: "a day on the grid", an interactive illustration (not real data).
// The pointer's horizontal position sets the time of day. The sun moves, rooftop
// solar sites produce power in daylight, and the demand curve along the bottom
// shows how much of demand solar and other renewables cover. The adoption slider
// adds rooftop solar across the grid. Energy pulses travel along the lines, and
// they route toward the substation nearest the pointer.
(function () {
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("grid");
  if (!hero || !canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var timeInput = document.getElementById("time-of-day");
  var adoptInput = document.getElementById("adoption");
  var out = {
    time: document.getElementById("out-time"),
    demand: document.getElementById("out-demand"),
    share: document.getElementById("out-share"),
    timeLabel: document.getElementById("time-label"),
    adoptLabel: document.getElementById("adopt-label")
  };

  var C = {
    forest: "#0f3d2e", leaf: "#23794c", sprout: "#8fd19e", sun: "#f2b544",
    sage: "#b7d2c1", sky: "#7cc6e8", line: "rgba(35,121,76,0.22)"
  };

  var w = 0, h = 0, bandH = 120;
  var hour = 13, adoption = 0.3;
  var pointerHour = null, targetNode = null, userSetTime = false;
  var nodes = [], edges = [], pulses = [];
  var seed = 11;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // Daily demand profile, normalised so the evening peak is 1.
  function demand(t) {
    var base = 0.58;
    var day = 0.16 * Math.exp(-Math.pow((t - 12.5) / 3.6, 2));
    var evening = 0.42 * Math.exp(-Math.pow((t - 19.8) / 1.6, 2));
    var night = -0.08 * Math.exp(-Math.pow((t - 4) / 2.2, 2));
    return Math.min(1, base + day + evening + night);
  }
  function sunPower(t) { return Math.max(0, Math.sin(Math.PI * (t - 6) / 12)); }
  function solar(t) { return Math.min(demand(t), adoption * 1.1 * sunPower(t)); }
  var OTHER_RENEWABLE = 0.05; // a small, steady share from hydro and other sources

  function addEdge(a, b) {
    if (a === b || b === undefined) return;
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return;
    }
    edges.push({ a: a, b: b }); nodes[a].links.push(b); nodes[b].links.push(a);
  }
  function nearest(x, y, n, skip, filter) {
    return nodes.map(function (o, i) { return { i: i, d: Math.hypot(o.x - x, o.y - y) }; })
      .filter(function (o) { return o.i !== skip && (!filter || filter(nodes[o.i])); })
      .sort(function (p, q) { return p.d - q.d; }).slice(0, n).map(function (o) { return o.i; });
  }

  function build() {
    seed = 11; nodes = []; edges = []; pulses = [];
    var top = 70, bottom = h - bandH - 30;
    var cols = w < 700 ? 4 : 8, rows = 4;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        nodes.push({
          x: (c + 0.5 + (rand() - 0.5) * 0.7) * (w / cols),
          y: top + (r + 0.5 + (rand() - 0.5) * 0.5) * ((bottom - top) / rows),
          type: "sub", links: [], glow: 0
        });
      }
    }
    var stations = w < 700 ? 2 : 4;
    for (var s = 0; s < stations; s++) nodes[Math.floor(rand() * nodes.length)].type = "station";
    nodes.forEach(function (n, i) { nearest(n.x, n.y, 2, i).forEach(function (j) { addEdge(i, j); }); });
    // Candidate rooftop solar sites; how many are active depends on adoption.
    var sites = w < 700 ? 8 : 16;
    for (var k = 0; k < sites; k++) {
      var x = w * (0.08 + rand() * 0.88), y = top + rand() * (bottom - top);
      var near = nearest(x, y, 1, -1, function (n) { return n.type !== "solar"; });
      nodes.push({ x: x, y: y, type: "solar", rank: rand(), links: [], glow: 0 });
      addEdge(nodes.length - 1, near[0]);
    }
  }

  function solarActive(n) { return n.type === "solar" && n.rank < adoption / 0.6; }

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = r.width; h = r.height; bandH = w < 700 ? 90 : 120;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // Keep the network faint behind the text column.
  function fade(x, y) {
    if (w < 860) return 0.35;
    var textRight = Math.min(w * 0.55, (w - 1080) / 2 + 640);
    if (x < textRight && y < h - bandH - 10) return 0.25;
    return 1;
  }

  function skyColor(t) {
    var s = sunPower(t);
    var twilight = Math.max(0, 1 - Math.abs(t - 6) / 1.5) + Math.max(0, 1 - Math.abs(t - 18) / 1.5);
    var day = [226, 243, 231], night = [214, 228, 233], warm = [247, 236, 214];
    var k = Math.min(1, s * 1.6);
    var col = day.map(function (d, i) { return night[i] + (d - night[i]) * k; });
    col = col.map(function (v, i) { return v + (warm[i] - v) * Math.min(1, twilight) * 0.6; });
    return "rgb(" + col.map(Math.round).join(",") + ")";
  }

  function nextHop(from, prev) {
    var options = nodes[from].links.filter(function (j) { return j !== prev && (nodes[j].type !== "solar" || solarActive(nodes[j])); });
    if (!options.length) return undefined;
    if (targetNode !== null && rand() < 0.75) {
      var t = nodes[targetNode];
      options.sort(function (a, b) { return Math.hypot(nodes[a].x - t.x, nodes[a].y - t.y) - Math.hypot(nodes[b].x - t.x, nodes[b].y - t.y); });
      return options[0];
    }
    return options[Math.floor(rand() * options.length)];
  }

  function spawn() {
    var sp = sunPower(hour);
    var sources = [];
    nodes.forEach(function (n, i) {
      if (n.type === "station") sources.push(i);
      if (solarActive(n) && rand() < sp) sources.push(i);
    });
    if (!sources.length) return;
    var from = sources[Math.floor(rand() * sources.length)];
    var to = nextHop(from, -1);
    if (to === undefined) return;
    pulses.push({ from: from, to: to, t: 0, hops: 0, color: nodes[from].type === "solar" ? C.sun : C.leaf });
  }

  function fmtHour(t) {
    var hh = Math.floor(t) % 24, mm = Math.round((t - Math.floor(t)) * 60 / 15) * 15;
    if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function updateReadout() {
    var d = demand(hour), s = solar(hour);
    var share = Math.round(((s + OTHER_RENEWABLE * d) / d) * 100);
    if (out.time) out.time.textContent = fmtHour(hour);
    if (out.demand) out.demand.textContent = Math.round(d * 100) + "%";
    if (out.share) out.share.textContent = share + "%";
    if (out.timeLabel) out.timeLabel.textContent = fmtHour(hour);
    if (out.adoptLabel) out.adoptLabel.textContent = Math.round(adoption * 100) + "%";
    if (timeInput && document.activeElement !== timeInput) timeInput.value = hour.toFixed(2);
  }

  function drawBand() {
    var y0 = h - bandH, step = 4;
    function px(t) { return (t / 24) * w; }
    function py(v) { return h - v * (bandH - 18); }
    var x, t;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w; x += step) ctx.lineTo(x, py(demand((x / w) * 24)));
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = C.sage; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w; x += step) { t = (x / w) * 24; ctx.lineTo(x, py(OTHER_RENEWABLE * demand(t) + solar(t))); }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = C.sun; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w; x += step) ctx.lineTo(x, py(OTHER_RENEWABLE * demand((x / w) * 24)));
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = C.sky; ctx.fill();
    ctx.beginPath();
    for (x = 0; x <= w; x += step) { var yy = py(demand((x / w) * 24)); if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.strokeStyle = C.forest; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(15,61,46,0.6)"; ctx.font = "12px 'IBM Plex Sans', sans-serif"; ctx.textAlign = "center";
    [6, 12, 18].forEach(function (tt) { ctx.fillText((tt < 10 ? "0" : "") + tt + ":00", px(tt), h - 6); });
    var mx = px(hour), my = py(demand(hour));
    ctx.strokeStyle = C.forest; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(mx, y0 - 6); ctx.lineTo(mx, h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.forest; ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawSun() {
    var sp = sunPower(hour);
    var cx = (hour / 24) * w;
    var arcTop = 60, arcBottom = h - bandH;
    if (sp > 0) {
      var cy = arcBottom - sp * (arcBottom - arcTop);
      var halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 70);
      halo.addColorStop(0, "rgba(242,181,68,0.45)"); halo.addColorStop(1, "rgba(242,181,68,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
    } else {
      var night = hour < 6 ? hour + 6 : hour - 18;
      var my = arcBottom - Math.sin(Math.PI * night / 12) * (arcBottom - arcTop) * 0.7;
      ctx.fillStyle = "rgba(15,61,46,0.18)"; ctx.beginPath(); ctx.arc(cx, my, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = skyColor(hour); ctx.beginPath(); ctx.arc(cx + 5, my - 3, 10, 0, Math.PI * 2); ctx.fill();
    }
  }

  var last = 0, clock = 0;
  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (pointerHour === null && !userSetTime) hour = (hour + dt * 0.6) % 24; // one day in about 40 seconds
    if (pointerHour !== null) hour += (pointerHour - hour) * Math.min(1, dt * 8);
    render(dt);
    requestAnimationFrame(frame);
  }

  function render(dt) {
    ctx.fillStyle = skyColor(hour); ctx.fillRect(0, 0, w, h);
    drawSun();
    var sp = sunPower(hour);

    edges.forEach(function (e) {
      var a = nodes[e.a], b = nodes[e.b];
      if ((a.type === "solar" && !solarActive(a)) || (b.type === "solar" && !solarActive(b))) return;
      ctx.globalAlpha = fade((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.strokeStyle = (a.type === "solar" || b.type === "solar") ? "rgba(242,181,68,0.6)" : C.line;
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    if (dt) {
      clock += dt;
      while (clock > 0.1) { spawn(); clock -= 0.1; }
    }
    pulses = pulses.filter(function (p) {
      var a = nodes[p.from], b = nodes[p.to];
      var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      p.t += ((dt || 0) * 150) / len;
      if (p.t >= 1) {
        b.glow = Math.min(1, b.glow + 0.35); p.hops++;
        if (p.hops > 5 || p.to === targetNode) return false;
        var nxt = nextHop(p.to, p.from);
        if (nxt === undefined) return false;
        p.from = p.to; p.to = nxt; p.t = 0; return true;
      }
      var x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
      ctx.globalAlpha = fade(x, y); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    nodes.forEach(function (n, i) {
      if (n.type === "solar" && !solarActive(n)) return;
      n.glow = Math.max(0, n.glow - (dt || 0) * 0.8);
      ctx.globalAlpha = fade(n.x, n.y);
      var r = n.type === "station" ? 7 : n.type === "solar" ? 6 : 3.5;
      if (n.glow > 0.02 || i === targetNode) {
        ctx.fillStyle = n.type === "station" ? "rgba(35,121,76,0.18)" : "rgba(143,209,158,0.4)";
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 8 + n.glow * 6 + (i === targetNode ? 6 : 0), 0, Math.PI * 2); ctx.fill();
      }
      if (n.type === "solar") {
        ctx.fillStyle = "rgba(242,181,68," + (0.35 + 0.65 * sp).toFixed(2) + ")";
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      } else {
        ctx.fillStyle = n.type === "station" ? C.forest : C.leaf;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    drawBand();
    updateReadout();
  }

  function local(ev) { var r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }

  hero.addEventListener("pointermove", function (ev) {
    if (ev.target.closest(".grid-panel")) return;
    var p = local(ev);
    pointerHour = Math.max(0, Math.min(23.99, (p.x / w) * 24));
    var near = nearest(p.x, p.y, 1, -1, function (n) { return n.type !== "solar"; });
    targetNode = near.length ? near[0] : null;
    userSetTime = false;
    if (reduce) { hour = pointerHour; render(0); }
  });
  hero.addEventListener("pointerleave", function () { pointerHour = null; targetNode = null; if (reduce) render(0); });

  if (timeInput) timeInput.addEventListener("input", function () {
    hour = parseFloat(timeInput.value); userSetTime = true; pointerHour = null; render(0);
  });
  if (adoptInput) adoptInput.addEventListener("input", function () {
    adoption = parseFloat(adoptInput.value) / 100; render(0);
  });

  var timer;
  window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(function () { resize(); render(0); }, 150); });

  if (adoptInput) adoption = parseFloat(adoptInput.value) / 100;
  resize();
  if (reduce) { userSetTime = true; render(0); } else requestAnimationFrame(frame);
})();
