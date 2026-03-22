async function loadServices() {
    const wrap = document.getElementById('services-wrap');
    const data = await api.get('/services');
    if (data.error) {
        wrap.innerHTML = `<p class="loading-text">${data.error}</p>`;
        return;
    }
    if (!data.length) {
        wrap.innerHTML = `<p class="loading-text">${t('dashboard.noResults') || 'Нет сервисов'}</p>`;
        return;
    }

    // group by category
    const groups = {};
    for (const svc of data) {
        const cat = svc.category || 'Прочее';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(svc);
    }

    wrap.innerHTML = '';
    let delay = 0;
    for (const [catName, services] of Object.entries(groups)) {
        const group = document.createElement('div');
        group.className = 'category-group';
        group.innerHTML = `<h3 class="category-title">${escapeHtml(catName)}</h3>`;

        const grid = document.createElement('div');
        grid.className = 'services-grid';

        for (const svc of services) {
            const card = document.createElement('a');
            card.className = 'service-card card-enter';
            card.href = svc.url;
            card.target = '_blank';
            card.rel = 'noopener';
            card.draggable = true;
            card.dataset.serviceId = svc.id;
            card.style.animationDelay = `${delay}ms`;
            delay += 40;

            const iconContent = svc.icon
                ? (svc.icon.startsWith('http') || svc.icon.startsWith('/')
                    ? `<img src="${escapeHtml(svc.icon)}" alt="">`
                    : svc.icon)
                : svc.name[0]?.toUpperCase() || '?';

            card.innerHTML = `
                <div class="svc-icon">${iconContent}</div>
                <div class="svc-body">
                    <div class="svc-name">${escapeHtml(svc.name)}</div>
                    <div class="svc-desc">${escapeHtml(svc.description)}</div>
                </div>
                <div class="svc-status ${svc.health}"></div>
            `;
            grid.appendChild(card);
        }

        group.appendChild(grid);
        wrap.appendChild(group);
    }
}

function filterServices(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.service-card').forEach(card => {
        const name = card.querySelector('.svc-name')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.svc-desc')?.textContent.toLowerCase() || '';
        card.style.display = (name.includes(q) || desc.includes(q)) ? '' : 'none';
    });

    // hide empty categories
    document.querySelectorAll('.category-group').forEach(group => {
        const visible = group.querySelectorAll('.service-card:not([style*="display: none"])');
        group.style.display = visible.length ? '' : 'none';
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
}
