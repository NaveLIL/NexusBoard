let accessToken = localStorage.getItem('nexus_token') || null;

const api = {
    async request(method, path, body) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
        };
        if (accessToken) opts.headers['Authorization'] = `Bearer ${accessToken}`;
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`/api${path}`, opts);

        // try refresh on 401
        if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
            const refreshed = await api.refresh();
            if (refreshed) {
                opts.headers['Authorization'] = `Bearer ${accessToken}`;
                return fetch(`/api${path}`, opts).then(r => r.json());
            }
        }
        return res.json();
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    patch(path, body) { return this.request('PATCH', path, body); },
    del(path) { return this.request('DELETE', path); },

    async login(username, password) {
        const data = await this.post('/auth/login', { username, password });
        if (data.token) {
            accessToken = data.token;
            localStorage.setItem('nexus_token', accessToken);
        }
        return data;
    },

    async refresh() {
        try {
            const data = await this.post('/auth/refresh');
            if (data.token) {
                accessToken = data.token;
                localStorage.setItem('nexus_token', accessToken);
                return true;
            }
        } catch {}
        return false;
    },

    async logout() {
        await this.post('/auth/logout');
        accessToken = null;
        localStorage.removeItem('nexus_token');
    },

    async setup(username, password, display) {
        return this.post('/auth/setup', { username, password, display });
    },
};
