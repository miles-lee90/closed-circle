(function () {
    "use strict";

    var grid = document.getElementById("book-grid");
    var filterBar = document.getElementById("floating-filter");
    var filterBtns = filterBar.querySelectorAll(".floating-filter-btn");

    // ─── Floating Filter ───
    filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            filterBtns.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var filter = btn.getAttribute("data-filter");
            var spines = grid.querySelectorAll(".spine-wrapper");
            var delay = 0;

            spines.forEach(function (spine) {
                var show = filter === "all" || spine.getAttribute("data-nationality") === filter;
                if (show) {
                    spine.style.display = "";
                    spine.classList.remove("stagger-in");
                    void spine.offsetWidth; // reflow
                    spine.style.animationDelay = delay + "ms";
                    spine.classList.add("stagger-in");
                    delay += 20;
                } else {
                    spine.style.display = "none";
                    spine.classList.remove("stagger-in");
                }
            });
        });
    });

})();
