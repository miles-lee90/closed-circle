// Tilt random books — wrapper width set to rotated bounding box
document.addEventListener("DOMContentLoaded", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Pick ~12%, never adjacent
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
        if (tilted.has(idx - 1) || tilted.has(idx + 1)) continue;
        tilted.add(idx);
    }

    tilted.forEach(function (idx) {
        var spine = spines[idx];
        var face = spine.querySelector(".spine-face");
        if (!face) return;

        var angle = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 1.5);
        var rad = Math.abs(angle) * Math.PI / 180;

        // Measure original size
        var h = face.offsetHeight;
        var w = face.offsetWidth;

        // Rotated bounding box width
        var rotatedW = Math.ceil(Math.sin(rad) * h + Math.cos(rad) * w);

        // Set wrapper to exact rotated width so layout doesn't overlap
        spine.style.width = (rotatedW + 12) + "px";
        spine.style.display = "flex";
        spine.style.justifyContent = "center";

        // Rotate the face
        face.style.transform = "rotate(" + angle + "deg)";
        face.style.transformOrigin = "bottom center";
    });
});
