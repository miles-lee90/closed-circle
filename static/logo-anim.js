// Simple tilt: rotate face, add big margin to wrapper
document.addEventListener("DOMContentLoaded", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Pick ~10%, skip neighbors within 3 positions
    var indices = [];
    for (var i = 0; i < spines.length; i++) indices.push(i);
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
        spine.style.marginLeft = "4px";
        spine.style.marginRight = "30px";
    });
});
