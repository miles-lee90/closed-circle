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

                // Prefer right of click, fallback left
                var x = e.clientX + 16;
                if (x + pw > vw - 12) x = e.clientX - pw - 16;
                if (x < 12) x = 12;

                // Center vertically on click, clamp to viewport
                var y = e.clientY - ph / 2;
                if (y < 12) y = 12;
                if (y + ph > vh - 12) y = vh - ph - 12;

                reveal.style.left = x + "px";
                reveal.style.top = y + "px";
            });

            openSpine = spine;
            openReveal = reveal;
        });
    });

    function closePopup() {
        if (openReveal) {
            openReveal.classList.remove("visible");
            openSpine.classList.remove("active");
            openSpine = null;
            openReveal = null;
        }
    }

    document.addEventListener("click", closePopup);
    window.addEventListener("scroll", closePopup);
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
