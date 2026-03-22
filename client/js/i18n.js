const translations = { ru: null, en: null };
let currentLang = localStorage.getItem('nexus_lang') || 'ru';

async function loadLang(lang) {
    if (translations[lang]) return translations[lang];
    try {
        const res = await fetch(`/locales/${lang}.json`);
        translations[lang] = await res.json();
    } catch {
        translations[lang] = {};
    }
    return translations[lang];
}

function t(key) {
    const dict = translations[currentLang] || {};
    return key.split('.').reduce((o, k) => o?.[k], dict) || key;
}

async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('nexus_lang', lang);
    await loadLang(lang);
    applyTranslations();
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val !== key) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = t(key);
        if (val !== key) el.placeholder = val;
    });

    // update lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    const indicator = document.getElementById('current-lang');
    if (indicator) indicator.textContent = currentLang.toUpperCase();
}
