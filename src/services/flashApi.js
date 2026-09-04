import store from '@/store';
import {
    decodeEmbeddedFlashId,
    decodeEmbeddedPartNumber,
    getEmbeddedInfo,
    searchEmbeddedFlashId,
    searchEmbeddedPartNumber,
    warmEmbeddedParser as warmEmbeddedFdnextParser
} from '@/services/fdnextApi';
import { FDNEXT_CAPABILITIES_SCHEMA_VERSIONS, summaryText } from '@/services/fdnextResultView';
import { DEFAULT_HTTP_REQUEST_TIMEOUT_MS, runWithRequestTimeout } from '@/services/requestControl';
import { automaticRequest } from '@/services/automaticRequests';

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

const assertFdnextPayload = (payload, schemaVersion, endpoint) => {
    const schemaVersions = Array.isArray(schemaVersion) ? schemaVersion : [schemaVersion];
    if (!payload || !schemaVersions.includes(payload.schemaVersion)) {
        throw new Error(`Unsupported fdnext response from ${endpoint}`);
    }
    return payload;
};

const parseResponsePayload = async response => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const request = async (endpoint, params = {}, schemaVersion = 'fdnext.result.v1', options = {}) => {
    return runWithRequestTimeout(async signal => {
        const response = await fetch(makeUrl(endpoint, params), { signal });
        const payload = await parseResponsePayload(response);
        if (payload) {
            try {
                return assertFdnextPayload(payload, schemaVersion, endpoint);
            } catch (err) {
                if (response.ok) throw err;
            }
        }
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        throw new Error(`Unsupported fdnext response from ${endpoint}`);
    }, {
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? DEFAULT_HTTP_REQUEST_TIMEOUT_MS,
        timeoutMessage: `Request to ${endpoint} timed out.`
    });
};

const useEmbeddedParser = () => store.isEmbeddedParser();

// Also used to decide whether a displayed result still matches a copy request.
export const lookupContextKey = (operation, query, limit = 0, timeoutMs = null) => JSON.stringify([
    operation, query, store.getLang(), useEmbeddedParser() ? 'embedded' : store.getServerAddress().replace(/\/+$/, ''),
    store.getControllerGroupParam(), limit, timeoutMs
]);

const searchRequest = (operation, query, limit, options, task) => {
    const execute = requestOptions => useEmbeddedParser() && requestOptions.timeoutMs
        ? runWithRequestTimeout(signal => task({ ...requestOptions, signal }), requestOptions)
        : task(requestOptions);
    return options.automatic
        ? automaticRequest(lookupContextKey(operation, query, limit, options.timeoutMs), signal => execute({ ...options, signal }), options.signal)
        : execute(options);
};

const langParams = () => ({
    lang: store.getLang()
});

const limitParams = limit => {
    const value = Number(limit);
    return Number.isFinite(value) && value > 0 ? { limit: value } : {};
};

const controllerGroupParams = () => ({
    controllerGroup: store.getControllerGroupParam()
});

export const getServerInfo = async (options = {}) => useEmbeddedParser()
    ? getEmbeddedInfo(options)
    : request('capabilities', langParams(), FDNEXT_CAPABILITIES_SCHEMA_VERSIONS, options);

export const warmEmbeddedParser = () => {
    if (!useEmbeddedParser()) return Promise.resolve();
    return warmEmbeddedFdnextParser();
};

export const decodePartNumber = async (pn, options = {}) => {
    return useEmbeddedParser() ? decodeEmbeddedPartNumber(pn, options) : request('parts/decode', {
        ...langParams(),
        ...controllerGroupParams(),
        query: pn
    }, 'fdnext.result.v1', options);
};

export const searchPartNumber = async (pn, limit = 0, options = {}) => {
    return searchRequest('parts/search', pn, limit, options, requestOptions => useEmbeddedParser() ? searchEmbeddedPartNumber(pn, limit, requestOptions) : request('parts/search', {
        ...langParams(),
        query: pn,
        ...limitParams(limit)
    }, 'fdnext.result.v1', requestOptions));
};

export const summarizePartNumber = async (pn, options = {}) => summaryText(await decodePartNumber(pn, options));

export const decodeFlashId = async (id, options = {}) => {
    const input = { idScheme: 'nand.flash_id' };
    return useEmbeddedParser() ? decodeEmbeddedFlashId(id, options) : request('identifiers/decode', {
        ...langParams(),
        query: id,
        ...input,
        ...controllerGroupParams()
    }, 'fdnext.result.v1', options);
};

export const searchFlashId = async (id, limit = 0, options = {}) => {
    const input = { idScheme: 'nand.flash_id' };
    return searchRequest('identifiers/search', id, limit, options, requestOptions => useEmbeddedParser() ? searchEmbeddedFlashId(id, limit, requestOptions) : request('identifiers/search', {
        ...langParams(),
        query: id,
        ...input,
        ...limitParams(limit)
    }, 'fdnext.result.v1', requestOptions));
};

export const summarizeFlashId = async (id, options = {}) => summaryText(await decodeFlashId(id, options));
