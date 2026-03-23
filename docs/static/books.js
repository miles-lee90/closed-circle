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

    // ─── 3D Transition ───
    var detailContainer = document.getElementById("book-detail-container");
    var activeSpine = null;
    var isDetailOpen = false;

    function createBook3D(book) {
        var w = book.sizeW, h = book.sizeH, d = book.sizeD;
        var scene = document.createElement("div");
        scene.className = "book3d-scene";
        scene.style.width = w + "px";
        scene.style.height = h + "px";

        var bookEl = document.createElement("div");
        bookEl.className = "book3d";
        bookEl.id = "book3d-inline";
        bookEl.style.width = w + "px";
        bookEl.style.height = h + "px";

        // Front
        var front = document.createElement("div");
        front.className = "book3d-face book3d-front";
        front.style.cssText = "width:" + w + "px;height:" + h + "px;transform:translateZ(" + (d / 2) + "px)";
        front.innerHTML = '<img src="' + book.coverUrl + '" alt="' + book.title + '">';

        // Back
        var back = document.createElement("div");
        back.className = "book3d-face book3d-back";
        back.style.cssText = "width:" + w + "px;height:" + h + "px;transform:rotateY(180deg) translateZ(" + (d / 2) + "px)";
        if (book.backCoverUrl) {
            back.innerHTML = '<img src="' + book.backCoverUrl + '" alt="뒷표지">';
        }

        // Spine
        var spineLeft = Math.floor((w - d) / 2);
        var spine = document.createElement("div");
        spine.className = "book3d-face book3d-spine";
        spine.style.cssText = "width:" + d + "px;height:" + h + "px;left:" + spineLeft + "px;transform:rotateY(-90deg) translateZ(" + (w / 2) + "px)";
        spine.innerHTML = '<img src="' + book.spineUrl + '" alt="책등">';

        // Fore edge
        var fore = document.createElement("div");
        fore.className = "book3d-face book3d-fore book3d-paper";
        fore.style.cssText = "width:" + d + "px;height:" + h + "px;left:" + spineLeft + "px;transform:rotateY(90deg) translateZ(" + (w / 2) + "px)";

        // Top
        var topFace = document.createElement("div");
        topFace.className = "book3d-face book3d-top book3d-paper";
        var topY = Math.floor((h - d) / 2);
        topFace.style.cssText = "width:" + w + "px;height:" + d + "px;top:" + topY + "px;transform:rotateX(90deg) translateZ(" + (h / 2) + "px)";

        // Bottom
        var bottomFace = document.createElement("div");
        bottomFace.className = "book3d-face book3d-bottom book3d-paper";
        bottomFace.style.cssText = "width:" + w + "px;height:" + d + "px;top:" + topY + "px;transform:rotateX(-90deg) translateZ(" + (h / 2) + "px)";

        bookEl.appendChild(front);
        bookEl.appendChild(back);
        bookEl.appendChild(spine);
        bookEl.appendChild(fore);
        bookEl.appendChild(topFace);
        bookEl.appendChild(bottomFace);
        scene.appendChild(bookEl);

        return { scene: scene, bookEl: bookEl };
    }

    function openDetail(idx, spineEl) {
        if (isDetailOpen) return;
        isDetailOpen = true;

        var book = BOOKS[idx];
        activeSpine = spineEl;
        spineEl.classList.add("active-spine");
        grid.classList.add("detail-open");
        filterBar.classList.add("hidden");

        // Build inline detail
        var b3d = createBook3D(book);

        var nationalityLabel = book.nationality === "JP"
            ? '<span class="hero-label">일본 미스터리</span>'
            : '<span class="hero-label hero-label-kr">한국 미스터리</span>';

        var keywordsHtml = "";
        if (book.keywords && book.keywords.length) {
            keywordsHtml = '<div class="hero-tags">';
            book.keywords.forEach(function (kw) {
                keywordsHtml += '<span class="hero-tag">' + kw + '</span>';
            });
            keywordsHtml += '</div>';
        }

        var descHtml = book.desc
            ? '<p class="hero-desc">' + book.desc + '</p>'
            : '';

        var priceStr = book.price.toLocaleString() + '원';

        var detail = document.createElement("div");
        detail.className = "book-detail-inline";
        detail.innerHTML =
            '<div class="hero-cover"></div>' +
            '<div class="hero-info">' +
                nationalityLabel +
                '<h1 class="hero-title">' + book.title + '</h1>' +
                '<p class="hero-author">' + book.author + '</p>' +
                descHtml +
                keywordsHtml +
                '<div class="hero-meta">' +
                    '<span class="hero-meta-item">' + book.publisher + '</span>' +
                    '<span class="hero-meta-sep">·</span>' +
                    '<span class="hero-meta-item">' + book.pubDate + '</span>' +
                    '<span class="hero-meta-sep">·</span>' +
                    '<span class="hero-meta-item">' + priceStr + '</span>' +
                    '<span class="hero-meta-sep">·</span>' +
                    '<a href="' + book.link + '" target="_blank" rel="noopener" class="hero-meta-link">알라딘</a>' +
                '</div>' +
            '</div>';

        detail.querySelector(".hero-cover").appendChild(b3d.scene);

        // Start with rotateY(-90deg) = spine face showing
        b3d.bookEl.style.transform = "rotateX(0deg) rotateY(-90deg)";

        detailContainer.innerHTML = "";
        detailContainer.appendChild(detail);

        // Animate: rotate to show cover
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                b3d.bookEl.style.transition = "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)";
                b3d.bookEl.style.transform = "rotateX(5deg) rotateY(-20deg)";
                detail.classList.add("visible");
            });
        });

        // Setup drag rotation
        setupDrag(b3d.scene, b3d.bookEl, -20, 5);
    }

    function closeDetail() {
        if (!isDetailOpen) return;
        isDetailOpen = false;

        var detail = detailContainer.querySelector(".book-detail-inline");
        var bookEl = document.getElementById("book3d-inline");

        if (detail) {
            detail.classList.remove("visible");
        }

        if (bookEl) {
            bookEl.style.transition = "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)";
            bookEl.style.transform = "rotateX(0deg) rotateY(-90deg)";
        }

        grid.classList.remove("detail-open");
        filterBar.classList.remove("hidden");

        if (activeSpine) {
            activeSpine.classList.remove("active-spine");
            activeSpine = null;
        }

        // Stagger fade in spines
        var spines = grid.querySelectorAll(".spine-wrapper");
        var delay = 0;
        spines.forEach(function (s) {
            if (s.style.display !== "none") {
                s.classList.remove("stagger-in");
                void s.offsetWidth;
                s.style.animationDelay = delay + "ms";
                s.classList.add("stagger-in");
                delay += 15;
            }
        });

        setTimeout(function () {
            detailContainer.innerHTML = "";
        }, 700);
    }

    // ─── Drag Rotation ───
    function setupDrag(scene, bookEl, initRotY, initRotX) {
        var rotY = initRotY, rotX = initRotX;
        var dragging = false;
        var lastX, lastY;

        scene.addEventListener("mousedown", function (e) {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            scene.style.cursor = "grabbing";
            bookEl.style.transition = "transform 0.1s ease-out";
            e.preventDefault();
        });

        document.addEventListener("mousemove", function (e) {
            if (!dragging) return;
            rotY += (e.clientX - lastX) * 0.5;
            rotX -= (e.clientY - lastY) * 0.3;
            rotX = Math.max(-40, Math.min(40, rotX));
            lastX = e.clientX;
            lastY = e.clientY;
            bookEl.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
        });

        document.addEventListener("mouseup", function () {
            if (!dragging) return;
            dragging = false;
            scene.style.cursor = "grab";
        });

        scene.addEventListener("touchstart", function (e) {
            dragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            bookEl.style.transition = "transform 0.1s ease-out";
        }, { passive: true });

        document.addEventListener("touchmove", function (e) {
            if (!dragging) return;
            e.preventDefault();
            rotY += (e.touches[0].clientX - lastX) * 0.5;
            rotX -= (e.touches[0].clientY - lastY) * 0.3;
            rotX = Math.max(-40, Math.min(40, rotX));
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            bookEl.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
        }, { passive: false });

        document.addEventListener("touchend", function () {
            dragging = false;
        });
    }

    // ─── Event Listeners ───
    grid.addEventListener("click", function (e) {
        var spineEl = e.target.closest(".spine-wrapper");
        if (!spineEl || isDetailOpen) return;
        var idx = parseInt(spineEl.getAttribute("data-idx"));
        if (isNaN(idx)) return;
        openDetail(idx, spineEl);
    });

    document.addEventListener("click", function (e) {
        if (!isDetailOpen) return;
        // Close if clicking outside the detail view and the 3D book
        if (!e.target.closest(".book-detail-inline") && !e.target.closest(".spine-wrapper")) {
            closeDetail();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && isDetailOpen) {
            closeDetail();
        }
    });

})();
