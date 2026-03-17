// 3D book open on click — click spine to rotate open, click again or outside to close
(function () {
    var openSpine = null;

    document.querySelectorAll(".spine-wrapper").forEach(function (spine) {
        spine.addEventListener("click", function (e) {
            e.stopPropagation();

            if (openSpine === spine) {
                spine.classList.remove("open");
                openSpine = null;
                return;
            }

            if (openSpine) {
                openSpine.classList.remove("open");
            }

            spine.classList.add("open");
            openSpine = spine;
        });
    });

    document.addEventListener("click", function () {
        if (openSpine) {
            openSpine.classList.remove("open");
            openSpine = null;
        }
    });
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
