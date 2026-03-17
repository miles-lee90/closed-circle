document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".filter-btn");
    const grid = document.getElementById("book-grid");
    const newsList = document.getElementById("news-list");

    buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            buttons.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var filter = btn.getAttribute("data-filter");

            if (grid) {
                var cards = grid.querySelectorAll(".book-card");
                cards.forEach(function (card) {
                    if (filter === "all" || card.getAttribute("data-nationality") === filter) {
                        card.style.display = "";
                    } else {
                        card.style.display = "none";
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
