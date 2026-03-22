// screens
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.remove('entering');
    });
    const target = document.getElementById(name + '-screen');
    if (!target) return;
    target.classList.add('active');

    if (name === 'dashboard') {
        target.classList.add('entering');
        setupAuthUI();
        startWidgets();
        loadServices();
        initSearch();
    } else {
        stopWidgets();
    }

    if (name === 'login' || name === 'setup') {
        initParticles();
    }
}

// main entry point
(async function boot() {
    await loadLang(currentLang);
    applyTranslations();

    const authed = await checkAuth();
    if (authed) {
        showScreen('dashboard');
    } else {
        try {
            const { needsSetup } = await fetch('/api/auth/status').then(r => r.json());
            showScreen(needsSetup ? 'setup' : 'login');
        } catch {
            showScreen('login');
        }
    }

    // login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value;
        const errEl = document.getElementById('login-error');
        errEl.textContent = '';

        const data = await api.login(user, pass);
        if (data.error) {
            errEl.textContent = t('login.error');
            document.querySelector('.login-container').classList.add('shake');
            setTimeout(() => document.querySelector('.login-container').classList.remove('shake'), 500);
            return;
        }
        currentUser = data.user;
        if (data.user?.lang) setLang(data.user.lang);

        // fade out login, then switch to dashboard
        const loginScreen = document.getElementById('login-screen');
        loginScreen.style.transition = 'opacity 0.4s ease';
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.opacity = '';
            loginScreen.style.transition = '';
            showScreen('dashboard');
        }, 400);
    });

    // setup form
    document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('setup-user').value.trim();
        const display = document.getElementById('setup-display').value.trim();
        const pass = document.getElementById('setup-pass').value;
        const errEl = document.getElementById('setup-error');
        errEl.textContent = '';

        const data = await api.setup(user, pass, display);
        if (data.error) {
            errEl.textContent = data.error;
            return;
        }
        showScreen('login');
    });

    // language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });

    // topbar lang toggle
    document.getElementById('btn-lang')?.addEventListener('click', () => {
        setLang(currentLang === 'ru' ? 'en' : 'ru');
    });

    // admin panel button
    document.getElementById('btn-admin')?.addEventListener('click', () => {
        openAdminPanel();
    });

    initParticles();
})();
