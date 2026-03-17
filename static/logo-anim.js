// Simple tilt: rotate face, margin on the side it leans toward
document.addEventListener("DOMContentLoaded", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Calculate average height to skip outliers
    var heights = [];
    spines.forEach(function (s) { heights.push(s.offsetHeight); });
    var avg = heights.reduce(function (a, b) { return a + b; }, 0) / heights.length;
    var threshold = avg * 0.2; // skip books that deviate >20% from average

    // Detect row boundaries by comparing offsetTop
    var rowFirsts = new Set();
    var rowLasts = new Set();
    var lastTop = -1;
    for (var i = 0; i < spines.length; i++) {
        var top = spines[i].offsetTop;
        if (top !== lastTop) {
            rowFirsts.add(i);
            if (i > 0) rowLasts.add(i - 1);
            lastTop = top;
        }
    }
    rowLasts.add(spines.length - 1);

    // Pick ~10%, skip neighbors within 3, outlier heights, and row first/last
    var indices = [];
    for (var i = 0; i < spines.length; i++) {
        if (Math.abs(heights[i] - avg) > threshold) continue;
        if (rowFirsts.has(i) || rowLasts.has(i)) continue;
        indices.push(i);
    }
    for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }
    var count = Math.max(1, Math.floor(spines.length * 0.1));
    var tilted = new Set();
    for (var k = 0; k < indices.length && tilted.size < count; k++) {
        var idx = indices[k];
        var tooClose = false;
        tilted.forEach(function (t) { if (Math.abs(t - idx) < 3) tooClose = true; });
        if (tooClose) continue;
        tilted.add(idx);
    }

    tilted.forEach(function (idx) {
        var spine = spines[idx];
        var face = spine.querySelector(".spine-face");
        if (!face) return;

        var angle = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4);

        face.style.transform = "rotate(" + angle + "deg)";
        face.style.transformOrigin = "bottom center";

        // Margin scales with angle: 35px at 3deg, ~12px per extra degree
        var margin = Math.round(35 + (Math.abs(angle) - 3) * 12);
        if (angle > 0) {
            spine.style.marginLeft = "4px";
            spine.style.marginRight = margin + "px";
        } else {
            spine.style.marginLeft = margin + "px";
            spine.style.marginRight = "4px";
        }
    });
});
