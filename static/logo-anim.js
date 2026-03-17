// Simple tilt: rotate face, margin on the side it leans toward
document.addEventListener("DOMContentLoaded", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Calculate average height to skip outliers
    var heights = [];
    spines.forEach(function (s) { heights.push(s.offsetHeight); });
    var avg = heights.reduce(function (a, b) { return a + b; }, 0) / heights.length;
    var threshold = avg * 0.2; // skip books that deviate >20% from average

    // Pick ~10%, skip neighbors within 3 positions and outlier heights
    var indices = [];
    for (var i = 0; i < spines.length; i++) {
        if (Math.abs(heights[i] - avg) > threshold) continue; // skip outliers
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

        // Margin on the side the book leans toward
        if (angle > 0) {
            // Leaning right → space on right
            spine.style.marginLeft = "4px";
            spine.style.marginRight = "35px";
        } else {
            // Leaning left → space on left
            spine.style.marginLeft = "35px";
            spine.style.marginRight = "4px";
        }
    });
});
