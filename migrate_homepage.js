// migration script — import services from Homepage config
const db = require('./server/db/init').getDb();
const { encrypt } = require('./server/services/crypto');

// categories from Homepage with sort order
const categories = [
    { name: 'Кино и Медиа', icon: '🎬', sort: 1 },
    { name: 'Облако и Фото', icon: '☁️', sort: 2 },
    { name: 'Знания и Контент', icon: '📚', sort: 3 },
    { name: 'Игры', icon: '🎮', sort: 4 },
    { name: 'Инструменты', icon: '🔧', sort: 5 },
    { name: 'Автоматизация Медиа', icon: '📡', sort: 6 },
    { name: 'Разработка', icon: '💻', sort: 7 },
    { name: 'Система', icon: '⚙️', sort: 8 },
    { name: 'Коммуникации', icon: '💬', sort: 9 },
    { name: 'Прочее', icon: '📦', sort: 10 },
];

// all services from Homepage services.yaml
const services = [
    // Кино и Медиа
    { name: 'Jellyfin', url: 'https://100.98.106.33:8920', icon: '🎬', desc: 'Фильмы и сериалы', cat: 'Кино и Медиа', role: 'family', sort: 1 },
    { name: 'Jellyseerr', url: 'http://100.98.106.33:5055', icon: '🎥', desc: 'Запросить фильм / сериал', cat: 'Кино и Медиа', role: 'family', sort: 2 },
    { name: 'MeTube', url: 'http://100.98.106.33:8104', icon: '📹', desc: 'Загрузка YouTube видео', cat: 'Кино и Медиа', role: 'family', sort: 3 },

    // Облако и Фото
    { name: 'Nextcloud', url: 'http://100.98.106.33:8200', icon: '☁️', desc: 'Облачное хранилище', cat: 'Облако и Фото', role: 'family', sort: 1 },
    { name: 'Immich', url: 'http://100.98.106.33:2283', icon: '📷', desc: 'Фотогалерея', cat: 'Облако и Фото', role: 'family', sort: 2 },
    { name: 'Vaultwarden', url: 'https://100.98.106.33:8093', icon: '🔐', desc: 'Менеджер паролей', cat: 'Облако и Фото', role: 'family', sort: 3 },

    // Знания и Контент
    { name: 'Wiki.js', url: 'http://100.98.106.33:3003', icon: '📖', desc: 'Вики-энциклопедия', cat: 'Знания и Контент', role: 'family', sort: 1 },
    { name: 'Calibre Web', url: 'http://100.98.106.33:8089', icon: '📚', desc: 'Электронные книги', cat: 'Знания и Контент', role: 'family', sort: 2 },
    { name: 'Kiwix', url: 'http://100.98.106.33:8088', icon: '🌐', desc: 'Офлайн-Wikipedia', cat: 'Знания и Контент', role: 'family', sort: 3 },
    { name: 'FreshRSS', url: 'http://100.98.106.33:8102', icon: '📰', desc: 'RSS-агрегатор', cat: 'Знания и Контент', role: 'member', sort: 4 },

    // Игры
    { name: 'Crafty', url: 'https://100.98.106.33:8199', icon: '⛏️', desc: 'Minecraft сервер', cat: 'Игры', role: 'family', sort: 1 },
    { name: 'RetroGaming', url: 'http://100.98.106.33:8097', icon: '🕹️', desc: 'Ретро-игры в браузере', cat: 'Игры', role: 'family', sort: 2 },

    // Инструменты
    { name: 'LibreTranslate', url: 'http://100.98.106.33:5000', icon: '🌍', desc: 'Офлайн-переводчик', cat: 'Инструменты', role: 'family', sort: 1 },
    { name: 'Stirling PDF', url: 'http://100.98.106.33:8083', icon: '📄', desc: 'Работа с PDF', cat: 'Инструменты', role: 'family', sort: 2 },
    { name: 'Excalidraw', url: 'http://100.98.106.33:8084', icon: '✏️', desc: 'Рисование диаграмм', cat: 'Инструменты', role: 'family', sort: 3 },
    { name: 'TileServer GL', url: 'http://100.98.106.33:8103', icon: '🗺️', desc: 'Офлайн-карты мира', cat: 'Инструменты', role: 'family', sort: 4 },
    { name: 'EREZCRAFT Карты', url: 'http://100.98.106.33:8112', icon: '🗺️', desc: 'Подробные карты (zoom 0-15)', cat: 'Инструменты', role: 'family', sort: 5 },
    { name: 'ConvertX', url: 'http://100.98.106.33:3100', icon: '🔄', desc: 'Конвертер файлов (1000+ форматов)', cat: 'Инструменты', role: 'family', sort: 6 },
    { name: 'EREZsecret', url: 'https://secret.erez.pro', icon: '🔒', desc: 'Безопасный обмен заметками', cat: 'Инструменты', role: 'guest', sort: 7 },
    { name: 'Speedtest', url: 'http://100.98.106.33:8091', icon: '⚡', desc: 'Тест скорости', cat: 'Инструменты', role: 'family', sort: 8 },

    // Автоматизация Медиа
    { name: 'Sonarr', url: 'http://100.98.106.33:8989', icon: '📺', desc: 'Автозагрузка сериалов', cat: 'Автоматизация Медиа', role: 'admin', sort: 1 },
    { name: 'Radarr', url: 'http://100.98.106.33:7878', icon: '🎞️', desc: 'Автозагрузка фильмов', cat: 'Автоматизация Медиа', role: 'admin', sort: 2 },
    { name: 'Prowlarr', url: 'http://100.98.106.33:9696', icon: '🔍', desc: 'Поиск по индексаторам', cat: 'Автоматизация Медиа', role: 'admin', sort: 3 },
    { name: 'Bazarr', url: 'http://100.98.106.33:6767', icon: '💬', desc: 'Субтитры', cat: 'Автоматизация Медиа', role: 'admin', sort: 4 },
    { name: 'qBittorrent', url: 'http://100.98.106.33:8095', icon: '⬇️', desc: 'Торрент-клиент', cat: 'Автоматизация Медиа', role: 'admin', sort: 5 },

    // Разработка
    { name: 'Code Server', url: 'http://100.98.106.33:8443', icon: '💻', desc: 'VS Code в браузере', cat: 'Разработка', role: 'admin', sort: 1 },
    { name: 'Gitea', url: 'http://100.98.106.33:3002', icon: '🐙', desc: 'Git-репозитории', cat: 'Разработка', role: 'admin', sort: 2 },
    { name: 'IT Tools', url: 'http://100.98.106.33:8081', icon: '🛠️', desc: 'DevOps утилиты', cat: 'Разработка', role: 'admin', sort: 3 },
    { name: 'CyberChef', url: 'http://100.98.106.33:8082', icon: '🧪', desc: 'Шифрование и кодирование', cat: 'Разработка', role: 'admin', sort: 4 },
    { name: 'Youtube-to-Doc', url: 'http://100.98.106.33:8111', icon: '📝', desc: 'YouTube → документация для AI', cat: 'Разработка', role: 'admin', sort: 5 },

    // Система
    { name: 'Portainer', url: 'https://100.98.106.33:9444', icon: '🐳', desc: 'Управление контейнерами', cat: 'Система', role: 'admin', sort: 1 },
    { name: 'Uptime Kuma', url: 'http://100.98.106.33:3001', icon: '📊', desc: 'Мониторинг доступности', cat: 'Система', role: 'admin', sort: 2 },
    { name: 'Grafana', url: 'http://100.98.106.33:3010', icon: '📈', desc: 'Дашборды и метрики', cat: 'Система', role: 'admin', sort: 3 },
    { name: 'Authentik', url: 'http://100.98.106.33:9001', icon: '🔑', desc: 'SSO авторизация', cat: 'Система', role: 'superadmin', sort: 4 },
    { name: 'Node-RED', url: 'http://100.98.106.33:1880', icon: '🔴', desc: 'Автоматизация потоков', cat: 'Система', role: 'admin', sort: 5 },
    { name: 'ChangeDetection', url: 'http://100.98.106.33:5555', icon: '👁️', desc: 'Слежение за сайтами', cat: 'Система', role: 'admin', sort: 6 },

    // Коммуникации
    { name: 'Rocket.Chat', url: 'https://100.98.106.33:3004', icon: '💬', desc: 'Мессенджер команды', cat: 'Коммуникации', role: 'member', sort: 1 },
    { name: 'TeamSpeak', url: 'http://100.98.106.33:3005', icon: '🎧', desc: 'Голосовой чат', cat: 'Коммуникации', role: 'member', sort: 2 },
    { name: 'Ntfy', url: 'http://100.98.106.33:8100', icon: '🔔', desc: 'Push-уведомления', cat: 'Коммуникации', role: 'admin', sort: 3 },

    // Прочее
    { name: 'File Browser', url: 'http://100.98.106.33:8090', icon: '📁', desc: 'Файловый менеджер', cat: 'Прочее', role: 'admin', sort: 1 },
    { name: 'Paperless-ngx', url: 'http://100.98.106.33:8101', icon: '🗃️', desc: 'Цифровые документы', cat: 'Прочее', role: 'admin', sort: 2 },
    { name: 'Trilium', url: 'http://100.98.106.33:8087', icon: '🌳', desc: 'Заметки и база знаний', cat: 'Прочее', role: 'admin', sort: 3 },
    { name: 'Memos', url: 'http://100.98.106.33:5230', icon: '📝', desc: 'Быстрые заметки', cat: 'Прочее', role: 'member', sort: 4 },
    { name: 'Flatnotes', url: 'http://100.98.106.33:8092', icon: '🗒️', desc: 'Markdown-заметки', cat: 'Прочее', role: 'member', sort: 5 },
    { name: 'ArchiveBox', url: 'http://100.98.106.33:8098', icon: '📦', desc: 'Веб-архив', cat: 'Прочее', role: 'admin', sort: 6 },
    { name: 'Firefox', url: 'https://100.98.106.33:3007', icon: '🦊', desc: 'Приватный браузер', cat: 'Прочее', role: 'member', sort: 7 },
];

// run migration
const tx = db.transaction(() => {
    // upsert categories
    const catIdMap = {};
    for (const c of categories) {
        let row = db.prepare('SELECT id FROM categories WHERE name = ?').get(c.name);
        if (row) {
            db.prepare('UPDATE categories SET icon=?, sort_order=? WHERE id=?').run(c.icon, c.sort, row.id);
        } else {
            db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)').run(c.name, c.icon, c.sort);
            row = db.prepare('SELECT id FROM categories WHERE name = ?').get(c.name);
        }
        catIdMap[c.name] = row.id;
    }

    // insert services (skip duplicates by name)
    const insertSvc = db.prepare(
        'INSERT OR IGNORE INTO services (name, description, url, icon, category_id, min_role, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    let added = 0;
    for (const s of services) {
        const exists = db.prepare('SELECT id FROM services WHERE name = ?').get(s.name);
        if (exists) { console.log(`  skip: ${s.name} (already exists)`); continue; }
        insertSvc.run(s.name, s.desc, encrypt(s.url), s.icon, catIdMap[s.cat], s.role, s.sort);
        added++;
        console.log(`  + ${s.name}`);
    }
    console.log(`\nMigration done: ${added} services added, ${services.length - added} skipped`);
});

tx();
process.exit(0);
