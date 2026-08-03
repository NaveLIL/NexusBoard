// notifications dropdown
let notifOpen = false;
let notifTimer = null;
let notifClickListenerAttached = false;

function initNotifications() {
    stopNotifications();

    const bell = document.getElementById('btn-notifications');
    if (!bell) return;

    bell.addEventListener('click', toggleNotifDropdown);

    if (!notifClickListenerAttached) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#btn-notifications') && !e.target.closest('#notif-dropdown')) {
                closeNotifDropdown();
            }
        });
        notifClickListenerAttached = true;
    }

    pollNotifications();
    notifTimer = setInterval(pollNotifications, 30000);
}

function stopNotifications() {
    if (notifTimer) {
        clearInterval(notifTimer);
        notifTimer = null;
    }
}

async function pollNotifications() {
    const data = await api.get('/settings/notifications');
    if (!Array.isArray(data)) return;

    const unread = data.filter(n => !n.read);
    const badge = document.getElementById('notif-count');
    if (unread.length > 0) {
        badge.textContent = unread.length > 9 ? '9+' : unread.length;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifDropdown() {
    if (notifOpen) { closeNotifDropdown(); return; }
    notifOpen = true;

    let dd = document.getElementById('notif-dropdown');
    if (dd) dd.remove();

    dd = document.createElement('div');
    dd.className = 'notif-dropdown';
    dd.id = 'notif-dropdown';
    dd.innerHTML = `<div class="notif-loading">${t('dashboard.loading')}</div>`;

    document.getElementById('btn-notifications').closest('.notif-wrap').appendChild(dd);
    requestAnimationFrame(() => dd.classList.add('open'));

    loadNotifications(dd);
}

function closeNotifDropdown() {
    notifOpen = false;
    const dd = document.getElementById('notif-dropdown');
    if (dd) { dd.classList.remove('open'); setTimeout(() => dd.remove(), 200); }
}

async function loadNotifications(dd) {
    const data = await api.get('/settings/notifications');
    if (!Array.isArray(data) || data.length === 0) {
        dd.innerHTML = `<div class="notif-empty">${t('notifications.empty')}</div>`;
        return;
    }

    dd.innerHTML = data.slice(0, 20).map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-text">${escapeHtml(n.title || n.message || '')}</div>
            <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
    `).join('');

    // mark unread as read on click
    dd.querySelectorAll('.notif-item.unread').forEach(item => {
        item.addEventListener('click', async () => {
            await api.patch(`/settings/notifications/${item.dataset.id}/read`);
            item.classList.remove('unread');
            pollNotifications();
        });
    });
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notifications.now');
    if (mins < 60) return `${mins}${t('notifications.min')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t('notifications.hr')}`;
    const days = Math.floor(hrs / 24);
    return `${days}${t('notifications.day')}`;
}
