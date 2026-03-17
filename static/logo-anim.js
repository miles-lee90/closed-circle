// Logo animation: red dot fades between positions with accel/decel
// Home: idx 3 (4-5 o'clock). Starts and ends there. Pauses 8s at home.
(function () {
    var dots = document.querySelectorAll(".red-pos");
    if (!dots.length) return;

    var HOME = 3;
    var total = 8;

    // Step order: from home, visit all other 7 positions, then return home
    // delays: slow start → accelerate → decelerate → long pause at home
    var delays = [500, 400, 300, 250, 300, 400, 500, 8000];

    function setActive(idx) {
        for (var i = 0; i < dots.length; i++) {
            dots[i].setAttribute("opacity", i === idx ? "1" : "0");
        }
    }

    var step = 0;
    setActive(HOME);

    function tick() {
        step++;
        if (step >= total) {
            // Back to home — pause then restart
            step = 0;
            setActive(HOME);
            setTimeout(tick, delays[total - 1]);
            return;
        }
        var current = (HOME + step) % total;
        setActive(current);
        setTimeout(tick, delays[step - 1]);
    }

    // Start first cycle after 0.5s
    setTimeout(tick, 500);
})();
