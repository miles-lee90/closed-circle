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
    // Cache wrapper offset to avoid getBoundingClientRect in scroll handler
    var wrapperTop = 0, wrapperHeight = 0;
    function measureWrapper() {
        wrapperTop = perspWrapper.offsetTop;
        wrapperHeight = perspWrapper.offsetHeight;
    }
    measureWrapper();

    function updatePerspOrigin() {
        var scrollY = window.scrollY || window.pageYOffset;
        var viewCenterY = scrollY + window.innerHeight / 2;
        var originY = viewCenterY - wrapperTop;
        originY = Math.max(0, Math.min(wrapperHeight, originY));
        perspWrapper.style.perspectiveOrigin = "50% " + (originY / wrapperHeight * 100) + "%";
        perspTicking = false;
    }
    function onScroll() {
        if (!perspTicking) {
            perspTicking = true;
            requestAnimationFrame(updatePerspOrigin);
        }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
        measureWrapper();
        updatePerspOrigin();
    });
    updatePerspOrigin();

    // ─── Viewport culling via IntersectionObserver ───
    var cullObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            entry.target.style.visibility = entry.isIntersecting ? "" : "hidden";
        });
    }, { rootMargin: "600px 0px" });
    slides.forEach(function (s) { cullObserver.observe(s); });

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
            var topY = Math.floor((bh - bd) / 2);
            var s = bookEl.querySelector(".book3d-spine");
            s.style.width = bd + "px"; s.style.left = spineLeft + "px";
            var f = bookEl.querySelector(".book3d-fore");
            if (f) { f.style.width = bd + "px"; f.style.left = spineLeft + "px"; }
            var t = bookEl.querySelector(".book3d-top");
            if (t) { t.style.height = bd + "px"; t.style.top = topY + "px"; }
            var b = bookEl.querySelector(".book3d-bottom");
            if (b) { b.style.height = bd + "px"; b.style.top = topY + "px"; }
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
    var hoverTicking = false;
    var hoverX = 0, hoverY = 0;

    function updateHover() {
        hoverTicking = false;
        if (isDetailOpen) return;
        var found = null;
        for (var i = 0; i < spinesList.length; i++) {
            var rect = spinesList[i].getBoundingClientRect();
            if (hoverX >= rect.left && hoverX <= rect.right && hoverY >= rect.top && hoverY <= rect.bottom) {
                found = spinesList[i].closest(".book-slide");
                break;
            }
        }
        if (found !== currentHovered) {
            if (currentHovered) currentHovered.classList.remove("hovered");
            if (found) found.classList.add("hovered");
            currentHovered = found;
        }
    }

    document.addEventListener("mousemove", function (e) {
        hoverX = e.clientX;
        hoverY = e.clientY;
        if (!hoverTicking) {
            hoverTicking = true;
            requestAnimationFrame(updateHover);
        }
    });

    // ─── Filter ───
    var activeKeywordFilter = null;
    var keywordLabel = document.getElementById("keyword-filter-label");
    var keywordText = keywordLabel ? keywordLabel.querySelector(".keyword-filter-text") : null;
    var keywordClear = keywordLabel ? keywordLabel.querySelector(".keyword-filter-clear") : null;

    function applyFilters() {
        var activeBtn = filterBar.querySelector(".floating-filter-btn.active");
        var natFilter = activeBtn ? activeBtn.getAttribute("data-filter") : "all";
        slides.forEach(function (slide) {
            var natOk = natFilter === "all" || slide.getAttribute("data-nationality") === natFilter;
            var kwOk = true;
            if (activeKeywordFilter) {
                var idx = parseInt(slide.getAttribute("data-idx"));
                var book = BOOKS[idx];
                kwOk = book.keywords && book.keywords.indexOf(activeKeywordFilter) !== -1;
            }
            slide.style.display = (natOk && kwOk) ? "" : "none";
        });
        if (keywordLabel) {
            if (activeKeywordFilter) {
                keywordText.textContent = activeKeywordFilter;
                keywordLabel.style.display = "";
            } else {
                keywordLabel.style.display = "none";
            }
        }
    }

    filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            filterBtns.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");
            applyFilters();
        });
    });

    if (keywordClear) {
        keywordClear.addEventListener("click", function () {
            activeKeywordFilter = null;
            applyFilters();
        });
    }

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

    // Quaternion helpers for smooth shortest-path rotation
    function eulerToQuat(rx, ry, rz) {
        var deg = Math.PI / 180;
        var cx = Math.cos(rx * deg / 2), sx = Math.sin(rx * deg / 2);
        var cy = Math.cos(ry * deg / 2), sy = Math.sin(ry * deg / 2);
        var cz = Math.cos(rz * deg / 2), sz = Math.sin(rz * deg / 2);
        return {
            w: cx * cy * cz + sx * sy * sz,
            x: sx * cy * cz - cx * sy * sz,
            y: cx * sy * cz + sx * cy * sz,
            z: cx * cy * sz - sx * sy * cz
        };
    }
    function quatSlerp(a, b, t) {
        var dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
        if (dot < 0) { b = { w: -b.w, x: -b.x, y: -b.y, z: -b.z }; dot = -dot; }
        if (dot > 0.9995) {
            return {
                w: a.w + (b.w - a.w) * t,
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                z: a.z + (b.z - a.z) * t
            };
        }
        var theta = Math.acos(Math.min(dot, 1));
        var sinT = Math.sin(theta);
        var wa = Math.sin((1 - t) * theta) / sinT;
        var wb = Math.sin(t * theta) / sinT;
        return {
            w: wa * a.w + wb * b.w,
            x: wa * a.x + wb * b.x,
            y: wa * a.y + wb * b.y,
            z: wa * a.z + wb * b.z
        };
    }
    function quatToMatrix3d(q) {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var x2 = x + x, y2 = y + y, z2 = z + z;
        var xx = x * x2, xy = x * y2, xz = x * z2;
        var yy = y * y2, yz = y * z2, zz = z * z2;
        var wx = w * x2, wy = w * y2, wz = w * z2;
        return [
            1 - (yy + zz), xy + wz, xz - wy, 0,
            xy - wz, 1 - (xx + zz), yz + wx, 0,
            xz + wy, yz - wx, 1 - (xx + yy), 0,
            0, 0, 0, 1
        ];
    }
    function scaleMatrix3d(m, s) {
        return "matrix3d(" +
            (m[0]*s)+","+(m[1]*s)+","+(m[2]*s)+",0,"+
            (m[4]*s)+","+(m[5]*s)+","+(m[6]*s)+",0,"+
            (m[8]*s)+","+(m[9]*s)+","+(m[10]*s)+",0,"+
            "0,0,0,1)";
    }

    function createExtraFaces(bookItem) {
        var bw = bookItem.offsetWidth;
        var bh = bookItem.offsetHeight;
        var spineEl = bookItem.querySelector(".book3d-spine");
        var bd = parseInt(spineEl.style.width) || Math.round(bh * 0.08);
        var spineLeft = parseInt(spineEl.style.left) || Math.floor((bw - bd) / 2);
        var topY = Math.floor((bh - bd) / 2);
        var halfBw = Math.floor(bw / 2);
        var halfBh = Math.floor(bh / 2);

        var faces = [
            { cls: "book3d-fore book3d-paper", css: "width:" + bd + "px;height:" + bh + "px;top:0;left:" + spineLeft + "px;transform:rotateY(90deg) translateZ(" + halfBw + "px)" },
            { cls: "book3d-top book3d-paper", css: "width:" + bw + "px;height:" + bd + "px;top:" + topY + "px;transform:rotateX(90deg) translateZ(" + halfBh + "px)" },
            { cls: "book3d-bottom book3d-paper", css: "width:" + bw + "px;height:" + bd + "px;top:" + topY + "px;transform:rotateX(-90deg) translateZ(" + halfBh + "px)" }
        ];
        faces.forEach(function (f) {
            var el = document.createElement("div");
            el.className = "book3d-face " + f.cls;
            el.setAttribute("data-extra-face", "true");
            el.style.cssText = f.css;
            bookItem.appendChild(el);
        });
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

        // Measure position BEFORE any DOM changes (no reflow during animation)
        var slideRect = slide.getBoundingClientRect();
        var isMobile = window.innerWidth <= 768;
        var endLeft = isMobile
            ? Math.round((window.innerWidth - bookItem.offsetWidth) / 2)
            : Math.round(window.innerWidth * 0.22);
        var endTop = isMobile ? 80 : 160;
        var dx = endLeft - slideRect.left;
        var dy = endTop - slideRect.top;

        createExtraFaces(bookItem);
        var allSlides = Array.from(slides);
        var selectedIdx = allSlides.indexOf(slide);

        // Phase 1: Dismiss other books
        filterBar.classList.add("hidden");
        allSlides.forEach(function (s, i) {
            if (s === slide) return;
            s.classList.add(i < selectedIdx ? "dismiss-up" : "dismiss-down");
        });

        // Phase 2: Wait for dismiss transition to end
        var dismissDone = false;
        function startRotation() {
            if (dismissDone) return;
            dismissDone = true;

            allSlides.forEach(function (s) {
                if (s !== slide) s.style.visibility = "hidden";
            });

            document.body.classList.add("detail-active");
            slide.style.transition = "none";
            slide.style.zIndex = "200";

            var duration = 800;
            var startScale = 1.33, endScale = 1;
            var qStart = eulerToQuat(-90, -180, 90);
            var qEnd = eulerToQuat(3, -35, 0);
            var startTime = null;

            function frame(ts) {
                if (!startTime) startTime = ts;
                var t = Math.min((ts - startTime) / duration, 1);
                var et = easeInOutCubic(t);

                var sc = lerp(startScale, endScale, et);
                var q = quatSlerp(qStart, qEnd, et);
                var m = quatToMatrix3d(q);
                bookItem.style.transform = scaleMatrix3d(m, sc);

                slide.style.transform = "translate(" + (dx * et).toFixed(1) + "px, " + (dy * et).toFixed(1) + "px)";

                if (t < 1) {
                    requestAnimationFrame(frame);
                } else {
                    // Stay in flow with translate — no fixed switch, no perspective jump
                    showInfo(book, bookItem);
                }
            }
            requestAnimationFrame(frame);
        }

        // Use transitionend on a dismiss slide, with setTimeout fallback
        var dismissTarget = allSlides[selectedIdx > 0 ? 0 : allSlides.length - 1];
        if (dismissTarget && dismissTarget !== slide) {
            dismissTarget.addEventListener("transitionend", function handler(e) {
                if (e.propertyName !== "transform") return;
                dismissTarget.removeEventListener("transitionend", handler);
                startRotation();
            });
        }
        // Fallback in case transitionend doesn't fire (no other slides, etc.)
        setTimeout(startRotation, 550);
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
                keywordsHtml += '<span class="hero-tag hero-tag-clickable" data-keyword="' + escapeHtml(kw) + '">' + escapeHtml(kw) + '</span>';
            });
            keywordsHtml += '</div>';
        }

        var priceStr = book.price.toLocaleString() + '원';

        detailContainer.innerHTML =
            '<div class="detail-info-panel">' +
                '<div class="hero-info">' +
                    nationalityLabel +
                    '<h1 class="hero-title">' + escapeHtml(book.title) + '</h1>' +
                    '<p class="hero-author">' + escapeHtml(book.author) + '</p>' +
                    '<div class="hero-desc-slot"></div>' +
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
                    (book.previewIsbn ? '<button class="preview-btn" data-isbn="' + escapeHtml(book.previewIsbn) + '">미리보기</button>' : '') +
                '</div>' +
            '</div>';

        var panel = detailContainer.querySelector(".detail-info-panel");
        requestAnimationFrame(function () { panel.classList.add("visible"); });

        // Lazy-load description
        var descSlot = detailContainer.querySelector(".hero-desc-slot");
        if (descSlot && book.isbn) {
            fetch("data/descs.json").then(function (r) { return r.json(); }).then(function (descs) {
                var desc = descs[book.isbn];
                if (!desc || !descSlot.parentNode) return;
                descSlot.innerHTML =
                    '<div class="hero-desc-wrap"><p class="hero-desc hero-desc-collapsed">' + escapeHtml(desc) + '</p>' +
                    (desc.length > 150 ? '<button class="desc-toggle">더보기</button>' : '') + '</div>';
                var toggleBtn = descSlot.querySelector(".desc-toggle");
                if (toggleBtn) {
                    toggleBtn.addEventListener("click", function () {
                        var p = this.previousElementSibling;
                        p.classList.toggle("hero-desc-collapsed");
                        this.textContent = p.classList.contains("hero-desc-collapsed") ? "더보기" : "접기";
                    });
                }
            }).catch(function () {});
        }

        // 미리보기
        var previewBtn = detailContainer.querySelector(".preview-btn");
        if (previewBtn) {
            previewBtn.addEventListener("click", function () {
                var isbn = this.getAttribute("data-isbn");
                var overlay = document.createElement("div");
                overlay.className = "preview-overlay";
                overlay.innerHTML =
                    '<div class="preview-wrap">' +
                        '<button class="preview-close">&times;</button>' +
                        '<iframe src="https://www.aladin.co.kr/shop/book/wletslookViewer.aspx?ISBN=' + escapeHtml(isbn) + '" class="preview-iframe"></iframe>' +
                    '</div>';
                document.body.appendChild(overlay);
                requestAnimationFrame(function () { overlay.classList.add("active"); });
                overlay.querySelector(".preview-close").addEventListener("click", function () {
                    overlay.classList.remove("active");
                    setTimeout(function () { overlay.remove(); }, 300);
                });
                overlay.addEventListener("click", function (e) {
                    if (e.target === overlay) {
                        overlay.classList.remove("active");
                        setTimeout(function () { overlay.remove(); }, 300);
                    }
                });
            });
        }

        // Keyword tag click → filter
        detailContainer.addEventListener("click", function (e) {
            var tag = e.target.closest(".hero-tag-clickable");
            if (!tag) return;
            activeKeywordFilter = tag.getAttribute("data-keyword");
            closeDetail();
        });

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
            var duration = 600;
            var startTime = null;
            var closeStartScale = 1, closeEndScale = 1.33;
            var qCloseStart = eulerToQuat(currentRotX, currentRotY, 0);
            var qCloseEnd = eulerToQuat(-90, -180, 90);

            function frame(ts) {
                if (!startTime) startTime = ts;
                var t = Math.min((ts - startTime) / duration, 1);
                var et = easeInOutCubic(t);
                var sc = lerp(closeStartScale, closeEndScale, et);
                var q = quatSlerp(qCloseStart, qCloseEnd, et);
                var m = quatToMatrix3d(q);
                bookItem.style.transform = scaleMatrix3d(m, sc);
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

            var scrollTarget = selectedSlide;
            var selectedIdx = scrollTarget ? Array.from(slides).indexOf(scrollTarget) : -1;

            // Kill ALL transitions (slides + book-item) before any style changes
            if (bookItem) {
                bookItem.style.transition = "none";
                removeExtraFaces(bookItem);
                bookItem.style.transform = "";
                bookItem.style.cursor = "";
            }
            slides.forEach(function (s) {
                s.style.transition = "none";
                s.classList.remove("dismiss-up", "dismiss-down", "hovered");
                s.style.transform = "";
                s.style.position = "";
                s.style.top = "";
                s.style.left = "";
                s.style.margin = "";
                s.style.zIndex = "";
            });

            // Flush styles so resets apply instantly (no transition)
            void grid.offsetHeight;

            // Show only ~8 slides near the selected book (by index, no getBoundingClientRect)
            var nearRange = 5;
            slides.forEach(function (s, i) {
                s.style.visibility = (Math.abs(i - selectedIdx) <= nearRange) ? "" : "hidden";
            });

            document.body.classList.remove("detail-active");
            filterBar.classList.remove("hidden");
            applyFilters();
            currentHovered = null;
            selectedSlide = null;
            isDetailOpen = false;
            isAnimating = false;

            // Next frame: re-enable transitions + scroll
            requestAnimationFrame(function () {
                if (bookItem) bookItem.style.transition = "";
                slides.forEach(function (s) {
                    s.style.transition = "";
                });
                if (scrollTarget) {
                    var rect = scrollTarget.getBoundingClientRect();
                    var scrollY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
                    window.scrollTo({ top: scrollY, behavior: "smooth" });
                }
            });
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
