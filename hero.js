// Hero: a calm renewable-energy landscape through one day (an illustration, not real data).
// Rolling hills with wind turbines, solar panel rows and transmission lines.
// The pointer's horizontal position sets the time of day; when idle the day plays slowly.
// The demand curve along the bottom shows how much of demand wind and solar cover.
(function () {
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("grid");
  if (!hero || !canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var out = {
    time: document.getElementById("out-time"),
    demand: document.getElementById("out-demand"),
    share: document.getElementById("out-share")
  };

  var w = 0, h = 0, bandH = 120;
  var hour = 13, pointerHour = null, spin = 0, cloudShift = 0;
  var ADOPTION = 0.3;
  var stars = [], clouds = [], turbines = [], panels = [], towers = [];

  var seed = 5;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function mix(a, b, k) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }); }
  function rgb(c, a) { return a === undefined ? "rgb(" + c.join(",") + ")" : "rgba(" + c.join(",") + "," + a + ")"; }

  // Energy model for the readouts and the band (illustrative shapes only).
  function demand(t) {
    var base = 0.58;
    var day = 0.16 * Math.exp(-Math.pow((t - 12.5) / 3.6, 2));
    var evening = 0.42 * Math.exp(-Math.pow((t - 19.8) / 1.6, 2));
    var night = -0.08 * Math.exp(-Math.pow((t - 4) / 2.2, 2));
    return Math.min(1, base + day + evening + night);
  }
  function sunPower(t) { return Math.max(0, Math.sin(Math.PI * (t - 6) / 12)); }
  function solar(t) { return Math.min(demand(t), ADOPTION * 1.1 * sunPower(t)); }
  function wind(t) { return 0.06 + 0.025 * Math.sin(t / 24 * Math.PI * 2 + 1.3); }

  // How "night" it is: 0 in full day, 1 in full night, with soft twilight.
  function darkness(t) {
    var s = sunPower(t);
    return 1 - Math.min(1, s * 2.2 + (s > 0 ? 0.15 : 0));
  }

  var SKY_DAY = [226, 243, 231], SKY_NIGHT = [150, 173, 180], SKY_WARM = [247, 233, 207];
  function skyColor(t) {
    var twilight = Math.max(0, 1 - Math.abs(t - 6) / 1.4) + Math.max(0, 1 - Math.abs(t - 18) / 1.4);
    var c = mix(SKY_DAY, SKY_NIGHT, darkness(t));
    return mix(c, SKY_WARM, Math.min(1, twilight) * 0.55);
  }

  // The landscape lives in a strip across the full width, between the text and the demand band.
  var stripH = 170;
  function hill(x, layer) {
    var u = x / w;
    if (layer === 0) return 0.78 + 0.12 * Math.sin(u * 6 + 0.5) + 0.05 * Math.sin(u * 15);
    if (layer === 1) return 0.5 + 0.12 * Math.sin(u * 4.5 + 2.1) + 0.04 * Math.sin(u * 12 + 1);
    return 0.22 + 0.07 * Math.sin(u * 3.5 + 4) + 0.03 * Math.sin(u * 10);
  }
  function hillY(x, layer) { return (h - bandH) - stripH * hill(x, layer); }

  function build() {
    seed = 5; stars = []; clouds = []; turbines = []; panels = []; towers = [];
    for (var i = 0; i < 40; i++) stars.push({ x: rand(), y: rand() * 0.45, r: 0.6 + rand() * 0.9, tw: rand() * 6 });
    for (i = 0; i < 5; i++) clouds.push({ x: rand(), y: 0.08 + rand() * 0.25, s: 0.6 + rand() * 0.7, v: 0.4 + rand() * 0.5 });
    var mobile = w < 860;
    var spots = mobile
      ? [[0.12, 0, 0.55], [0.3, 0, 0.6], [0.72, 0, 0.6], [0.9, 0, 0.55], [0.55, 1, 0.75]]
      : [[0.05, 0, 0.32], [0.13, 0, 0.36], [0.21, 0, 0.32], [0.62, 0, 0.5], [0.7, 0, 0.56], [0.78, 0, 0.5], [0.86, 0, 0.56], [0.94, 0, 0.5], [0.33, 1, 0.45], [0.81, 1, 0.72]];
    spots.forEach(function (s) { turbines.push({ x: s[0], layer: s[1], scale: s[2], phase: rand() * Math.PI * 2, speed: 0.8 + rand() * 0.4 }); });
    var start = mobile ? 0.36 : 0.4, end = mobile ? 0.5 : 0.58;
    for (var p = start; p < end; p += 0.022) panels.push({ x: p });
    for (var tx = -0.02; tx < 1.1; tx += mobile ? 0.26 : 0.12) towers.push({ x: tx });
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    var vh = window.innerHeight / 100;
    function clamp(lo, v, hi) { return Math.max(lo, Math.min(hi, v)); }
    // Same sizes as the --band and --strip values in style.css.
    bandH = w < 700 ? 90 : clamp(60, 11 * vh, 120);
    stripH = w < 700 ? 110 : clamp(76, 16 * vh, 170);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function drawSky() {
    ctx.fillStyle = rgb(skyColor(hour)); ctx.fillRect(0, 0, w, h);
    var d = darkness(hour);
    if (d > 0.3) {
      stars.forEach(function (s) {
        var a = (d - 0.3) / 0.7 * (0.55 + 0.25 * Math.sin(s.tw + spin * 0.3));
        ctx.fillStyle = "rgba(255,255,255," + a.toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill();
      });
    }
    var sp = sunPower(hour), cx = (hour / 24) * w, arcTop = 70, arcBottom = h - bandH - stripH;
    if (sp > 0) {
      var cy = arcBottom - sp * (arcBottom - arcTop);
      var halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, 90);
      halo.addColorStop(0, "rgba(242,181,68,0.45)"); halo.addColorStop(1, "rgba(242,181,68,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f2b544"; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
    } else {
      var n = hour < 6 ? hour + 6 : hour - 18;
      var my = arcBottom - Math.sin(Math.PI * n / 12) * (arcBottom - arcTop) * 0.8;
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(cx, my, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgb(skyColor(hour)); ctx.beginPath(); ctx.arc(cx + 6, my - 4, 12, 0, Math.PI * 2); ctx.fill();
    }
    var cloudCol = mix([255, 255, 255], [196, 212, 216], d);
    clouds.forEach(function (c) {
      var x = ((c.x + cloudShift * c.v * 0.01) % 1.2) * w - 0.1 * w, y = c.y * h, s = c.s * 60;
      ctx.fillStyle = rgb(cloudCol, 0.75);
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(x + s * 0.5, y - s * 0.18, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
      ctx.ellipse(x - s * 0.45, y - s * 0.08, s * 0.45, s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  var HILLS_DAY = [[188, 222, 198], [150, 200, 164], [110, 170, 128]];
  var HILLS_NIGHT = [[118, 145, 140], [92, 122, 112], [68, 98, 86]];
  function hillColor(layer) { return mix(HILLS_DAY[layer], HILLS_NIGHT[layer], darkness(hour)); }

  function drawHill(layer) {
    ctx.beginPath(); ctx.moveTo(0, h);
    for (var x = 0; x <= w + 6; x += 6) ctx.lineTo(x, hillY(x, layer));
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = rgb(hillColor(layer)); ctx.fill();
  }

  function drawTurbine(t) {
    var x = t.x * w, base = hillY(x, t.layer) + 4;
    var H = stripH * 1.35 * t.scale;
    var d = darkness(hour);
    var col = mix([250, 252, 250], [206, 218, 216], d);
    var hubY = base - H;
    ctx.fillStyle = rgb(col);
    ctx.beginPath();
    ctx.moveTo(x - H * 0.028, base); ctx.lineTo(x + H * 0.028, base);
    ctx.lineTo(x + H * 0.011, hubY); ctx.lineTo(x - H * 0.011, hubY); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - H * 0.05, hubY - H * 0.022, H * 0.085, H * 0.044);
    var blade = H * 0.48, ang = t.phase + spin * t.speed;
    for (var b = 0; b < 3; b++) {
      var a = ang + b * (Math.PI * 2 / 3);
      ctx.save(); ctx.translate(x, hubY); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -H * 0.012); ctx.quadraticCurveTo(blade * 0.35, -H * 0.04, blade, -H * 0.004);
      ctx.lineTo(blade, H * 0.004); ctx.quadraticCurveTo(blade * 0.35, H * 0.012, 0, H * 0.012);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = rgb(mix([220, 228, 224], [170, 185, 182], d));
    ctx.beginPath(); ctx.arc(x, hubY, H * 0.022, 0, Math.PI * 2); ctx.fill();
  }

  function drawPanels() {
    var sp = sunPower(hour), d = darkness(hour);
    var body = mix([46, 95, 116], [40, 66, 78], d);
    panels.forEach(function (p, i) {
      var x = p.x * w, y = hillY(x + 8, 1) + 1, pw = Math.max(14, w * 0.016), ph = pw * 0.45;
      ctx.fillStyle = rgb(mix([90, 110, 100], [60, 80, 72], d));
      ctx.fillRect(x + pw * 0.45, y - ph * 0.2, 2, ph * 0.6);
      ctx.fillStyle = rgb(body);
      ctx.beginPath();
      ctx.moveTo(x, y - ph * 0.2); ctx.lineTo(x + pw, y - ph * 0.2);
      ctx.lineTo(x + pw * 0.8, y - ph * 1.2); ctx.lineTo(x + pw * 0.2 - 2, y - ph * 1.2); ctx.closePath(); ctx.fill();
      // A soft glint that travels across the rows while the sun is up.
      var glint = sp * Math.max(0, 1 - Math.abs(((i / panels.length) - (hour - 6) / 12)) * 4);
      if (glint > 0.02) {
        ctx.fillStyle = "rgba(255,248,214," + (0.7 * glint).toFixed(2) + ")";
        ctx.beginPath();
        ctx.moveTo(x + pw * 0.3, y - ph * 0.3); ctx.lineTo(x + pw * 0.55, y - ph * 0.3);
        ctx.lineTo(x + pw * 0.45, y - ph * 1.1); ctx.lineTo(x + pw * 0.3, y - ph * 1.1); ctx.closePath(); ctx.fill();
      }
    });
  }

  function drawTowers() {
    var d = darkness(hour);
    var col = rgb(mix([74, 110, 94], [50, 76, 66], d));
    var tops = [];
    towers.forEach(function (t) {
      var x = t.x * w, base = hillY(x, 2) + 2, H = stripH * 0.48;
      var top = base - H;
      ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - H * 0.14, base); ctx.lineTo(x, top);
      ctx.lineTo(x + H * 0.14, base);
      ctx.moveTo(x - H * 0.09, base - H * 0.35); ctx.lineTo(x + H * 0.09, base - H * 0.35);
      ctx.moveTo(x - H * 0.2, top + H * 0.12); ctx.lineTo(x + H * 0.2, top + H * 0.12);
      ctx.moveTo(x - H * 0.13, top + H * 0.3); ctx.lineTo(x + H * 0.13, top + H * 0.3);
      ctx.stroke();
      tops.push([x, top + H * 0.12, H]);
    });
    ctx.strokeStyle = rgb(mix([74, 110, 94], [50, 76, 66], d), 0.55); ctx.lineWidth = 1;
    for (var i = 0; i < tops.length - 1; i++) {
      var a = tops[i], b = tops[i + 1];
      [-0.2, 0.2].forEach(function (off) {
        ctx.beginPath();
        ctx.moveTo(a[0] + a[2] * off, a[1]);
        ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 18, b[0] + b[2] * off, b[1]);
        ctx.stroke();
      });
    }
  }

  function drawBand() {
    var y0 = h - bandH, step = 4, x, t;
    function px(tt) { return (tt / 24) * w; }
    function py(v) { return h - v * (bandH - 18); }
    ctx.font = (bandH < 90 ? 11 : 12) + "px 'IBM Plex Sans', sans-serif";
    var d = darkness(hour);
    ctx.fillStyle = rgb(mix([233, 244, 236], [196, 214, 214], d)); ctx.fillRect(0, y0, w, bandH);
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w; x += step) ctx.lineTo(x, py(demand((x / w) * 24)));
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = "#b7d2c1"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w; x += step) { t = (x / w) * 24; ctx.lineTo(x, py(wind(t) * demand(t) + solar(t))); }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = "#f2b544"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w; x += step) { t = (x / w) * 24; ctx.lineTo(x, py(wind(t) * demand(t))); }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = "#7cc6e8"; ctx.fill();
    ctx.beginPath();
    for (x = 0; x <= w; x += step) { var yy = py(demand((x / w) * 24)); if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.strokeStyle = "#0f3d2e"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(15,61,46,0.65)"; ctx.font = "12px 'IBM Plex Sans', sans-serif"; ctx.textAlign = "center";
    [6, 12, 18].forEach(function (tt) { ctx.fillText((tt < 10 ? "0" : "") + tt + ":00", px(tt), h - 6); });
    var mx = px(hour), my = py(demand(hour));
    ctx.strokeStyle = "#0f3d2e"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(mx, y0 + 4); ctx.lineTo(mx, h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#0f3d2e"; ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fill();
  }

  function fmtHour(t) {
    var hh = Math.floor(t) % 24, mm = Math.round((t - Math.floor(t)) * 60 / 15) * 15;
    if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function updateReadout() {
    var dm = demand(hour);
    var share = Math.round(((solar(hour) + wind(hour) * dm) / dm) * 100);
    if (out.time) out.time.textContent = fmtHour(hour);
    if (out.demand) out.demand.textContent = Math.round(dm * 100) + "%";
    if (out.share) out.share.textContent = share + "%";
    hero.classList.toggle("is-night", darkness(hour) > 0.6);
  }

  function render() {
    drawSky();
    drawHill(0);
    turbines.forEach(function (t) { if (t.layer === 0) drawTurbine(t); });
    drawHill(1);
    drawPanels();
    turbines.forEach(function (t) { if (t.layer === 1) drawTurbine(t); });
    drawHill(2);
    drawTowers();
    drawBand();
    updateReadout();
  }

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (pointerHour === null) hour = (hour + dt * 0.45) % 24; // one day in about 55 seconds
    else hour += (pointerHour - hour) * Math.min(1, dt * 6);
    spin += dt * 1.1;
    cloudShift += dt;
    render();
    requestAnimationFrame(frame);
  }

  function local(ev) { var r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  hero.addEventListener("pointermove", function (ev) {
    if (ev.target.closest(".grid-panel")) return;
    pointerHour = Math.max(0, Math.min(23.99, (local(ev).x / w) * 24));
    if (reduce) { hour = pointerHour; render(); }
  });
  hero.addEventListener("pointerleave", function () { pointerHour = null; });

  var timer;
  window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(function () { resize(); render(); }, 150); });

  resize();
  if (reduce) render(); else requestAnimationFrame(frame);
})();
