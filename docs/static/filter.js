// Cover reveal on click — click spine to show, click elsewhere to close
(function () {
    var openReveal = null;
    var openSpine = null;

    document.querySelectorAll(".spine-wrapper").forEach(function (spine) {
        var reveal = spine.querySelector(".cover-reveal");
        if (!reveal) return;

        spine.addEventListener("click", function (e) {
            e.stopPropagation();

            // If clicking the same spine, close it
            if (openSpine === spine) {
                reveal.classList.remove("visible");
                spine.classList.remove("active");
                openReveal = null;
                openSpine = null;
                return;
            }

            // Close previous
            if (openReveal) {
                openReveal.classList.remove("visible");
                openSpine.classList.remove("active");
            }

            // Position near click
            var rect = spine.getBoundingClientRect();
            var vw = window.innerWidth;
            var x = rect.right + 12;
            if (x + 200 > vw) x = rect.left - 200 - 12;

            reveal.style.left = x + "px";
            reveal.style.top = rect.top + "px";
            reveal.classList.add("visible");
            spine.classList.add("active");
            openReveal = reveal;
            openSpine = spine;
        });
    });

    // Click outside closes
    document.addEventListener("click", function () {
        if (openReveal) {
            openReveal.classList.remove("visible");
            openSpine.classList.remove("active");
            openReveal = null;
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
