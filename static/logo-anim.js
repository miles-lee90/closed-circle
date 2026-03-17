// Logo animation: red dot fades + scales between positions
// Home: idx 3. Starts and ends there. Pauses 8s at home.
(function () {
    var dots = document.querySelectorAll(".red-pos");
    if (!dots.length) return;

    var HOME = 3;
    var total = 8;
    var BASE_R = 2.8;
    var SMALL_R = 1.2;

    // delays: moderate accel/decel
    var delays = [650, 450, 300, 200, 200, 300, 550, 8000];

    function setActive(idx) {
        for (var i = 0; i < dots.length; i++) {
            if (i === idx) {
                dots[i].setAttribute("opacity", "1");
                dots[i].setAttribute("r", BASE_R);
            } else {
                dots[i].setAttribute("opacity", "0");
                dots[i].setAttribute("r", SMALL_R);
            }
        }
    }

    var step = 0;
    setActive(HOME);

    function tick() {
        step++;
        if (step >= total) {
            step = 0;
            setActive(HOME);
            setTimeout(tick, delays[total - 1]);
            return;
        }
        var current = (HOME + step) % total;
        setActive(current);
        setTimeout(tick, delays[step - 1]);
    }

    setTimeout(tick, 500);
})();
