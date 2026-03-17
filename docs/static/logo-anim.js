// Logo animation: red dot fades between positions with acceleration/deceleration
// Starts at position 3 (home), cycles through all 8, pauses 8s at home
(function () {
    var dots = document.querySelectorAll(".red-pos");
    if (!dots.length) return;

    var HOME = 3;
    var current = HOME;
    var total = 8;

    // Intervals: slow at start, fast in middle, slow at end (ease in-out feel)
    // Order: home(3) -> 4 -> 5 -> 6 -> 7 -> 0 -> 1 -> 2 -> back to 3
    var delays = [500, 400, 300, 250, 300, 400, 500, 8000];

    function setActive(idx) {
        for (var i = 0; i < dots.length; i++) {
            dots[i].setAttribute("opacity", i === idx ? "1" : "0");
        }
    }

    var step = 0;

    function tick() {
        step = (step + 1) % total;
        current = (HOME + step) % total;
        setActive(current);
        setTimeout(tick, delays[step]);
    }

    // Start after initial pause
    setActive(HOME);
    setTimeout(tick, delays[delays.length - 1]);
})();
