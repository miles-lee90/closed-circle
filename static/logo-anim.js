// Logo animation: red dot fades between positions with accel/decel
// Home position: idx 2 (3 o'clock). Starts immediately, pauses 8s at home.
(function () {
    var dots = document.querySelectorAll(".red-pos");
    if (!dots.length) return;

    var HOME = 2;
    var total = 8;

    // Delays per step: slow → fast → slow, last one is the home pause
    var delays = [500, 400, 300, 250, 300, 400, 500, 8000];

    function setActive(idx) {
        for (var i = 0; i < dots.length; i++) {
            dots[i].setAttribute("opacity", i === idx ? "1" : "0");
        }
    }

    var step = 0;

    function tick() {
        step = (step + 1) % total;
        var current = (HOME + step) % total;
        setActive(current);
        setTimeout(tick, delays[step]);
    }

    // Start at home, begin animation immediately
    setActive(HOME);
    setTimeout(tick, 500);
})();
