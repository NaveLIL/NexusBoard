const ICON_CDN = 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg';

const ICON_SLUGS = {
    'jellyfin': 'jellyfin', 'jellyseerr': 'jellyseerr', 'metube': 'metube',
    'nextcloud': 'nextcloud', 'immich': 'immich', 'vaultwarden': 'vaultwarden',
    'wiki.js': 'wiki-js', 'calibre web': 'calibre-web', 'kiwix': 'kiwix',
    'freshrss': 'freshrss', 'crafty': 'crafty-4', 'retrogaming': 'emulatorjs',
    'libretranslate': 'libretranslate', 'stirling pdf': 'stirling-pdf',
    'excalidraw': 'excalidraw', 'tileserver gl': 'tileserver-gl',
    'speedtest': 'openspeedtest', 'sonarr': 'sonarr', 'radarr': 'radarr',
    'prowlarr': 'prowlarr', 'bazarr': 'bazarr', 'qbittorrent': 'qbittorrent',
    'code server': 'code-server', 'gitea': 'gitea', 'it tools': 'it-tools',
    'cyberchef': 'cyberchef', 'portainer': 'portainer', 'uptime kuma': 'uptime-kuma',
    'grafana': 'grafana', 'authentik': 'authentik', 'node red': 'node-red',
};

const CATEGORY_COLORS = {
    '\u043a\u0438\u043d\u043e \u0438 \u043c\u0435\u0434\u0438\u0430': '#6366f1',
    '\u043e\u0431\u043b\u0430\u043a\u043e \u0438 \u0444\u043e\u0442\u043e': '#06b6d4',
    '\u0437\u043d\u0430\u043d\u0438\u044f \u0438 \u043a\u043e\u043d\u0442\u0435\u043d\u0442': '#eab308',
    '\u0438\u0433\u0440\u044b': '#ef4444',
    '\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b': '#22c55e',
    '\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044f \u043c\u0435\u0434\u0438\u0430': '#f97316',
    '\u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430': '#8b5cf6',
    '\u0441\u0438\u0441\u0442\u0435\u043c\u0430': '#94a3b8',
};

function resolveIcon(svc) {
    if (svc.icon && (svc.icon.startsWith('http') || svc.icon.startsWith('/'))) return svc.icon;
    const slug = ICON_SLUGS[svc.name.toLowerCase()];
    if (slug) return `${ICON_CDN}/${slug}.svg`;
    return null;
}

async function loadServices() {
    const wrap = document.getElementById('services-wrap');
    const data = await api.get('/services');
    if (data.error) {
        wrap.innerHTML = `<p class="loading-text">${escapeHtml(data.error)}</p>`;
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
        const catColor = CATEGORY_COLORS[catName.toLowerCase()];
        if (catColor) group.style.setProperty('--cat-color', catColor);

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
            card.dataset.health = svc.health || 'unknown';
            card.style.animationDelay = `${delay}ms`;
            delay += 25;

            const iconUrl = resolveIcon(svc);
            const letter = svc.name[0]?.toUpperCase() || '?';
            let iconHtml;
            if (iconUrl) {
                iconHtml = `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy">`;
            } else if (svc.icon && svc.icon.length <= 4) {
                iconHtml = escapeHtml(svc.icon);
            } else {
                iconHtml = `<span class="icon-letter">${escapeHtml(letter)}</span>`;
            }

            card.innerHTML = `
                <div class="svc-icon">${iconHtml}</div>
                <div class="svc-body">
                    <div class="svc-name">${escapeHtml(svc.name)}</div>
                    <div class="svc-desc">${escapeHtml(svc.description)}</div>
                </div>
                <div class="svc-status ${escapeHtml(svc.health || 'unknown')}"></div>
            `;

            const img = card.querySelector('.svc-icon img');
            if (img) img.onerror = function() {
                this.parentElement.innerHTML = `<span class="icon-letter">${escapeHtml(letter)}</span>`;
            };

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
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
