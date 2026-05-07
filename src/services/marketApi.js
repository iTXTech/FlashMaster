const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const MARKET_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_ENDPOINT || HYPERLIQUID_INFO_URL;
const MARKET_WS_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_WS_ENDPOINT || HYPERLIQUID_WS_URL;
const CACHE_KEY = 'flashmaster.marketQuotes.v1';

export const MARKET_REFRESH_INTERVAL_MS = 10_000;
export const MARKET_UI_UPDATE_INTERVAL_MS = 2_000;
const MARKET_CACHE_INTERVAL_MS = 30_000;

export const TARGET_ASSETS = [
  { asset: 'xyz:MU', symbol: 'MU', labels: { chs: '美光', eng: 'MU' } },
  { asset: 'xyz:SNDK', symbol: 'SNDK', labels: { chs: '闪迪', eng: 'SNDK' } },
  { asset: 'xyz:SKHX', symbol: 'SKHX', labels: { chs: '海力士', eng: 'SKHX' } },
  { asset: 'xyz:EWY', symbol: 'EWY', labels: { chs: 'EWY', eng: 'EWY' } },
  { asset: 'xyz:DRAM', symbol: 'DRAM', labels: { chs: 'DRAM', eng: 'DRAM' } },
  { asset: 'xyz:SMSN', symbol: 'SMSN', labels: { chs: '三星', eng: 'SMSN' } },
  { asset: 'xyz:TSM', symbol: 'TSM', labels: { chs: '台积电', eng: 'TSMC' } },
  { asset: 'xyz:AMD', symbol: 'AMD', labels: { chs: 'AMD', eng: 'AMD' } },
  { asset: 'xyz:INTC', symbol: 'INTC', labels: { chs: '英特尔', eng: 'INTC' } },
  { asset: 'xyz:NVDA', symbol: 'NVDA', labels: { chs: '英伟达', eng: 'NVDA' } },
  { asset: 'xyz:GOLD', symbol: 'GOLD', labels: { chs: '黄金', eng: 'GOLD' } },
  { asset: 'xyz:SILVER', symbol: 'SILVER', labels: { chs: '白银', eng: 'SILV' } },
  { asset: 'xyz:CL', symbol: 'CL', labels: { chs: '原油', eng: 'CL' } },
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
  { asset: 'xyz:SP500', symbol: 'SP500', labels: { chs: '标普', eng: 'SP500' } },
  { asset: 'xyz:HOOD', symbol: 'HOOD', labels: { chs: 'HOOD', eng: 'HOOD' } }
];

const targetByAsset = new Map(TARGET_ASSETS.map(item => [item.asset, item]));

function toNumber(value) {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : null;
}

function readPrice(ctx = {}) {
  return toNumber(ctx.markPx) ?? toNumber(ctx.midPx) ?? toNumber(ctx.oraclePx);
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

function normalizeMarketPayload(data) {
  return normalizeWorkerPayload(data) || normalizeHyperliquidPayload(data);
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

function cacheQuotes(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, cachedAt: Date.now() }));
  } catch {
    // Non-critical: the ticker can still render fresh data.
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

export async function fetchMarketQuotes(options = {}) {
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
  let currentItems = loadCachedMarketQuotes();
  let latestMids = null;
  let queuedItems = null;
  let queuedSocketData = null;
  let lastEmitAt = 0;
  let lastCacheAt = 0;
  let lastSocketProcessAt = 0;

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
      deliver(items, { forceCache });
      return;
    }

    queuedItems = items;
    const waitMs = Math.max(0, MARKET_UI_UPDATE_INTERVAL_MS - (Date.now() - lastEmitAt));
    if (waitMs === 0) {
      window.clearTimeout(emitTimer);
      emitTimer = undefined;
      const nextItems = queuedItems;
      queuedItems = null;
      deliver(nextItems, { forceCache });
      return;
    }
    if (!emitTimer) {
      emitTimer = window.setTimeout(() => {
        emitTimer = undefined;
        const nextItems = queuedItems;
        queuedItems = null;
        deliver(nextItems, { forceCache });
      }, waitMs);
    }
  };

  const stopFallback = () => {
    window.clearInterval(fallbackTimer);
    window.clearTimeout(fallbackDelayTimer);
    fallbackTimer = undefined;
    fallbackDelayTimer = undefined;
  };

  const stopHeartbeat = () => {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  };

  const refreshSnapshot = async () => {
    try {
      const snapshot = await fetchMarketQuotes({ cache: false });
      emit(latestMids ? applyMidsToQuotes(snapshot, latestMids) : snapshot, {
        immediate: true,
        forceCache: true
      });
    } catch (err) {
      onError?.(err);
    }
  };

  const startFallback = () => {
    if (fallbackTimer || stopped) return;
    refreshSnapshot();
    fallbackTimer = window.setInterval(refreshSnapshot, MARKET_REFRESH_INTERVAL_MS);
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connectWebSocket, 5_000);
  };

  const handleMids = mids => {
    latestMids = mids;
    stopFallback();
    emit(applyMidsToQuotes(currentItems, mids));
  };

  const processQueuedSocketData = () => {
    socketMessageTimer = undefined;
    const raw = queuedSocketData;
    queuedSocketData = null;
    if (!raw) return;
    lastSocketProcessAt = Date.now();
    try {
      const message = JSON.parse(raw);
      if (message.channel === 'allMids') {
        handleMids(message.data?.mids || message.data || {});
      }
    } catch (err) {
      onError?.(err);
    }
  };

  const queueSocketData = raw => {
    if (!String(raw).includes('"allMids"')) return false;
    queuedSocketData = raw;
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

  function connectWebSocket() {
    if (stopped) return;
    if (!('WebSocket' in window)) {
      startFallback();
      return;
    }

    try {
      socket = new WebSocket(MARKET_WS_ENDPOINT);
    } catch (err) {
      onError?.(err);
      startFallback();
      scheduleReconnect();
      return;
    }

    let hasReceivedSocketMids = false;

    socket.addEventListener('open', () => {
      stopFallback();
      socket.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'allMids', dex: 'xyz' }
      }));
      sendHeartbeat();
      heartbeatTimer = window.setInterval(sendHeartbeat, 25_000);
      fallbackDelayTimer = window.setTimeout(() => {
        if (!hasReceivedSocketMids) {
          startFallback();
        }
      }, MARKET_REFRESH_INTERVAL_MS);
    });

    socket.addEventListener('message', event => {
      if (queueSocketData(event.data)) {
        hasReceivedSocketMids = true;
      }
    });

    socket.addEventListener('error', () => {
      onError?.(new Error('Hyperliquid WebSocket error'));
    });

    socket.addEventListener('close', () => {
      stopHeartbeat();
      window.clearTimeout(socketMessageTimer);
      socketMessageTimer = undefined;
      queuedSocketData = null;
      window.clearTimeout(fallbackDelayTimer);
      if (!stopped) {
        startFallback();
        scheduleReconnect();
      }
    });
  }

  if (currentItems.length) {
    emit(currentItems, { immediate: true });
  }
  refreshSnapshot();
  connectWebSocket();
  refreshContextTimer = window.setInterval(refreshSnapshot, 5 * 60_000);

  return () => {
    stopped = true;
    window.clearInterval(fallbackTimer);
    window.clearTimeout(emitTimer);
    window.clearTimeout(socketMessageTimer);
    window.clearInterval(refreshContextTimer);
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(fallbackDelayTimer);
    stopHeartbeat();
    socket?.close();
  };
}
