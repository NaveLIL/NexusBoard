let widgetTimer = null;

function startWidgets() {
    updateWidgets();
    widgetTimer = setInterval(updateWidgets, 5000);
}

function stopWidgets() {
    if (widgetTimer) clearInterval(widgetTimer);
}

async function updateWidgets() {
    try {
        const data = await api.get('/system');
        if (data.error) return;

        setRing('widget-cpu', data.cpu.usage, `${data.cpu.usage}%`);
        document.getElementById('cpu-val').textContent = `${data.cpu.usage}%`;

        setRing('widget-ram', data.memory.percent, `${data.memory.percent}%`);
        document.getElementById('ram-val').textContent = `${data.memory.percent}%`;

        setRing('widget-disk', data.disk.percent, `${data.disk.percent}%`);
        document.getElementById('disk-val').textContent = `${data.disk.percent}%`;

        document.getElementById('uptime-val').textContent = data.uptime.formatted;

        // color coding
        colorRing('widget-cpu', data.cpu.usage);
        colorRing('widget-ram', data.memory.percent);
        colorRing('widget-disk', data.disk.percent);
    } catch {}
}

function setRing(widgetId, percent, label) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    const fill = widget.querySelector('.ring-fill');
    if (fill) fill.setAttribute('stroke-dasharray', `${percent} ${100 - percent}`);
}

function colorRing(widgetId, percent) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    const fill = widget.querySelector('.ring-fill');
    if (!fill) return;
    if (percent > 90) fill.style.stroke = 'var(--red)';
    else if (percent > 70) fill.style.stroke = 'var(--orange)';
    else if (percent > 50) fill.style.stroke = 'var(--yellow)';
    else fill.style.stroke = 'var(--accent)';
}
