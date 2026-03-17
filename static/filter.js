// Cover reveal follows mouse position
(function () {
    var activeReveal = null;

    document.addEventListener("mousemove", function (e) {
        if (!activeReveal) return;
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var rw = activeReveal.offsetWidth;
        var rh = activeReveal.offsetHeight;

        var x = e.clientX + 20;
        var y = e.clientY - rh / 2;

        // Keep within viewport
        if (x + rw > vw) x = e.clientX - rw - 20;
        if (y < 8) y = 8;
        if (y + rh > vh - 8) y = vh - rh - 8;

        activeReveal.style.left = x + "px";
        activeReveal.style.top = y + "px";
    });

    document.querySelectorAll(".spine-wrapper").forEach(function (spine) {
        var reveal = spine.querySelector(".cover-reveal");
        if (!reveal) return;

        spine.addEventListener("mouseenter", function () {
            activeReveal = reveal;
            reveal.classList.add("visible");
        });

        spine.addEventListener("mouseleave", function () {
            reveal.classList.remove("visible");
            activeReveal = null;
        });
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
