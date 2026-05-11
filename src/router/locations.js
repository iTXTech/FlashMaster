export const ROUTER_MODE_HASH = 'hash';
export const ROUTER_MODE_HISTORY = 'history';

export const ROUTER_MODE = import.meta.env.VITE_FLASHMASTER_ROUTER_MODE === ROUTER_MODE_HISTORY
  ? ROUTER_MODE_HISTORY
  : ROUTER_MODE_HASH;

export const ROUTE_NAMES = Object.freeze({
  root: 'root',
  localeRoot: 'locale-root',
  parts: 'parts',
  part: 'part',
  partsSearch: 'parts-search',
  ids: 'ids',
  id: 'id',
  idsSearch: 'ids-search',
  settings: 'settings',
  about: 'about'
});

const URL_TO_APP_LOCALE = Object.freeze({
  en: 'eng',
  zh: 'chs'
});

const APP_TO_URL_LOCALE = Object.freeze({
  eng: 'en',
  chs: 'zh'
});

export function normalizeUrlLocale(value) {
  const text = String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase();
  return Object.hasOwn(URL_TO_APP_LOCALE, text) ? text : '';
}

export function appLocaleFromUrlLocale(value) {
  return URL_TO_APP_LOCALE[normalizeUrlLocale(value)] || '';
}

export function urlLocaleFromAppLocale(value) {
  return APP_TO_URL_LOCALE[String(value || '').trim()] || '';
}

export function routeUrlLocale(route) {
  return normalizeUrlLocale(route?.params?.locale);
}

export function appLocaleFromRoute(route) {
  return appLocaleFromUrlLocale(routeUrlLocale(route));
}

function withRouteLocale(route, params = {}) {
  const locale = routeUrlLocale(route);
  return locale ? { locale, ...params } : params;
}

function compactParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

export function localizedRouteLocation(name, params = {}, route) {
  return {
    name,
    params: compactParams(withRouteLocale(route, params))
  };
}

export function localizeRouteLocation(location, route) {
  if (!location?.name) return location;
  return {
    ...location,
    params: compactParams(withRouteLocale(route, location.params || {}))
  };
}

export function routeWithAppLocale(route, appLocale) {
  const locale = urlLocaleFromAppLocale(appLocale);
  return {
    name: route?.name || ROUTE_NAMES.parts,
    params: compactParams({
      ...(route?.params || {}),
      locale
    })
  };
}

export function partsRoute(route) {
  return localizedRouteLocation(ROUTE_NAMES.parts, {}, route);
}

export function partRoute(pn, route) {
  return localizedRouteLocation(ROUTE_NAMES.part, { pn }, route);
}

export function partsSearchRoute(query, route) {
  return localizedRouteLocation(ROUTE_NAMES.partsSearch, { query }, route);
}

export function idsRoute(route) {
  return localizedRouteLocation(ROUTE_NAMES.ids, {}, route);
}

export function idRoute(id, route) {
  return localizedRouteLocation(ROUTE_NAMES.id, { id }, route);
}

export function idsSearchRoute(query, route) {
  return localizedRouteLocation(ROUTE_NAMES.idsSearch, { query }, route);
}

export function settingsRoute(route) {
  return localizedRouteLocation(ROUTE_NAMES.settings, {}, route);
}

export function aboutRoute(route) {
  return localizedRouteLocation(ROUTE_NAMES.about, {}, route);
}

export function routeParamText(route, key) {
  return String(Array.isArray(route?.params?.[key]) ? route.params[key][0] : route?.params?.[key] || '');
}
