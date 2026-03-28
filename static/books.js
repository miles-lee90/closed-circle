(function () {
    "use strict";

    function escapeHtml(s) {
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(s));
        return div.innerHTML;
    }

    var grid = document.getElementById("book-grid");
    var filterBar = document.getElementById("floating-filter");
    var filterBtns = filterBar.querySelectorAll(".floating-filter-btn");
    var perspWrapper = document.getElementById("book-persp-wrapper");
    var detailContainer = document.getElementById("book-detail-container");
    var slides = grid.querySelectorAll(".book-slide");

    // ─── Scroll-following perspective origin (rAF-throttled) ───
    var perspTicking = false;
    function updatePerspOrigin() {
        var rect = perspWrapper.getBoundingClientRect();
        var viewCenterY = window.innerHeight / 2;
        var originY = viewCenterY - rect.top;
        originY = Math.max(0, Math.min(rect.height, originY));
        perspWrapper.style.perspectiveOrigin = "50% " + (originY / rect.height * 100) + "%";
        perspTicking = false;
    }
    function onScrollResize() {
        if (!perspTicking) {
            perspTicking = true;
            requestAnimationFrame(updatePerspOrigin);
        }
    }
    window.addEventListener("scroll", onScrollResize, { passive: true });
    window.addEventListener("resize", onScrollResize);
    updatePerspOrigin();

    // ─── Adjust faces based on spine image ratio ───
    document.querySelectorAll(".book-item").forEach(function (bookEl) {
        var spineImg = bookEl.querySelector(".book3d-spine img");
        if (!spineImg) return;
        function adjust() {
            if (!spineImg.naturalWidth || !spineImg.naturalHeight) return;
            var bw = bookEl.offsetWidth, bh = bookEl.offsetHeight;
            var bd = Math.round(bh * (spineImg.naturalWidth / spineImg.naturalHeight));
            var halfBd = Math.floor(bd / 2);
            var spineLeft = Math.floor((bw - bd) / 2);
            var s = bookEl.querySelector(".book3d-spine");
            s.style.width = bd + "px"; s.style.left = spineLeft + "px";
            var fr = bookEl.querySelector(".book3d-front");
            if (fr) fr.style.transform = "translateZ(" + halfBd + "px)";
            var bk = bookEl.querySelector(".book3d-back");
            if (bk) bk.style.transform = "rotateY(180deg) translateZ(" + halfBd + "px)";
        }
        if (spineImg.complete) adjust(); else spineImg.addEventListener("load", adjust);
    });

    // ─── Hover (on .book-slide wrappers) ───
    var currentHovered = null;
    var spinesList = grid.querySelectorAll(".book3d-spine");

    document.addEventListener("mousemove", function (e) {
        if (isDetailOpen) return;
        var mx = e.clientX, my = e.clientY, found = null;
        for (var i = 0; i < spinesList.length; i++) {
            var rect = spinesList[i].getBoundingClientRect();
            if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
                found = spinesList[i].closest(".book-slide");
                break;
            }
        }
        if (found !== currentHovered) {
            if (currentHovered) currentHovered.classList.remove("hovered");
            if (found) found.classList.add("hovered");
            currentHovered = found;
        }
    });

    // ─── Filter ───
    filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            filterBtns.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            var filter = btn.getAttribute("data-filter");
            slides.forEach(function (slide) {
                var show = filter === "all" || slide.getAttribute("data-nationality") === filter;
                slide.style.display = show ? "" : "none";
            });
        });
    });

    // ─── Detail View ───
    var isDetailOpen = false;
    var isAnimating = false;
    var selectedSlide = null;
    var dragCleanup = null;
    var currentRotX = 3, currentRotY = -35;

    grid.addEventListener("click", function () {
        if (!currentHovered || isAnimating || isDetailOpen) return;
        var idx = parseInt(currentHovered.getAttribute("data-idx"));
        if (isNaN(idx)) return;
        openDetail(idx, currentHovered);
    });

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function createExtraFaces(bookItem) {
        var bw = bookItem.offsetWidth;
        var bh = bookItem.offsetHeight;
        var spineImg = bookItem.querySelector(".book3d-spine img");
        var bd = 35;
        if (spineImg && spineImg.naturalWidth && spineImg.naturalHeight) {
            bd = Math.round(bh * (spineImg.naturalWidth / spineImg.naturalHeight));
        }
        var halfBd = Math.floor(bd / 2);
        var spineLeft = Math.floor((bw - bd) / 2);
        var topY = Math.floor((bh - bd) / 2);

        var fore = document.createElement("div");
        fore.className = "book3d-face book3d-fore book3d-paper";
        fore.setAttribute("data-extra-face", "true");
        fore.style.cssText = "width:" + bd + "px;height:" + bh + "px;left:" + spineLeft + "px;transform:rotateY(90deg) translateZ(" + (bw / 2) + "px)";

        var top = document.createElement("div");
        top.className = "book3d-face book3d-top book3d-paper";
        top.setAttribute("data-extra-face", "true");
        top.style.cssText = "width:" + bw + "px;height:" + bd + "px;top:" + topY + "px;transform:rotateX(90deg) translateZ(" + (bh / 2) + "px)";

        var bottom = document.createElement("div");
        bottom.className = "book3d-face book3d-bottom book3d-paper";
        bottom.setAttribute("data-extra-face", "true");
        bottom.style.cssText = "width:" + bw + "px;height:" + bd + "px;top:" + topY + "px;transform:rotateX(-90deg) translateZ(" + (bh / 2) + "px)";

        bookItem.appendChild(fore);
        bookItem.appendChild(top);
        bookItem.appendChild(bottom);
    }

    function removeExtraFaces(bookItem) {
        var extras = bookItem.querySelectorAll("[data-extra-face]");
        extras.forEach(function (el) { el.remove(); });
    }

    function openDetail(idx, slide) {
        isAnimating = true;
        isDetailOpen = true;
        selectedSlide = slide;
        history.pushState({ detail: true }, "");
        var book = BOOKS[idx];
        var bookItem = slide.querySelector(".book-item");
        createExtraFaces(bookItem);
        var allSlides = Array.from(slides);
        var selectedIdx = allSlides.indexOf(slide);

        // Phase 1: Dismiss other books (wrapper translateY, no 3D interference)
        filterBar.classList.add("hidden");
        allSlides.forEach(function (s, i) {
            if (s === slide) return;
            s.classList.add(i < selectedIdx ? "dismiss-up" : "dismiss-down");
        });

        // Phase 2: After dismiss, rotate + move simultaneously
        setTimeout(function () {
            // Hide dismissed
            allSlides.forEach(function (s) {
                if (s !== slide) s.style.visibility = "hidden";
            });

            document.body.classList.add("detail-active");
            slide.style.transition = "none";
            slide.style.zIndex = "200";

            var endLeft = Math.round(window.innerWidth * 0.22);
            var endTop = 160;

            // Measure slide's pure box position (remove 3D transform temporarily)
            var saved = bookItem.style.transform;
            bookItem.style.transform = "none";
            var boxRect = slide.getBoundingClientRect();
            bookItem.style.transform = saved;

            var dx = endLeft - boxRect.left;
            var dy = endTop - boxRect.top;

            var duration = 1000;
            var start = { scale: 1.33, rx: -90, ry: -180, rz: 90 };
            var end = { scale: 1, rx: 3, ry: -35, rz: 0 };
            var startTime = null;

            function frame(ts) {
                if (!startTime) startTime = ts;
                var t = Math.min((ts - startTime) / duration, 1);
                var et = easeInOutCubic(t);

                var sc = lerp(start.scale, end.scale, et);
                var rx = lerp(start.rx, end.rx, et);
                var ry = lerp(start.ry, end.ry, et);
                var rz = lerp(start.rz, end.rz, et);

                bookItem.style.transform = "scale(" + sc.toFixed(3) + ") rotateX(" + rx.toFixed(1) + "deg) rotateY(" + ry.toFixed(1) + "deg) rotateZ(" + rz.toFixed(1) + "deg)";

                slide.style.transform = "translate(" + (dx * et).toFixed(1) + "px, " + (dy * et).toFixed(1) + "px)";

                if (t < 1) {
                    requestAnimationFrame(frame);
                } else {
                    // Stay in flow with translate — no fixed switch, no perspective jump
                    showInfo(book, bookItem);
                }
            }
            requestAnimationFrame(frame);
        }, 500);
    }

    function showInfo(book, bookItem) {
        // Build hero-feature layout (book left, info right)
        var nationalityLabel = book.nationality === "JP"
            ? '<span class="hero-label">일본 미스터리</span>'
            : '<span class="hero-label hero-label-kr">한국 미스터리</span>';

        var keywordsHtml = "";
        if (book.keywords && book.keywords.length) {
            keywordsHtml = '<div class="hero-tags">';
            book.keywords.forEach(function (kw) {
                keywordsHtml += '<span class="hero-tag">' + escapeHtml(kw) + '</span>';
            });
            keywordsHtml += '</div>';
        }

        var descHtml = book.desc
            ? '<div class="hero-desc-wrap"><p class="hero-desc hero-desc-collapsed">' + escapeHtml(book.desc) + '</p>' +
              (book.desc.length > 150 ? '<button class="desc-toggle">더보기</button>' : '') + '</div>'
            : '';

        var priceStr = book.price.toLocaleString() + '원';

        detailContainer.innerHTML =
            '<div class="detail-info-panel">' +
                '<div class="hero-info">' +
                    nationalityLabel +
                    '<h1 class="hero-title">' + escapeHtml(book.title) + '</h1>' +
                    '<p class="hero-author">' + escapeHtml(book.author) + '</p>' +
                    descHtml +
                    keywordsHtml +
                    '<div class="hero-meta">' +
                        '<span class="hero-meta-item">' + escapeHtml(book.publisher) + '</span>' +
                        '<span class="hero-meta-sep">·</span>' +
                        '<span class="hero-meta-item">' + escapeHtml(book.pubDate) + '</span>' +
                        '<span class="hero-meta-sep">·</span>' +
                        '<span class="hero-meta-item">' + priceStr + '</span>' +
                        '<span class="hero-meta-sep">·</span>' +
                        '<a href="' + escapeHtml(book.link) + '" target="_blank" rel="noopener" class="hero-meta-link">알라딘</a>' +
                    '</div>' +
                '</div>' +
            '</div>';

        var panel = detailContainer.querySelector(".detail-info-panel");
        requestAnimationFrame(function () { panel.classList.add("visible"); });

        // 더보기
        var toggleBtn = detailContainer.querySelector(".desc-toggle");
        if (toggleBtn) {
            toggleBtn.addEventListener("click", function () {
                var desc = this.previousElementSibling;
                desc.classList.toggle("hero-desc-collapsed");
                this.textContent = desc.classList.contains("hero-desc-collapsed") ? "더보기" : "접기";
            });
        }

        // Drag rotation on the book (mouse + touch)
        var rotY = currentRotY = -35, rotX = currentRotX = 3;
        var dragging = false, lastX, lastY;
        bookItem.style.cursor = "grab";

        function onDragStart(x, y) {
            dragging = true; lastX = x; lastY = y;
            bookItem.style.cursor = "grabbing";
        }
        function onDragMove(x, y) {
            if (!dragging) return;
            rotY += (x - lastX) * 0.5;
            rotX -= (y - lastY) * 0.3;
            rotX = Math.max(-40, Math.min(40, rotX));
            lastX = x; lastY = y;
            currentRotX = rotX; currentRotY = rotY;
            bookItem.style.transform = "scale(1) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
        }
        function onDragEnd() {
            if (!dragging) return; dragging = false; bookItem.style.cursor = "grab";
        }

        function onMouseDown(e) { onDragStart(e.clientX, e.clientY); e.preventDefault(); }
        function onMouseMove(e) { onDragMove(e.clientX, e.clientY); }
        function onTouchStart(e) { var t = e.touches[0]; onDragStart(t.clientX, t.clientY); e.preventDefault(); }
        function onTouchMove(e) { if (!dragging) return; var t = e.touches[0]; onDragMove(t.clientX, t.clientY); e.preventDefault(); }

        bookItem.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onDragEnd);
        bookItem.addEventListener("touchstart", onTouchStart, { passive: false });
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onDragEnd);

        dragCleanup = function () {
            bookItem.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onDragEnd);
            bookItem.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onDragEnd);
            dragCleanup = null;
        };

        isAnimating = false;
    }

    function closeDetail() {
        if (isAnimating || !isDetailOpen) return;
        isAnimating = true;

        // Fade out info
        var panel = detailContainer.querySelector(".detail-info-panel");
        if (panel) panel.classList.remove("visible");

        // Rotate book back
        var bookItem = selectedSlide ? selectedSlide.querySelector(".book-item") : null;
        if (bookItem) {
            var duration = 700;
            var startTime = null;
            var start = { scale: 1, rx: currentRotX, ry: currentRotY, rz: 0 };
            var end = { scale: 1.33, rx: -90, ry: -180, rz: 90 };

            function frame(ts) {
                if (!startTime) startTime = ts;
                var t = Math.min((ts - startTime) / duration, 1);
                var et = easeInOutCubic(t);
                bookItem.style.transform = "scale(" + lerp(start.scale, end.scale, et).toFixed(3) + ") rotateX(" + lerp(start.rx, end.rx, et).toFixed(1) + "deg) rotateY(" + lerp(start.ry, end.ry, et).toFixed(1) + "deg) rotateZ(" + lerp(start.rz, end.rz, et).toFixed(1) + "deg)";
                if (t < 1) requestAnimationFrame(frame);
                else finishClose();
            }
            requestAnimationFrame(frame);
        } else {
            finishClose();
        }

        function finishClose() {
            if (dragCleanup) dragCleanup();
            detailContainer.innerHTML = "";
            document.body.classList.remove("detail-active");

            // Remember which slide was selected
            var scrollTarget = selectedSlide;

            // Restore all slides
            slides.forEach(function (s) {
                s.classList.remove("dismiss-up", "dismiss-down", "hovered");
                s.style.visibility = "";
                s.style.display = "";
                s.style.transform = "";
                s.style.position = "";
                s.style.top = "";
                s.style.left = "";
                s.style.margin = "";
                s.style.zIndex = "";
                s.style.transition = "";
            });

            // Reset book transform
            if (bookItem) {
                bookItem.style.transform = "";
                bookItem.style.cursor = "";
                removeExtraFaces(bookItem);
            }

            filterBar.classList.remove("hidden");
            currentHovered = null;
            selectedSlide = null;
            isDetailOpen = false;
            isAnimating = false;

            // Scroll to center the selected book in viewport
            if (scrollTarget) {
                requestAnimationFrame(function () {
                    var rect = scrollTarget.getBoundingClientRect();
                    var scrollY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
                    window.scrollTo({ top: scrollY, behavior: "smooth" });
                });
            }
        }
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && isDetailOpen && !isAnimating) closeDetail();
    });

    // Browser back button closes detail
    window.addEventListener("popstate", function () {
        if (isDetailOpen && !isAnimating) closeDetail();
    });

})();
