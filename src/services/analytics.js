import store from '@/store';

const appVersion = () => typeof VERSION !== 'undefined' ? VERSION : 'DEBUG';

const eventName = (target, action) => {
    return `${target === 'flashid' ? 'flashid' : 'pn'}_${action === 'search' ? 'search' : 'decode'}`;
};

const hasGtag = () => typeof window !== 'undefined' && typeof window.gtag === 'function';

const baseEventParams = () => ({
    app_name: 'FlashMaster',
    app_version: appVersion(),
    language: store.getLang(),
    parser_mode: store.getParserMode()
});

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
        ...baseEventParams(),
        lookup_target: target,
        lookup_action: action,
        search_term: normalizedQuery,
        query_length: normalizedQuery.length,
        result_count: Number(resultCount) || 0,
        success: success ? 1 : 0
    });
};

export const trackServiceEvent = ({
    event,
    surface = 'global_top',
    routeName = '',
    action = '',
    label = ''
} = {}) => {
    if (!hasGtag() || !event) return;
    window.gtag('event', String(event), {
        ...baseEventParams(),
        surface: String(surface || 'global_top'),
        route_name: String(routeName || ''),
        service_action: String(action || ''),
        service_label: String(label || '')
    });
};

export const trackInteractionEvent = ({
    event,
    surface = 'global_top',
    routeName = '',
    action = '',
    label = ''
} = {}) => {
    if (!hasGtag() || !event) return;
    window.gtag('event', String(event), {
        ...baseEventParams(),
        surface: String(surface || 'global_top'),
        route_name: String(routeName || ''),
        interaction_action: String(action || ''),
        interaction_label: String(label || '')
    });
};
