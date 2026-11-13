// Hero: four biosignal traces drawn like threads across the indigo band.
// Illustrative waveforms (ECG, EMG, EDA, EEG), not recorded data.
(function () {
  var canvas = document.getElementById("signals");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var start = performance.now();

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function noise(x) {
    return Math.sin(x * 12.9898) * 43758.5453 % 1;
  }

  var traces = [
    { color: "#ff7a8a", y: 0.22, amp: 0.09, fn: function (t) { // ECG
      var p = ((t % 1) + 1) % 1;
      var v = 0;
      v += 0.12 * Math.exp(-Math.pow((p - 0.18) / 0.025, 2));
      v -= 0.15 * Math.exp(-Math.pow((p - 0.29) / 0.008, 2));
      v += 1.0 * Math.exp(-Math.pow((p - 0.31) / 0.009, 2));
      v -= 0.25 * Math.exp(-Math.pow((p - 0.33) / 0.01, 2));
      v += 0.22 * Math.exp(-Math.pow((p - 0.55) / 0.05, 2));
      return v;
    }, speed: 0.9, scale: 0.0045 },
    { color: "#5fd4c8", y: 0.45, amp: 0.07, fn: function (t) { // EMG bursts
      var burst = Math.pow(Math.max(0, Math.sin(t * 0.9)), 6);
      return (noise(Math.floor(t * 60)) - 0.5) * (0.12 + 1.1 * burst);
    }, speed: 0.7, scale: 0.02 },
    { color: "#f4b63f", y: 0.68, amp: 0.06, fn: function (t) { // EDA slow
      return Math.sin(t * 0.6) * 0.6 + Math.sin(t * 1.7 + 1) * 0.25 + Math.pow(Math.max(0, Math.sin(t * 0.33)), 8) * 0.9;
    }, speed: 0.35, scale: 0.006 },
    { color: "#a9a4ff", y: 0.86, amp: 0.035, fn: function (t) { // EEG
      return Math.sin(t * 9) * 0.5 + Math.sin(t * 23 + 2) * 0.3 + Math.sin(t * 4.1) * 0.4;
    }, speed: 0.5, scale: 0.011 }
  ];

  function draw(now) {
    var s = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    traces.forEach(function (tr) {
      ctx.beginPath();
      for (var x = 0; x <= w; x += 2) {
        var t = x * tr.scale + s * tr.speed;
        var y = h * tr.y - tr.fn(t) * h * tr.amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      var g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, tr.color + "1a");
      g.addColorStop(0.5, tr.color + "33");
      g.addColorStop(0.7, tr.color + "99");
      g.addColorStop(1, tr.color + "e6");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();
    });
    if (!reduce) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", function () { resize(); if (reduce) draw(start + 4000); });
  if (reduce) draw(start + 4000); else requestAnimationFrame(draw);
})();
