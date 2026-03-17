// Click spine to show info popup next to it
(function () {
    var openSpine = null;
    var openReveal = null;

    document.querySelectorAll(".spine-wrapper").forEach(function (spine) {
        var reveal = spine.querySelector(".cover-reveal");
        if (!reveal) return;

        spine.addEventListener("click", function (e) {
            e.stopPropagation();

            if (openSpine === spine) {
                reveal.classList.remove("visible");
                spine.classList.remove("active");
                openSpine = null;
                openReveal = null;
                return;
            }

            if (openReveal) {
                openReveal.classList.remove("visible");
                openSpine.classList.remove("active");
            }

            // Position popup next to the spine
            var rect = spine.getBoundingClientRect();
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var pw = 220;

            var x = rect.right + 8;
            if (x + pw > vw) x = rect.left - pw - 8;

            var y = rect.top;
            // Don't go below viewport
            reveal.style.left = x + "px";
            reveal.style.top = y + "px";
            reveal.classList.add("visible");
            spine.classList.add("active");

            // Adjust if popup goes below viewport
            requestAnimationFrame(function () {
                var rr = reveal.getBoundingClientRect();
                if (rr.bottom > vh - 8) {
                    reveal.style.top = (vh - rr.height - 8) + "px";
                }
            });

            openSpine = spine;
            openReveal = reveal;
        });
    });

    document.addEventListener("click", function () {
        if (openReveal) {
            openReveal.classList.remove("visible");
            openSpine.classList.remove("active");
            openSpine = null;
            openReveal = null;
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
