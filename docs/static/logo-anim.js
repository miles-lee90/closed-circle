// Tilt random books after layout is complete
// Runs after DOM is ready so we can measure actual positions
document.addEventListener("DOMContentLoaded", function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Pick ~12% of books to tilt, but never adjacent ones
    var indices = [];
    for (var i = 0; i < spines.length; i++) indices.push(i);
    // Shuffle
    for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }

    var count = Math.max(2, Math.floor(spines.length * 0.12));
    var tilted = new Set();

    for (var k = 0; k < indices.length && tilted.size < count; k++) {
        var idx = indices[k];
        // Skip if neighbor is already tilted
        if (tilted.has(idx - 1) || tilted.has(idx + 1)) continue;
        tilted.add(idx);
    }

    tilted.forEach(function (idx) {
        var spine = spines[idx];
        var angle = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 1.5);
        var face = spine.querySelector(".spine-face");
        if (!face) return;

        // Get the spine height to calculate how much horizontal space the tilt needs
        var h = face.offsetHeight;
        var rad = Math.abs(angle) * Math.PI / 180;
        var extra = Math.ceil(Math.sin(rad) * h) + 4;

        // Add margin to prevent overlap
        spine.style.marginLeft = (extra / 2 + 4) + "px";
        spine.style.marginRight = (extra / 2 + 4) + "px";

        // Apply rotation to the inner book, not the wrapper
        face.style.transform = "rotate(" + angle + "deg)";
        face.style.transformOrigin = "bottom center";
    });
});
