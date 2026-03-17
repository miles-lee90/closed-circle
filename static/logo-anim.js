// Tilt random books on the bookshelf
window.addEventListener("load", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Measure heights for outlier detection
    var heights = [];
    spines.forEach(function (s) { heights.push(s.offsetHeight); });
    var avg = heights.reduce(function (a, b) { return a + b; }, 0) / heights.length;
    var threshold = avg * 0.2;

    // Detect rows by bottom position (flex-end aligned, so bottom is consistent per row)
    var rows = [];  // array of arrays of indices
    var currentRow = [0];
    var lastBottom = spines[0].getBoundingClientRect().bottom;
    for (var i = 1; i < spines.length; i++) {
        var bottom = spines[i].getBoundingClientRect().bottom;
        if (Math.abs(bottom - lastBottom) > 30) {
            // New row
            rows.push(currentRow);
            currentRow = [i];
            lastBottom = bottom;
        } else {
            currentRow.push(i);
        }
    }
    rows.push(currentRow);

    // Collect first/last of each row
    var rowEdges = new Set();
    rows.forEach(function (row) {
        if (row.length > 0) rowEdges.add(row[0]);
        if (row.length > 1) rowEdges.add(row[row.length - 1]);
    });

    // Build candidate list: exclude edges and height outliers
    var candidates = [];
    for (var i = 0; i < spines.length; i++) {
        if (rowEdges.has(i)) continue;
        if (Math.abs(heights[i] - avg) > threshold) continue;
        candidates.push(i);
    }

    // Shuffle
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
        // Margin: 32px at 2deg, +12px per extra degree
        var margin = Math.round(32 + (Math.abs(angle) - 2) * 12);

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
