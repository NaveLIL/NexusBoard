// main entry point
(async function boot() {
    // load language
    await loadLang(currentLang);
    applyTranslations();

    // check if user is already logged in
    const authed = await checkAuth();
    if (authed) {
        showScreen('dashboard');
    } else {
        // check if setup is needed (no users exist yet)
        try {
            const probe = await fetch('/api/auth/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }).then(r => r.json());
            // if 'setup already complete' — users exist, show login
            // if 'username and password required' — no users, show setup
            if (probe.error === 'setup already complete') {
                showScreen('login');
            } else {
                showScreen('setup');
            }
        } catch {
            showScreen('login');
        }
    }

    // wire up login form
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
        showScreen('dashboard');
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

    initParticles();
})();

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(`${name}-screen`);
    if (screen) {
        screen.classList.add('active');
        if (name === 'dashboard') {
            screen.classList.add('entering');
            setTimeout(() => screen.classList.remove('entering'), 700);
            setupAuthUI();
            loadServices();
            startWidgets();
            initSearch();
        } else {
            stopWidgets();
        }
    }
}
