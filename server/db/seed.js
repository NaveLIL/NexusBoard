const { getDb } = require('./init');

const defaultCategories = [
    { name: 'Кино и Медиа', icon: 'film', sort_order: 0 },
    { name: 'Облако и Фото', icon: 'cloud', sort_order: 1 },
    { name: 'Знания и Контент', icon: 'book', sort_order: 2 },
    { name: 'Игры', icon: 'gamepad', sort_order: 3 },
    { name: 'Инструменты', icon: 'wrench', sort_order: 4 },
    { name: 'Автоматизация Медиа', icon: 'robot', sort_order: 5 },
    { name: 'Разработка', icon: 'code', sort_order: 6 },
    { name: 'Система', icon: 'server', sort_order: 7 },
    { name: 'Коммуникации', icon: 'message', sort_order: 8 },
    { name: 'Прочее', icon: 'grid', sort_order: 9 },
];

const defaultSettings = {
    health_interval: '30',          // seconds
    theme: 'dark',
    instance_name: 'NexusBoard',
    ntfy_enabled: '0',
    tg_enabled: '0',
};

function seed() {
    const db = getDb();

    // skip if data already exists
    const count = db.prepare('SELECT COUNT(*) as c FROM categories').get();
    if (count.c > 0) return;

    console.log('[seed] populating default data...');

    const insertCat = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
    const catTx = db.transaction(() => {
        for (const c of defaultCategories) {
            insertCat.run(c.name, c.icon, c.sort_order);
        }
    });
    catTx();

    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const settingsTx = db.transaction(() => {
        for (const [k, v] of Object.entries(defaultSettings)) {
            insertSetting.run(k, v);
        }
    });
    settingsTx();

    console.log('[seed] done');
}

module.exports = { seed };
