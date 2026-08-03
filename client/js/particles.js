// lightweight particles on login screen
let currentRaf = null;
let currentResizeHandler = null;

function stopParticles() {
    if (currentRaf) {
        cancelAnimationFrame(currentRaf);
        currentRaf = null;
    }
    if (currentResizeHandler) {
        window.removeEventListener('resize', currentResizeHandler);
        currentResizeHandler = null;
    }
}

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dots = [];

    stopParticles();

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    function createDots() {
        dots = [];
        const count = Math.floor((w * h) / 12000);
        for (let i = 0; i < count; i++) {
            dots.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 1.5 + 0.5,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.lineWidth = 1;

        for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            d.x += d.vx; d.y += d.vy;
            if (d.x < 0 || d.x > w) d.vx *= -1;
            if (d.y < 0 || d.y > h) d.vy *= -1;

            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();

            // connect nearby dots
            for (let j = i + 1; j < dots.length; j++) {
                const d2 = dots[j];
                const dx = d.x - d2.x, dy = d.y - d2.y;
                const dist = dx * dx + dy * dy;
                if (dist < 14000) {
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(d2.x, d2.y);
                    ctx.stroke();
                }
            }
        }
        currentRaf = requestAnimationFrame(draw);
    }

    resize();
    createDots();
    draw();

    currentResizeHandler = () => { resize(); createDots(); };
    window.addEventListener('resize', currentResizeHandler);

    return stopParticles;
}
