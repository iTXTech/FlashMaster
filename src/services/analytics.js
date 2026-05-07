import store from '@/store';

const appVersion = () => typeof VERSION !== 'undefined' ? VERSION : 'DEBUG';

const eventName = (target, action) => {
    return `${target === 'flashid' ? 'flashid' : 'pn'}_${action === 'search' ? 'search' : 'decode'}`;
};

const hasGtag = () => typeof window !== 'undefined' && typeof window.gtag === 'function';

export const trackLookup = ({
    target,
    action,
    query,
    resultCount = 0,
    success = true
}) => {
    if (!hasGtag()) return;
    const normalizedQuery = String(query || '');
    window.gtag('event', eventName(target, action), {
        app_name: 'FlashMaster',
        app_version: appVersion(),
        language: store.getLang(),
        parser_mode: store.getParserMode(),
        lookup_target: target,
        lookup_action: action,
        search_term: normalizedQuery,
        query_length: normalizedQuery.length,
        result_count: Number(resultCount) || 0,
        success: success ? 1 : 0
    });
};
