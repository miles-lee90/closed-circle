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

            // Show popup first (invisible) to measure its size
            reveal.style.left = "0px";
            reveal.style.top = "0px";
            reveal.classList.add("visible");
            spine.classList.add("active");

            // Position based on click location + popup size
            requestAnimationFrame(function () {
                var vw = window.innerWidth;
                var vh = window.innerHeight;
                var rr = reveal.getBoundingClientRect();
                var pw = rr.width;
                var ph = rr.height;

                var scrollX = window.scrollX;
                var scrollY = window.scrollY;

                // Prefer right of click, fallback left
                var x = e.pageX + 16;
                if (e.clientX + 16 + pw > vw - 12) x = e.pageX - pw - 16;
                if (x < scrollX + 12) x = scrollX + 12;

                // Center vertically on click, clamp to viewport
                var y = e.pageY - ph / 2;
                if (y < scrollY + 12) y = scrollY + 12;
                if (y + ph > scrollY + vh - 12) y = scrollY + vh - ph - 12;

                reveal.style.left = x + "px";
                reveal.style.top = y + "px";
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
