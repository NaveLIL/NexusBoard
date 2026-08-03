// admin panel — slide-over panel with tabs: services, users, audit
let adminOpen = false;
let adminCategories = [];

function openAdminPanel() {
    if (adminOpen) return;
    adminOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'admin-overlay';
    overlay.id = 'admin-overlay';
    overlay.addEventListener('click', closeAdminPanel);

    const panel = document.createElement('div');
    panel.className = 'admin-panel';
    panel.id = 'admin-panel';
    panel.innerHTML = `
        <div class="admin-header">
            <h2>${t('admin.title')}</h2>
            <button class="admin-close" id="admin-close">&times;</button>
        </div>
        <div class="admin-tabs">
            <button class="admin-tab active" data-tab="services">${t('admin.services')}</button>
            <button class="admin-tab" data-tab="users">${t('admin.users')}</button>
            <button class="admin-tab" data-tab="audit">${t('admin.audit')}</button>
        </div>
        <div class="admin-body" id="admin-body">
            <div class="admin-loading">${t('dashboard.loading')}</div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // trigger animation
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
        panel.classList.add('open');
    });

    document.getElementById('admin-close').addEventListener('click', closeAdminPanel);
    panel.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            panel.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAdminTab(tab.dataset.tab);
        });
    });

    loadAdminTab('services');
}

function closeAdminPanel() {
    const overlay = document.getElementById('admin-overlay');
    const panel = document.getElementById('admin-panel');
    if (overlay) { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 300); }
    if (panel) { panel.classList.remove('open'); setTimeout(() => panel.remove(), 300); }
    adminOpen = false;
}

async function loadAdminTab(tab) {
    const body = document.getElementById('admin-body');
    body.innerHTML = `<div class="admin-loading">${t('dashboard.loading')}</div>`;

    if (tab === 'services') await renderServicesTab(body);
    else if (tab === 'users') await renderUsersTab(body);
    else if (tab === 'audit') await renderAuditTab(body);
}

// ===== SERVICES TAB =====
async function renderServicesTab(body) {
    const [services, categories] = await Promise.all([
        api.get('/services'),
        api.get('/settings/categories'),
    ]);
    adminCategories = Array.isArray(categories) ? categories : [];

    const list = Array.isArray(services) ? services : [];

    body.innerHTML = `
        <button class="admin-btn-add" id="btn-add-service">+ ${t('admin.addService')}</button>
        <div class="admin-list" id="admin-services-list">
            ${list.length === 0
                ? `<p class="admin-empty">${t('admin.noServices')}</p>`
                : list.map(s => serviceRow(s)).join('')
            }
        </div>
    `;

    document.getElementById('btn-add-service').addEventListener('click', () => showServiceModal());
    body.querySelectorAll('.svc-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const svc = list.find(s => s.id === parseInt(btn.dataset.id));
            if (svc) showServiceModal(svc);
        });
    });
    body.querySelectorAll('.svc-del').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(t('admin.confirmDelete'))) return;
            await api.del('/services/' + btn.dataset.id);
            loadAdminTab('services');
            loadServices(); // refresh dashboard
        });
    });
}

function serviceRow(s) {
    return `<div class="admin-row">
        <div class="admin-row-icon">${escapeHtml(s.icon || s.name[0]?.toUpperCase() || '?')}</div>
        <div class="admin-row-info">
            <strong>${escapeHtml(s.name)}</strong>
            <small>${escapeHtml(s.category || '')}</small>
        </div>
        <div class="admin-row-actions">
            <button class="admin-btn-sm svc-edit" data-id="${s.id}">✎</button>
            <button class="admin-btn-sm admin-btn-danger svc-del" data-id="${s.id}">✕</button>
        </div>
    </div>`;
}

function showServiceModal(existing) {
    const editing = !!existing;
    const catOptions = adminCategories.map(c =>
        `<option value="${c.id}" ${existing && existing.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');

    const roles = ['guest', 'family', 'member', 'admin', 'superadmin'];
    const roleOptions = roles.map(r =>
        `<option value="${r}" ${existing && existing.minRole === r ? 'selected' : ''}>${r}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'service-modal';
    modal.innerHTML = `<div class="modal-card">
        <h3>${editing ? t('admin.editService') : t('admin.addService')}</h3>
        <form id="service-form" autocomplete="off">
            <label>${t('admin.svcName')}<input type="text" name="name" value="${escapeHtml(existing?.name || '')}" required></label>
            <label>${t('admin.svcDesc')}<input type="text" name="description" value="${escapeHtml(existing?.description || '')}"></label>
            <label>URL<input type="url" name="url" value="${escapeHtml(existing?.url || '')}" required></label>
            <label>${t('admin.svcIcon')}<input type="text" name="icon" value="${escapeHtml(existing?.icon || '')}" placeholder="🖥️ / URL"></label>
            <label>${t('admin.svcCategory')}<select name="category_id">${catOptions}</select></label>
            <label>${t('admin.svcRole')}<select name="min_role">${roleOptions}</select></label>
            <label>Health URL<input type="url" name="health_url" value="${escapeHtml(existing?.healthUrl || '')}" placeholder="${t('admin.svcHealthHint')}"></label>
            <div class="modal-actions">
                <button type="button" class="admin-btn-cancel" id="modal-cancel">${t('admin.cancel')}</button>
                <button type="submit" class="admin-btn-save">${t('admin.save')}</button>
            </div>
        </form>
        <p class="modal-error" id="modal-error"></p>
    </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));

    document.getElementById('modal-cancel').addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 250);
    });

    document.getElementById('service-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            name: fd.get('name'),
            description: fd.get('description'),
            url: fd.get('url'),
            icon: fd.get('icon'),
            category_id: parseInt(fd.get('category_id')) || null,
            min_role: fd.get('min_role'),
            health_url: fd.get('health_url'),
        };

        const res = editing
            ? await api.put('/services/' + existing.id, payload)
            : await api.post('/services', payload);

        if (res.error) {
            document.getElementById('modal-error').textContent = res.error;
            return;
        }

        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 250);
        loadAdminTab('services');
        loadServices(); // refresh dashboard cards
    });
}

// ===== USERS TAB =====
async function renderUsersTab(body) {
    const users = await api.get('/users');
    if (users.error) {
        body.innerHTML = `<p class="admin-empty">${users.error}</p>`;
        return;
    }

    body.innerHTML = `
        <button class="admin-btn-add" id="btn-add-user">+ ${t('admin.addUser')}</button>
        <div class="admin-list" id="admin-users-list">
            ${users.map(u => userRow(u)).join('')}
        </div>
    `;

    document.getElementById('btn-add-user').addEventListener('click', () => showUserModal());
    body.querySelectorAll('.usr-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const u = users.find(x => x.id === parseInt(btn.dataset.id));
            if (u) showUserModal(u);
        });
    });
    body.querySelectorAll('.usr-del').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(t('admin.confirmDelete'))) return;
            await api.del('/users/' + btn.dataset.id);
            loadAdminTab('users');
        });
    });
}

function userRow(u) {
    const roleBadge = u.role === 'superadmin' ? 'admin-badge-sa' : '';
    return `<div class="admin-row">
        <div class="admin-row-icon" style="font-size:14px">${escapeHtml(u.display?.[0]?.toUpperCase() || '?')}</div>
        <div class="admin-row-info">
            <strong>${escapeHtml(u.display || u.username)}</strong>
            <small class="${roleBadge}">${escapeHtml(u.role)}${u.active ? '' : ' (disabled)'}</small>
        </div>
        <div class="admin-row-actions">
            <button class="admin-btn-sm usr-edit" data-id="${u.id}">✎</button>
            ${u.role !== 'superadmin' ? `<button class="admin-btn-sm admin-btn-danger usr-del" data-id="${u.id}">✕</button>` : ''}
        </div>
    </div>`;
}

function showUserModal(existing) {
    const editing = !!existing;
    const roles = ['guest', 'family', 'member', 'admin'];
    const roleOptions = roles.map(r =>
        `<option value="${r}" ${existing && existing.role === r ? 'selected' : ''}>${r}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'user-modal';
    modal.innerHTML = `<div class="modal-card">
        <h3>${editing ? t('admin.editUser') : t('admin.addUser')}</h3>
        <form id="user-form" autocomplete="off">
            <label>${t('admin.username')}<input type="text" name="username" value="${escapeHtml(existing?.username || '')}" ${editing ? 'disabled' : 'required'}></label>
            <label>${t('admin.displayName')}<input type="text" name="display" value="${escapeHtml(existing?.display || '')}"></label>
            <label>${editing ? t('admin.newPassword') : t('login.password')}<input type="password" name="password" ${editing ? '' : 'required'} minlength="8" placeholder="${editing ? t('admin.leaveEmpty') : ''}"></label>
            <label>${t('admin.role')}<select name="role">${roleOptions}</select></label>
            ${editing ? `<label class="admin-checkbox"><input type="checkbox" name="active" ${existing.active ? 'checked' : ''}> ${t('admin.active')}</label>` : ''}
            <div class="modal-actions">
                <button type="button" class="admin-btn-cancel" id="modal-cancel">${t('admin.cancel')}</button>
                <button type="submit" class="admin-btn-save">${t('admin.save')}</button>
            </div>
        </form>
        <p class="modal-error" id="modal-error"></p>
    </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));

    document.getElementById('modal-cancel').addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 250);
    });

    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {};

        if (!editing) {
            payload.username = fd.get('username');
            payload.password = fd.get('password');
        } else {
            const pw = fd.get('password');
            if (pw) payload.password = pw;
            payload.active = e.target.querySelector('[name=active]')?.checked ? true : false;
        }
        payload.display = fd.get('display') || undefined;
        payload.role = fd.get('role');

        const res = editing
            ? await api.put('/users/' + existing.id, payload)
            : await api.post('/users', payload);

        if (res.error) {
            document.getElementById('modal-error').textContent = res.error;
            return;
        }

        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 250);
        loadAdminTab('users');
    });
}

// ===== AUDIT TAB =====
async function renderAuditTab(body) {
    const logs = await api.get('/settings/audit?limit=100');
    if (logs.error) {
        body.innerHTML = `<p class="admin-empty">${logs.error}</p>`;
        return;
    }

    body.innerHTML = `
        <div class="admin-audit-table">
            <div class="audit-header">
                <span>${t('admin.auditUser')}</span>
                <span>${t('admin.auditAction')}</span>
                <span>${t('admin.auditIP')}</span>
                <span>${t('admin.auditTime')}</span>
            </div>
            ${logs.map(l => `<div class="audit-row">
                <span>${escapeHtml(l.username || '—')}</span>
                <span class="audit-action">${escapeHtml(l.action)}</span>
                <span class="audit-ip">${escapeHtml(l.ip?.split(',')[0] || '—')}</span>
                <span class="audit-time">${new Date(l.created_at).toLocaleString()}</span>
            </div>`).join('')}
        </div>
    `;
}
