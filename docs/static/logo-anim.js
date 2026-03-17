// Tilt random books on the bookshelf
// Runs after images load so layout is finalized
window.addEventListener("load", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Measure heights for outlier detection
    var heights = [];
    spines.forEach(function (s) { heights.push(s.offsetHeight); });
    var avg = heights.reduce(function (a, b) { return a + b; }, 0) / heights.length;
    var threshold = avg * 0.2;

    // Detect row boundaries by offsetTop
    var rowFirsts = new Set();
    var rowLasts = new Set();
    var lastTop = -1;
    for (var i = 0; i < spines.length; i++) {
        var top = spines[i].getBoundingClientRect().top;
        if (Math.abs(top - lastTop) > 10) {
            rowFirsts.add(i);
            if (i > 0) rowLasts.add(i - 1);
            lastTop = top;
        }
    }
    rowLasts.add(spines.length - 1);

    // Build candidate list: exclude outliers and row first/last
    var candidates = [];
    for (var i = 0; i < spines.length; i++) {
        if (rowFirsts.has(i) || rowLasts.has(i)) continue;
        if (Math.abs(heights[i] - avg) > threshold) continue;
        candidates.push(i);
    }

    // Shuffle candidates
    for (var i = candidates.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
    }

    // Pick ~10%, skip neighbors within 3
    var count = Math.max(1, Math.floor(spines.length * 0.1));
    var tilted = new Set();
    for (var k = 0; k < candidates.length && tilted.size < count; k++) {
        var idx = candidates[k];
        var tooClose = false;
        tilted.forEach(function (t) { if (Math.abs(t - idx) < 3) tooClose = true; });
        if (tooClose) continue;
        tilted.add(idx);
    }

    // Apply tilt
    tilted.forEach(function (idx) {
        var spine = spines[idx];
        var face = spine.querySelector(".spine-face");
        if (!face) return;

        // 2~5 degrees
        var angle = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
        // Margin: 35px at 2deg, +12px per extra degree
        var margin = Math.round(35 + (Math.abs(angle) - 2) * 12);

        face.style.transform = "rotate(" + angle + "deg)";
        face.style.transformOrigin = "bottom center";

        if (angle > 0) {
            spine.style.marginLeft = "4px";
            spine.style.marginRight = margin + "px";
        } else {
            spine.style.marginLeft = margin + "px";
            spine.style.marginRight = "4px";
        }
    });
});
