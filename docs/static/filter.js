// Randomly tilt 1-2 books per visual row
(function () {
    var spines = document.querySelectorAll(".spine-wrapper");
    if (!spines.length) return;

    // Pick ~15% of books to tilt
    var indices = [];
    for (var i = 0; i < spines.length; i++) indices.push(i);

    // Shuffle and pick
    for (var i = indices.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }

    var count = Math.max(2, Math.floor(spines.length * 0.12));
    for (var k = 0; k < count; k++) {
        var idx = indices[k];
        var angle = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
        var pad = Math.ceil(Math.abs(angle) * 5);
        spines[idx].style.transform = "rotate(" + angle + "deg)";
        spines[idx].style.marginLeft = pad + "px";
        spines[idx].style.marginRight = pad + "px";
        spines[idx].style.zIndex = "1";
    }
})();

document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll(".filter-btn");
    var grid = document.getElementById("book-grid");
    var newsList = document.getElementById("news-list");

    buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            buttons.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var filter = btn.getAttribute("data-filter");

            if (grid) {
                // Bookshelf: filter spine-wrappers
                var spines = grid.querySelectorAll(".spine-wrapper");
                spines.forEach(function (spine) {
                    if (filter === "all" || spine.getAttribute("data-nationality") === filter) {
                        spine.style.display = "";
                    } else {
                        spine.style.display = "none";
                    }
                });
            }

            if (newsList) {
                var items = newsList.querySelectorAll(".news-card");
                items.forEach(function (item) {
                    if (filter === "all" || item.getAttribute("data-publisher") === filter) {
                        item.style.display = "";
                    } else {
                        item.style.display = "none";
                    }
                });
            }
        });
    });
});
