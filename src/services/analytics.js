import store from '@/store';

const appVersion = () => typeof VERSION !== 'undefined' ? VERSION : 'DEBUG';

const hasGtag = () => __FLASHMASTER_ANALYTICS__ && typeof window !== 'undefined' && typeof window.gtag === 'function';

const stringParam = value => String(value ?? '').trim();

const numericParam = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
};

const compactParams = params => Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const baseEventParams = () => ({
    app_name: 'FlashMaster',
    app_version: appVersion(),
    language: store.getLang(),
    parser_mode: store.getParserMode()
});

const lookupActionParam = action => action === 'search' ? 'search' : 'decode';

const lookupResultCount = value => Number(value) || 0;

const normalizePartNumberQuery = value => stringParam(value).toUpperCase();

const normalizeFlashIdQuery = value => stringParam(value)
    .replace(/0x/gi, ' ')
    .replace(/[^a-fA-F0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.length % 2 ? `0${token}` : token)
    .join('')
    .toUpperCase();

const flashIdBytes = value => normalizeFlashIdQuery(value).match(/.{1,2}/g) || [];

const lookupEventParams = ({
    type,
    routeName = '',
    action,
    resultCount = 0,
    success = true
}) => ({
    surface: `${type}_lookup`,
    route_name: String(routeName || ''),
    lookup_type: type,
    lookup_action: action,
    lookup_result_count: lookupResultCount(resultCount),
    lookup_success: success ? 1 : 0
});

export const trackPartNumberLookup = ({
    action,
    routeName = '',
    partNumber,
    resultCount = 0,
    success = true
} = {}) => {
    if (!hasGtag()) return;
    const lookupAction = lookupActionParam(action);
    const pnQuery = normalizePartNumberQuery(partNumber);
    window.gtag('event', `pn_${lookupAction}`, compactParams({
        ...baseEventParams(),
        ...lookupEventParams({
            type: 'pn',
            routeName,
            action: lookupAction,
            resultCount,
            success
        }),
        pn_query: pnQuery,
        pn_query_prefix: pnQuery.slice(0, 6),
        pn_query_length: pnQuery.length
    }));
};

export const trackFlashIdLookup = ({
    action,
    routeName = '',
    flashId,
    resultCount = 0,
    success = true
} = {}) => {
    if (!hasGtag()) return;
    const lookupAction = lookupActionParam(action);
    const idQuery = normalizeFlashIdQuery(flashId);
    const bytes = flashIdBytes(flashId);
    window.gtag('event', `flash_id_${lookupAction}`, compactParams({
        ...baseEventParams(),
        ...lookupEventParams({
            type: 'flash_id',
            routeName,
            action: lookupAction,
            resultCount,
            success
        }),
        flash_id_query: idQuery,
        flash_id_prefix: bytes.slice(0, 2).join(''),
        flash_id_maker_code: bytes[0],
        flash_id_byte_count: bytes.length,
        flash_id_query_length: idQuery.length
    }));
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

export const trackMarketPulseEvent = ({
    event,
    routeName = '',
    action = '',
    item = null,
    symbol = '',
    asset = '',
    visiblePosition,
    cyclePosition,
    visibleSlots,
    enabled
} = {}) => {
    if (!hasGtag() || !event) return;

    const marketSymbol = stringParam(symbol || item?.symbol);
    const marketAsset = stringParam(asset || item?.asset);
    const changePercent = numericParam(item?.changePercent);
    const marketTrend = changePercent === undefined
        ? ''
        : changePercent > 0
            ? 'up'
            : changePercent < 0
                ? 'down'
                : 'flat';

    window.gtag('event', String(event), compactParams({
        ...baseEventParams(),
        surface: 'market_pulse',
        route_name: String(routeName || ''),
        market_action: String(action || ''),
        market_symbol: marketSymbol,
        market_asset: marketAsset,
        market_trend: marketTrend,
        market_change_percent: changePercent,
        market_visible_position: numericParam(visiblePosition),
        market_cycle_position: numericParam(cyclePosition),
        market_visible_slots: numericParam(visibleSlots),
        market_enabled: typeof enabled === 'boolean' ? (enabled ? 1 : 0) : undefined
    }));
};
