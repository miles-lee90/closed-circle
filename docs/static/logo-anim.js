// Tilt random books — use getBoundingClientRect after rotation
// to set wrapper width to actual visual size
document.addEventListener("DOMContentLoaded", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    var indices = [];
    for (var i = 0; i < spines.length; i++) indices.push(i);
    for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }
    var count = Math.max(2, Math.floor(spines.length * 0.12));
    var tilted = new Set();
    for (var k = 0; k < indices.length && tilted.size < count; k++) {
        var idx = indices[k];
        if (tilted.has(idx - 1) || tilted.has(idx + 1) || tilted.has(idx - 2) || tilted.has(idx + 2)) continue;
        tilted.add(idx);
    }

    // First pass: apply rotation
    var tiltData = [];
    tilted.forEach(function (idx) {
        var spine = spines[idx];
        var face = spine.querySelector(".spine-face");
        if (!face) return;

        var angle = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 1.5);
        face.style.transform = "rotate(" + angle + "deg)";
        face.style.transformOrigin = "bottom center";
        tiltData.push({ spine: spine, face: face, angle: angle });
    });

    // Second pass: measure actual bounding rect AFTER rotation and fix wrapper
    requestAnimationFrame(function () {
        tiltData.forEach(function (d) {
            var rect = d.face.getBoundingClientRect();
            var wrapperRect = d.spine.getBoundingClientRect();
            var neededWidth = Math.ceil(rect.width) + 16;

            d.spine.style.width = neededWidth + "px";
            d.spine.style.position = "relative";
            d.face.style.position = "absolute";
            d.face.style.bottom = "0";
            d.face.style.left = "50%";
            d.face.style.transform = "translateX(-50%) rotate(" + d.angle + "deg)";
        });
    });
});
