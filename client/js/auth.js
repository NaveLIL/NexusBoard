let currentUser = null;

async function checkAuth() {
    if (!accessToken) return false;
    try {
        const data = await api.get('/auth/me');
        if (data.error) {
            // try refresh
            const ok = await api.refresh();
            if (!ok) return false;
            const retry = await api.get('/auth/me');
            if (retry.error) return false;
            currentUser = retry;
            return true;
        }
        currentUser = data;
        return true;
    } catch {
        return false;
    }
}

function setupAuthUI() {
    if (!currentUser) return;

    const avatar = document.getElementById('user-avatar');
    const display = document.getElementById('user-display');
    const role = document.getElementById('user-role');
    const adminBtn = document.getElementById('btn-admin');

    avatar.textContent = currentUser.display?.[0]?.toUpperCase() || '?';
    display.textContent = currentUser.display || currentUser.username;
    role.textContent = currentUser.role;

    if (currentUser.role === 'superadmin' || currentUser.role === 'admin') {
        adminBtn.style.display = 'block';
    }

    // dropdown toggle
    avatar.onclick = () => {
        document.getElementById('user-dropdown').classList.toggle('open');
    };
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('user-dropdown').classList.remove('open');
        }
    });

    // logout
    document.getElementById('btn-logout').onclick = async () => {
        await api.logout();
        currentUser = null;
        showScreen('login');
    };
}
