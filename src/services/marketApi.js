const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const LIGHTER_API_URL = 'https://mainnet.zklighter.elliot.ai/api/v1';
const LIGHTER_STATS_URL = `${LIGHTER_API_URL}/exchangeStats`;
const LIGHTER_ORDER_BOOKS_URL = `${LIGHTER_API_URL}/orderBooks`;
const LIGHTER_CANDLES_URL = `${LIGHTER_API_URL}/candles`;
const LIGHTER_WS_URL = 'wss://mainnet.zklighter.elliot.ai/stream?readonly=true';
const MARKET_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_ENDPOINT || HYPERLIQUID_INFO_URL;
const MARKET_WS_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_WS_ENDPOINT || HYPERLIQUID_WS_URL;
const MARKET_CANDLE_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_CANDLE_ENDPOINT || HYPERLIQUID_INFO_URL;
const MARKET_LIGHTER_ENDPOINT = import.meta.env.VITE_FLASHMASTER_LIGHTER_ENDPOINT || LIGHTER_STATS_URL;
const MARKET_LIGHTER_WS_ENDPOINT = import.meta.env.VITE_FLASHMASTER_LIGHTER_WS_ENDPOINT || LIGHTER_WS_URL;
const MARKET_LIGHTER_ORDER_BOOKS_ENDPOINT = import.meta.env.VITE_FLASHMASTER_LIGHTER_ORDER_BOOKS_ENDPOINT || LIGHTER_ORDER_BOOKS_URL;
const MARKET_LIGHTER_CANDLE_ENDPOINT = import.meta.env.VITE_FLASHMASTER_LIGHTER_CANDLE_ENDPOINT || LIGHTER_CANDLES_URL;
const CACHE_KEY = 'flashmaster.marketQuotes.v1';
const CANDLE_CACHE_KEY_PREFIX = 'flashmaster.marketCandles.v1';

export const MARKET_REFRESH_INTERVAL_MS = 10_000;
export const MARKET_UI_UPDATE_INTERVAL_MS = 2_000;
export const MARKET_CANDLE_MAX_POINTS = 1000;
export const DEFAULT_MARKET_CANDLE_RANGE = '1d';
const MARKET_CACHE_INTERVAL_MS = 30_000;
const MARKET_CANDLE_CACHE_INTERVAL_MS = 2 * 60_000;
const MARKET_SOCKET_STALE_MS = 15_000;
const MARKET_SOURCE_HYPERLIQUID = 'hyperliquid';
const MARKET_SOURCE_LIGHTER = 'lighter';
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const MARKET_CANDLE_RANGES = [
  { key: '1d', label: '1d', interval: '1d' }
];

function intervalToMs(interval) {
  const value = Number.parseInt(interval, 10);
  if (!Number.isFinite(value)) return HOUR_MS;
  if (interval.endsWith('m')) return value * MINUTE_MS;
  if (interval.endsWith('h')) return value * HOUR_MS;
  if (interval.endsWith('d')) return value * DAY_MS;
  if (interval.endsWith('w')) return value * 7 * DAY_MS;
  return HOUR_MS;
}

export function getMarketCandleRange(key = DEFAULT_MARKET_CANDLE_RANGE) {
  return MARKET_CANDLE_RANGES.find(range => range.key === key)
    || MARKET_CANDLE_RANGES.find(range => range.key === DEFAULT_MARKET_CANDLE_RANGE)
    || MARKET_CANDLE_RANGES[0];
}

export function getMarketCandleWindow(key = DEFAULT_MARKET_CANDLE_RANGE, endTime = Date.now()) {
  const range = getMarketCandleRange(key);
  const durationMs = intervalToMs(range.interval) * MARKET_CANDLE_MAX_POINTS;
  return {
    range,
    endTime,
    startTime: endTime - durationMs,
    maxCandles: MARKET_CANDLE_MAX_POINTS
  };
}

export const TARGET_ASSETS = [
  { asset: 'xyz:MU', symbol: 'MU', labels: { chs: '美光', eng: 'MU' } },
  { asset: 'xyz:SNDK', symbol: 'SNDK', labels: { chs: '闪迪', eng: 'SNDK' } },
  { asset: 'xyz:SKHX', symbol: 'SKHX', labels: { chs: '海力士', eng: 'SKHX' }, lighterSymbols: ['SKHYNIXUSD'] },
  { asset: 'xyz:EWY', symbol: 'EWY', labels: { chs: 'EWY', eng: 'EWY' } },
  { asset: 'xyz:DRAM', symbol: 'DRAM', labels: { chs: 'DRAM', eng: 'DRAM' } },
  { asset: 'xyz:SMSN', symbol: 'SMSN', labels: { chs: '三星', eng: 'SMSN' }, lighterSymbols: ['SAMSUNGUSD'] },
  { asset: 'xyz:TSM', symbol: 'TSM', labels: { chs: '台积电', eng: 'TSMC' } },
  { asset: 'xyz:AMD', symbol: 'AMD', labels: { chs: 'AMD', eng: 'AMD' } },
  { asset: 'xyz:INTC', symbol: 'INTC', labels: { chs: '英特尔', eng: 'INTC' } },
  { asset: 'xyz:NVDA', symbol: 'NVDA', labels: { chs: '英伟达', eng: 'NVDA' } },
  { asset: 'xyz:GOLD', symbol: 'GOLD', labels: { chs: '黄金', eng: 'GOLD' }, lighterSymbols: ['XAU'] },
  { asset: 'xyz:SILVER', symbol: 'SILVER', labels: { chs: '白银', eng: 'SILV' }, lighterSymbols: ['XAG'] },
  { asset: 'xyz:CL', symbol: 'CL', labels: { chs: '原油', eng: 'CL' }, lighterSymbols: ['WTI'] },
  { asset: 'xyz:LLY', symbol: 'LLY', labels: { chs: '礼来', eng: 'LLY' } },
  { asset: 'xyz:TSLA', symbol: 'TSLA', labels: { chs: '特斯拉', eng: 'TSLA' } },
  { asset: 'xyz:AAPL', symbol: 'AAPL', labels: { chs: '苹果', eng: 'AAPL' } },
  { asset: 'xyz:GOOGL', symbol: 'GOOG', labels: { chs: '谷歌', eng: 'GOOG' } },
  { asset: 'xyz:MSFT', symbol: 'MSFT', labels: { chs: '微软', eng: 'MSFT' } },
  { asset: 'xyz:CRCL', symbol: 'CRCL', labels: { chs: 'CRCL', eng: 'CRCL' } },
  { asset: 'xyz:COIN', symbol: 'COIN', labels: { chs: 'COIN', eng: 'COIN' } },
  { asset: 'xyz:MSTR', symbol: 'MSTR', labels: { chs: 'MSTR', eng: 'MSTR' } },
  { asset: 'xyz:BABA', symbol: 'BABA', labels: { chs: '阿里', eng: 'BABA' } },
  { asset: 'xyz:MRVL', symbol: 'MRVL', labels: { chs: 'MRVL', eng: 'MRVL' } },
  { asset: 'xyz:LITE', symbol: 'LITE', labels: { chs: 'LITE', eng: 'LITE' } },
  { asset: 'xyz:USAR', symbol: 'USAR', labels: { chs: 'USAR', eng: 'USAR' } },
  { asset: 'xyz:SP500', symbol: 'SP500', labels: { chs: '标普', eng: 'SP500' }, lighterSymbols: ['SPY'] },
  { asset: 'xyz:HOOD', symbol: 'HOOD', labels: { chs: 'HOOD', eng: 'HOOD' } },
  { asset: 'xyz:CBRS', symbol: 'CBRS', labels: { chs: 'CBRS', eng: 'CBRS' } },
  { asset: 'xyz:PLTR', symbol: 'PLTR', labels: { chs: 'PLTR', eng: 'PLTR' } },
  { asset: 'xyz:NBIS', symbol: 'NBIS', labels: { chs: 'NBIS', eng: 'NBIS' } },
  { asset: 'xyz:SPCX', symbol: 'SPCX', labels: { chs: 'SPCX', eng: 'SPCX' } },
  { asset: 'lighter:BMNR', symbol: 'BMNR', labels: { chs: 'BMNR', eng: 'BMNR' } }
];

const targetByAsset = new Map(TARGET_ASSETS.map(item => [item.asset, item]));
const targetByLighterSymbol = buildLighterSymbolIndex();
let lighterMarketCatalogPromise;

function toNumber(value) {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : null;
}

function readPrice(ctx = {}) {
  return toNumber(ctx.markPx) ?? toNumber(ctx.midPx) ?? toNumber(ctx.oraclePx);
}

function isLighterSource(source) {
  return source === MARKET_SOURCE_LIGHTER || source === 'Lighter';
}

function isHyperliquidSource(source) {
  return source === MARKET_SOURCE_HYPERLIQUID || source === 'HL';
}

export function isAbortError(error, seen = new Set()) {
  if (!error) return false;
  if (seen.has(error)) return false;
  seen.add(error);
  const message = String(error.message || '').toLowerCase();
  return error.name === 'AbortError'
    || error.code === 20
    || message.includes('abort')
    || message.includes('cancelled')
    || message.includes('canceled')
    || isAbortError(error.cause, seen);
}

function getAlternateMarketSource(source) {
  return source === MARKET_SOURCE_LIGHTER
    ? MARKET_SOURCE_HYPERLIQUID
    : MARKET_SOURCE_LIGHTER;
}

function getTargetAssetSymbol(target) {
  const parts = String(target.asset || '').split(':');
  return parts[parts.length - 1];
}

function getLighterTargetSymbols(target) {
  return [
    getTargetAssetSymbol(target),
    target.symbol,
    ...(target.lighterSymbols || [])
  ]
    .filter(Boolean)
    .map(symbol => String(symbol).toUpperCase())
    .filter((symbol, index, symbols) => symbols.indexOf(symbol) === index);
}

function buildLighterSymbolIndex() {
  const index = new Map();
  TARGET_ASSETS.forEach(target => {
    getLighterTargetSymbols(target).forEach((symbol, priority) => {
      const existing = index.get(symbol);
      if (!existing || priority < existing.priority) {
        index.set(symbol, { target, priority });
      }
    });
  });
  return index;
}

function normalizeQuote(target, ctx = {}) {
  const price = readPrice(ctx);
  const previous = toNumber(ctx.prevDayPx);
  if (price === null || previous === null || previous === 0) return null;

  const change = price - previous;
  return {
    asset: target.asset,
    symbol: target.symbol,
    labels: target.labels,
    price,
    previous,
    change,
    changePercent: (change / previous) * 100,
    source: 'HL',
    updatedAt: Date.now()
  };
}

function normalizeWorkerPayload(data) {
  if (!Array.isArray(data?.items)) return null;
  return data.items
    .map(item => {
      const target = targetByAsset.get(item.asset) || TARGET_ASSETS.find(target => target.symbol === item.symbol);
      if (!target) return null;
      const price = toNumber(item.price);
      const changePercent = toNumber(item.changePercent);
      if (price === null || changePercent === null) return null;
      return {
        asset: target.asset,
        symbol: target.symbol,
        labels: target.labels,
        price,
        previous: toNumber(item.previous) ?? (changePercent !== 0 ? price / (1 + changePercent / 100) : price),
        change: toNumber(item.change) ?? 0,
        changePercent,
        source: item.source || 'HL',
        updatedAt: Date.parse(item.updatedAt || item.asOf || '') || Date.now()
      };
    })
    .filter(Boolean);
}

function normalizeHyperliquidPayload(data) {
  const universe = data?.[0]?.universe;
  const contexts = data?.[1];
  if (!Array.isArray(universe) || !Array.isArray(contexts)) return [];

  const contextByAsset = new Map();
  universe.forEach((asset, index) => {
    if (targetByAsset.has(asset?.name)) {
      contextByAsset.set(asset.name, contexts[index]);
    }
  });

  return TARGET_ASSETS
    .map(target => normalizeQuote(target, contextByAsset.get(target.asset)))
    .filter(Boolean);
}

function readLighterPrice(ctx = {}) {
  return toNumber(ctx.mid_price)
    ?? toNumber(ctx.mark_price)
    ?? toNumber(ctx.last_trade_price)
    ?? toNumber(ctx.index_price);
}

function normalizeLighterQuote(target, ctx = {}) {
  const price = readLighterPrice(ctx);
  const changePercent = toNumber(ctx.daily_price_change);
  if (price === null || price === 0 || changePercent === null || changePercent === -100) return null;

  const previous = price / (1 + changePercent / 100);
  if (!Number.isFinite(previous) || previous === 0) return null;

  return {
    asset: target.asset,
    symbol: target.symbol,
    labels: target.labels,
    price,
    previous,
    change: price - previous,
    changePercent,
    source: 'Lighter',
    sourceSymbol: ctx.symbol,
    sourceMarketId: Number.isFinite(Number(ctx.market_id)) ? Number(ctx.market_id) : null,
    updatedAt: Number.isFinite(Number(ctx.timestamp)) ? Number(ctx.timestamp) : Date.now()
  };
}

function lighterQuoteScore(ctx = {}, priority = 0) {
  const price = readLighterPrice(ctx);
  const volume = toNumber(ctx.daily_quote_token_volume) ?? 0;
  return (price ? 1_000_000_000 : 0) + (100 - priority) * 1_000_000 + volume;
}

function normalizeLighterPayload(data) {
  const stats = Array.isArray(data?.order_book_stats)
    ? data.order_book_stats
    : Object.values(data?.market_stats || {});
  if (!Array.isArray(stats) || !stats.length) return [];

  const bestByAsset = new Map();
  stats.forEach(ctx => {
    const entry = targetByLighterSymbol.get(String(ctx?.symbol || '').toUpperCase());
    if (!entry) return;

    const quote = normalizeLighterQuote(entry.target, ctx);
    if (!quote) return;

    const score = lighterQuoteScore(ctx, entry.priority);
    const current = bestByAsset.get(entry.target.asset);
    if (!current || score > current.score) {
      bestByAsset.set(entry.target.asset, { quote, score });
    }
  });

  return TARGET_ASSETS
    .map(target => bestByAsset.get(target.asset)?.quote)
    .filter(Boolean);
}

function normalizeMarketPayload(data) {
  const workerItems = normalizeWorkerPayload(data);
  if (workerItems) return workerItems;

  const hyperliquidItems = normalizeHyperliquidPayload(data);
  if (hyperliquidItems.length) return hyperliquidItems;

  return normalizeLighterPayload(data);
}

function normalizeMarketCandle(item) {
  const open = toNumber(item?.o);
  const high = toNumber(item?.h);
  const low = toNumber(item?.l);
  const close = toNumber(item?.c);
  const timeMs = Number(item?.t);
  if (![open, high, low, close].every(value => value !== null) || !Number.isFinite(timeMs)) return null;

  return {
    time: Math.floor(timeMs / 1000),
    open,
    high,
    low,
    close,
    volume: toNumber(item?.v) ?? 0,
    trades: Number.isFinite(Number(item?.n)) ? Number(item.n) : null,
    sourceTime: timeMs,
    closeTime: Number.isFinite(Number(item?.T)) ? Number(item.T) : null,
    interval: item?.i || '',
    symbol: item?.s || ''
  };
}

function normalizeCandlePayload(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map(normalizeMarketCandle)
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

function normalizeLighterMarketCandle(item) {
  const open = toNumber(item?.o);
  const high = toNumber(item?.h);
  const low = toNumber(item?.l);
  const close = toNumber(item?.c);
  const timeMs = Number(item?.t);
  if (![open, high, low, close].every(value => value !== null) || !Number.isFinite(timeMs)) return null;

  return {
    time: Math.floor(timeMs / 1000),
    open,
    high,
    low,
    close,
    volume: toNumber(item?.v) ?? 0,
    trades: Number.isFinite(Number(item?.i)) ? Number(item.i) : null,
    sourceTime: timeMs,
    closeTime: null,
    interval: '',
    symbol: ''
  };
}

function normalizeLighterCandlePayload(data) {
  const candles = Array.isArray(data?.c) ? data.c : [];
  return candles
    .map(normalizeLighterMarketCandle)
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

function readMidPrice(mids, target) {
  return toNumber(mids?.[target.asset]) ?? toNumber(mids?.[target.symbol]);
}

function applyMidsToQuotes(currentItems, mids) {
  const currentByAsset = new Map(currentItems.map(item => [item.asset, item]));
  return TARGET_ASSETS
    .map(target => {
      const current = currentByAsset.get(target.asset);
      const price = readMidPrice(mids, target);
      if (price === null) return current || null;
      const previous = toNumber(current?.previous) ?? toNumber(current?.price) ?? price;
      const change = price - previous;
      return {
        asset: target.asset,
        symbol: target.symbol,
        labels: target.labels,
        price,
        previous,
        change,
        changePercent: previous ? (change / previous) * 100 : 0,
        source: 'HL',
        updatedAt: Date.now()
      };
    })
    .filter(Boolean);
}

function mergeQuoteUpdates(currentItems, updates) {
  if (!currentItems.length) return updates;
  if (!updates.length) return currentItems;

  const nextByAsset = new Map(currentItems.map(item => [item.asset, item]));
  updates.forEach(item => {
    nextByAsset.set(item.asset, item);
  });

  return TARGET_ASSETS
    .map(target => nextByAsset.get(target.asset))
    .filter(Boolean);
}

function cacheQuotes(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, cachedAt: Date.now() }));
  } catch {
    // Non-critical: the ticker can still render fresh data.
  }
}

function sourceCacheKey(source) {
  return String(source || 'default').toLowerCase();
}

function candleCacheKey(asset, interval, rangeKey, source) {
  return `${CANDLE_CACHE_KEY_PREFIX}:${sourceCacheKey(source)}:${asset}:${rangeKey || interval}:${interval}`;
}

function cacheCandles(asset, interval, rangeKey, items, source) {
  try {
    localStorage.setItem(candleCacheKey(asset, interval, rangeKey, source), JSON.stringify({ items, cachedAt: Date.now() }));
  } catch {
    // Non-critical: expanded market charts can fetch fresh candles later.
  }
}

export function loadCachedMarketQuotes(maxAgeMs = 5 * 60_000) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!cached || Date.now() - Number(cached.cachedAt || 0) > maxAgeMs) return [];
    return Array.isArray(cached.items) ? cached.items : [];
  } catch {
    return [];
  }
}

export function loadCachedMarketCandles(asset, interval, rangeKey, source, maxAgeMs = MARKET_CANDLE_CACHE_INTERVAL_MS) {
  try {
    const cached = JSON.parse(localStorage.getItem(candleCacheKey(asset, interval, rangeKey, source)) || 'null');
    if (!cached || Date.now() - Number(cached.cachedAt || 0) > maxAgeMs) return [];
    return Array.isArray(cached.items) ? cached.items : [];
  } catch {
    return [];
  }
}

export async function fetchMarketQuotes(options = {}) {
  const preferLighter = isLighterSource(options.source) || !isHyperliquidSource(options.source);
  const fetchPrimary = preferLighter ? fetchLighterMarketQuotes : fetchConfiguredMarketQuotes;
  const fetchFallback = preferLighter ? fetchConfiguredMarketQuotes : fetchLighterMarketQuotes;

  try {
    return await fetchPrimary(options);
  } catch (primaryError) {
    if (isAbortError(primaryError)) throw primaryError;
    try {
      return await fetchFallback(options);
    } catch (fallbackError) {
      if (isAbortError(fallbackError)) throw fallbackError;
      const fallbackName = preferLighter ? 'Hyperliquid fallback' : 'Lighter fallback';
      const message = [
        primaryError?.message || String(primaryError),
        `${fallbackName}: ${fallbackError?.message || String(fallbackError)}`
      ].join('; ');
      throw new Error(message, { cause: fallbackError });
    }
  }
}

async function fetchConfiguredMarketQuotes(options = {}) {
  const isProxyEndpoint = MARKET_ENDPOINT !== HYPERLIQUID_INFO_URL;
  const response = await fetch(MARKET_ENDPOINT, {
    method: isProxyEndpoint ? 'GET' : 'POST',
    headers: isProxyEndpoint ? { Accept: 'application/json' } : { 'Content-Type': 'application/json' },
    body: isProxyEndpoint ? undefined : JSON.stringify({ type: 'metaAndAssetCtxs', dex: 'xyz' }),
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const items = normalizeMarketPayload(await response.json());
  if (!items.length) {
    throw new Error('No market data');
  }
  if (options.cache !== false) {
    cacheQuotes(items);
  }
  return items;
}

async function fetchLighterMarketQuotes(options = {}) {
  const response = await fetch(MARKET_LIGHTER_ENDPOINT, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const items = normalizeLighterPayload(await response.json());
  if (!items.length) {
    throw new Error('No Lighter market data');
  }
  if (options.cache !== false) {
    cacheQuotes(items);
  }
  return items;
}

export async function fetchMarketCandles(asset, options = {}) {
  const interval = options.interval;
  if (!interval) {
    throw new Error('Missing candle interval');
  }
  const rangeKey = options.rangeKey || interval;
  const maxCandles = options.maxCandles || MARKET_CANDLE_MAX_POINTS;
  const endTime = options.endTime || Date.now();
  const startTime = options.startTime || getMarketCandleWindow(rangeKey, endTime).startTime;
  const cached = options.cache === false ? [] : loadCachedMarketCandles(asset, interval, rangeKey, options.source, options.maxAgeMs);
  if (cached.length) return cached;

  const preferLighter = isLighterSource(options.source) || !isHyperliquidSource(options.source);
  const fetchPrimary = preferLighter ? fetchLighterMarketCandles : fetchHyperliquidMarketCandles;
  const fetchFallback = preferLighter ? fetchHyperliquidMarketCandles : fetchLighterMarketCandles;

  let items;
  try {
    items = await fetchPrimary(asset, {
      ...options,
      interval,
      rangeKey,
      maxCandles,
      endTime,
      startTime
    });
  } catch (primaryError) {
    if (isAbortError(primaryError)) throw primaryError;
    try {
      items = await fetchFallback(asset, {
        ...options,
        interval,
        rangeKey,
        maxCandles,
        endTime,
        startTime
      });
    } catch (fallbackError) {
      if (isAbortError(fallbackError)) throw fallbackError;
      const message = [
        primaryError?.message || String(primaryError),
        `Fallback candles: ${fallbackError?.message || String(fallbackError)}`
      ].join('; ');
      throw new Error(message, { cause: fallbackError });
    }
  }

  if (options.cache !== false) {
    cacheCandles(asset, interval, rangeKey, items, options.source);
  }
  return items;
}

async function fetchHyperliquidMarketCandles(asset, options = {}) {
  const interval = options.interval;
  const maxCandles = options.maxCandles || MARKET_CANDLE_MAX_POINTS;
  const endTime = options.endTime || Date.now();
  const startTime = options.startTime || getMarketCandleWindow(options.rangeKey || interval, endTime).startTime;
  const response = await fetch(MARKET_CANDLE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: {
        coin: asset,
        interval,
        startTime,
        endTime
      }
    }),
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const items = normalizeCandlePayload(await response.json()).slice(-maxCandles);
  if (!items.length) {
    throw new Error('No candle data');
  }
  return items;
}

async function loadLighterMarketCatalog() {
  if (!lighterMarketCatalogPromise) {
    lighterMarketCatalogPromise = fetch(MARKET_LIGHTER_ORDER_BOOKS_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const books = Array.isArray(data?.order_books) ? data.order_books : [];
        const bookBySymbol = new Map(books.map(book => [String(book?.symbol || '').toUpperCase(), book]));
        const marketByAsset = new Map();
        TARGET_ASSETS.forEach(target => {
          const book = getLighterTargetSymbols(target)
            .map(symbol => bookBySymbol.get(symbol))
            .find(item => item && item.status !== 'inactive');
          if (book) {
            marketByAsset.set(target.asset, {
              marketId: Number(book.market_id),
              symbol: book.symbol
            });
          }
        });
        return marketByAsset;
      })
      .catch(err => {
        lighterMarketCatalogPromise = undefined;
        throw err;
      });
  }
  return lighterMarketCatalogPromise;
}

async function fetchLighterMarketCandles(asset, options = {}) {
  const target = targetByAsset.get(asset);
  if (!target) {
    throw new Error('No Lighter market mapping');
  }

  const marketByAsset = await loadLighterMarketCatalog();
  const market = marketByAsset.get(target.asset);
  if (!market || !Number.isFinite(market.marketId)) {
    throw new Error('No Lighter market mapping');
  }

  const maxCandles = Math.min(options.maxCandles || MARKET_CANDLE_MAX_POINTS, 500);
  const params = new URLSearchParams({
    market_id: String(market.marketId),
    resolution: options.interval,
    start_timestamp: String(Math.floor(options.startTime / 1000)),
    end_timestamp: String(Math.floor(options.endTime / 1000)),
    count_back: String(maxCandles)
  });
  const response = await fetch(`${MARKET_LIGHTER_CANDLE_ENDPOINT}?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const items = normalizeLighterCandlePayload(await response.json()).slice(-maxCandles);
  if (!items.length) {
    throw new Error('No Lighter candle data');
  }
  return items;
}

export function subscribeMarketQuotes({ onUpdate, onError } = {}) {
  let stopped = false;
  let socket;
  let emitTimer;
  let socketMessageTimer;
  let fallbackTimer;
  let reconnectTimer;
  let refreshContextTimer;
  let fallbackDelayTimer;
  let heartbeatTimer;
  let fallbackSnapshotController;
  let contextSnapshotController;
  let currentItems = loadCachedMarketQuotes();
  let latestMids = null;
  let queuedItems = null;
  let queuedForceCache = false;
  let queuedSocketData = null;
  let lastEmitAt = 0;
  let lastCacheAt = 0;
  let lastSocketProcessAt = 0;
  let lastSocketMidsAt = 0;
  let socketStreaming = false;
  let socketSource = MARKET_SOURCE_LIGHTER;

  const hasLiveSocketMids = () => {
    return socketSource === MARKET_SOURCE_HYPERLIQUID
      && socketStreaming
      && latestMids
      && Date.now() - lastSocketMidsAt <= MARKET_SOCKET_STALE_MS;
  };

  const abortFallbackSnapshot = () => {
    fallbackSnapshotController?.abort();
    fallbackSnapshotController = undefined;
  };

  const abortContextSnapshot = () => {
    contextSnapshotController?.abort();
    contextSnapshotController = undefined;
  };

  const maybeCache = (items, force = false) => {
    const now = Date.now();
    if (force || now - lastCacheAt >= MARKET_CACHE_INTERVAL_MS) {
      cacheQuotes(items);
      lastCacheAt = now;
    }
  };

  const deliver = (items, { forceCache = false } = {}) => {
    if (!items.length) return;
    currentItems = items;
    lastEmitAt = Date.now();
    maybeCache(items, forceCache);
    onUpdate?.(items);
  };

  const emit = (items, { immediate = false, forceCache = false } = {}) => {
    if (!items.length) return;
    currentItems = items;
    if (immediate) {
      window.clearTimeout(emitTimer);
      emitTimer = undefined;
      queuedItems = null;
      queuedForceCache = false;
      deliver(items, { forceCache });
      return;
    }

    queuedItems = items;
    queuedForceCache ||= forceCache;
    const waitMs = Math.max(0, MARKET_UI_UPDATE_INTERVAL_MS - (Date.now() - lastEmitAt));
    if (waitMs === 0) {
      window.clearTimeout(emitTimer);
      emitTimer = undefined;
      const nextItems = queuedItems;
      const shouldForceCache = queuedForceCache;
      queuedItems = null;
      queuedForceCache = false;
      deliver(nextItems, { forceCache: shouldForceCache });
      return;
    }
    if (!emitTimer) {
      emitTimer = window.setTimeout(() => {
        emitTimer = undefined;
        const nextItems = queuedItems;
        const shouldForceCache = queuedForceCache;
        queuedItems = null;
        queuedForceCache = false;
        deliver(nextItems, { forceCache: shouldForceCache });
      }, waitMs);
    }
  };

  const stopFallback = () => {
    window.clearInterval(fallbackTimer);
    window.clearTimeout(fallbackDelayTimer);
    fallbackTimer = undefined;
    fallbackDelayTimer = undefined;
    abortFallbackSnapshot();
  };

  const stopHeartbeat = () => {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  };

  const refreshSnapshot = async ({ reason = 'context' } = {}) => {
    const isFallback = reason === 'fallback';
    const controller = new AbortController();
    if (isFallback) {
      abortFallbackSnapshot();
      fallbackSnapshotController = controller;
    } else {
      abortContextSnapshot();
      contextSnapshotController = controller;
    }

    try {
      const snapshot = await fetchMarketQuotes({ cache: false, signal: controller.signal });
      if (stopped || controller.signal.aborted) return;

      const hasLiveSocket = hasLiveSocketMids();
      if (isFallback && hasLiveSocket) return;

      const stableSnapshot = mergeQuoteUpdates(currentItems, snapshot);
      const nextItems = hasLiveSocket ? applyMidsToQuotes(stableSnapshot, latestMids) : stableSnapshot;
      emit(nextItems, {
        immediate: !hasLiveSocket,
        forceCache: true
      });
    } catch (err) {
      if (isAbortError(err)) return;
      onError?.(err);
    } finally {
      if (fallbackSnapshotController === controller) {
        fallbackSnapshotController = undefined;
      }
      if (contextSnapshotController === controller) {
        contextSnapshotController = undefined;
      }
    }
  };

  const startFallback = () => {
    if (fallbackTimer || stopped) return;
    refreshSnapshot({ reason: 'fallback' });
    fallbackTimer = window.setInterval(() => refreshSnapshot({ reason: 'fallback' }), MARKET_REFRESH_INTERVAL_MS);
  };

  const scheduleReconnect = (source = MARKET_SOURCE_LIGHTER) => {
    if (stopped) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(() => connectWebSocket(source), 5_000);
  };

  const handleMids = mids => {
    latestMids = mids;
    socketSource = MARKET_SOURCE_HYPERLIQUID;
    lastSocketMidsAt = Date.now();
    socketStreaming = true;
    stopFallback();
    emit(applyMidsToQuotes(currentItems, mids));
  };

  const handleLighterStats = data => {
    const items = normalizeLighterPayload(data);
    if (!items.length) return;
    const nextItems = mergeQuoteUpdates(currentItems, items);
    latestMids = null;
    socketSource = MARKET_SOURCE_LIGHTER;
    lastSocketMidsAt = Date.now();
    socketStreaming = true;
    stopFallback();
    emit(nextItems);
  };

  const processQueuedSocketData = () => {
    socketMessageTimer = undefined;
    const queued = queuedSocketData;
    queuedSocketData = null;
    if (!queued) return;
    lastSocketProcessAt = Date.now();
    try {
      const message = JSON.parse(queued.raw);
      if (queued.source === MARKET_SOURCE_HYPERLIQUID && message.channel === 'allMids') {
        handleMids(message.data?.mids || message.data || {});
      }
      if (queued.source === MARKET_SOURCE_LIGHTER && String(message.channel || '').startsWith('market_stats')) {
        handleLighterStats(message);
      }
    } catch (err) {
      onError?.(err);
    }
  };

  const queueSocketData = (raw, source) => {
    const marker = source === MARKET_SOURCE_LIGHTER ? '"market_stats"' : '"allMids"';
    if (!String(raw).includes(marker)) return false;
    queuedSocketData = { raw, source };
    const waitMs = Math.max(0, MARKET_UI_UPDATE_INTERVAL_MS - (Date.now() - lastSocketProcessAt));
    if (waitMs === 0) {
      window.clearTimeout(socketMessageTimer);
      processQueuedSocketData();
      return true;
    }
    if (!socketMessageTimer) {
      socketMessageTimer = window.setTimeout(processQueuedSocketData, waitMs);
    }
    return true;
  };

  const sendHeartbeat = () => {
    if (socket?.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify({ method: 'ping' }));
    } catch (err) {
      onError?.(err);
    }
  };

  function connectWebSocket(source = MARKET_SOURCE_LIGHTER) {
    if (stopped) return;
    if (!('WebSocket' in window)) {
      startFallback();
      return;
    }

    socketSource = source;
    const isLighterSocket = source === MARKET_SOURCE_LIGHTER;
    const socketUrl = isLighterSocket ? MARKET_LIGHTER_WS_ENDPOINT : MARKET_WS_ENDPOINT;

    try {
      socket = new WebSocket(socketUrl);
    } catch (err) {
      onError?.(err);
      startFallback();
      scheduleReconnect(getAlternateMarketSource(source));
      return;
    }

    let hasReceivedSocketData = false;

    socket.addEventListener('open', () => {
      socketStreaming = false;
      stopFallback();
      if (isLighterSocket) {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel: 'market_stats/all'
        }));
      } else {
        socket.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'allMids', dex: 'xyz' }
        }));
        sendHeartbeat();
        heartbeatTimer = window.setInterval(sendHeartbeat, 25_000);
      }
      fallbackDelayTimer = window.setTimeout(() => {
        if (!hasReceivedSocketData) {
          startFallback();
          socket?.close();
        }
      }, MARKET_REFRESH_INTERVAL_MS);
    });

    socket.addEventListener('message', event => {
      if (queueSocketData(event.data, source)) {
        hasReceivedSocketData = true;
      }
    });

    socket.addEventListener('error', () => {
      socketStreaming = false;
      onError?.(new Error(isLighterSocket ? 'Lighter WebSocket error' : 'Hyperliquid WebSocket error'));
    });

    socket.addEventListener('close', () => {
      socketStreaming = false;
      stopHeartbeat();
      window.clearTimeout(socketMessageTimer);
      socketMessageTimer = undefined;
      queuedSocketData = null;
      queuedForceCache = false;
      window.clearTimeout(fallbackDelayTimer);
      if (!stopped) {
        startFallback();
        const nextSource = isLighterSocket || hasReceivedSocketData
          ? (hasReceivedSocketData ? source : getAlternateMarketSource(source))
          : MARKET_SOURCE_LIGHTER;
        scheduleReconnect(nextSource);
      }
    });
  }

  if (currentItems.length) {
    emit(currentItems, { immediate: true });
  }
  refreshSnapshot({ reason: 'initial' });
  connectWebSocket();
  refreshContextTimer = window.setInterval(() => refreshSnapshot({ reason: 'context' }), 5 * 60_000);

  return () => {
    stopped = true;
    window.clearInterval(fallbackTimer);
    window.clearTimeout(emitTimer);
    window.clearTimeout(socketMessageTimer);
    window.clearInterval(refreshContextTimer);
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(fallbackDelayTimer);
    abortFallbackSnapshot();
    abortContextSnapshot();
    stopHeartbeat();
    socket?.close();
  };
}
