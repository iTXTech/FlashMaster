import store from '@/store';

const makeUrl = (endpoint, params = {}) => {
    const base = store.getServerAddress().replace(/\/+$/, '');
    const url = new URL(`${base}/${endpoint.replace(/^\/+/, '')}`);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    }
    return url.toString();
};

const request = async (endpoint, params = {}) => {
    const response = await fetch(makeUrl(endpoint, params));
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    if (payload && payload.result === false) {
        throw new Error(payload.message || 'FlashDetector request failed');
    }
    return payload;
};

export const getServerInfo = () => request('info');

export const decodePartNumber = pn => request('decode', {
    lang: store.getLang(),
    pn
});

export const searchPartNumber = (pn, limit = 0) => request('searchPn', {
    lang: store.getLang(),
    pn,
    limit
});

export const summarizePartNumber = pn => request('summary', {
    lang: store.getLang(),
    pn
});

export const decodeFlashId = id => request('decodeId', {
    lang: store.getLang(),
    id
});

export const searchFlashId = (id, limit = 0) => request('searchId', {
    lang: store.getLang(),
    id,
    limit
});

export const summarizeFlashId = id => request('summaryId', {
    lang: store.getLang(),
    id
});

export const loadServerList = async () => {
    const response = await fetch('https://raw.githubusercontent.com/PeratX/FlashMaster/master/servers.json');
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
};
