const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const MARKET_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_ENDPOINT || HYPERLIQUID_INFO_URL;
const MARKET_WS_ENDPOINT = import.meta.env.VITE_FLASHMASTER_MARKET_WS_ENDPOINT || HYPERLIQUID_WS_URL;
const CACHE_KEY = 'flashmaster.marketQuotes.v1';

export const MARKET_REFRESH_INTERVAL_MS = 10_000;

export const TARGET_ASSETS = [
  { asset: 'xyz:MU', symbol: 'MU', labels: { chs: '美光', eng: 'MU' } },
  { asset: 'xyz:SNDK', symbol: 'SNDK', labels: { chs: '闪迪', eng: 'SanDisk' } },
  { asset: 'xyz:SKHX', symbol: 'SKHX', labels: { chs: 'SK海力士', eng: 'SK hynix' } },
  { asset: 'xyz:EWY', symbol: 'EWY', labels: { chs: 'EWY', eng: 'EWY' } },
  { asset: 'xyz:DRAM', symbol: 'DRAM', labels: { chs: 'DRAM', eng: 'DRAM' } },
  { asset: 'xyz:SMSN', symbol: 'SMSN', labels: { chs: '三星电子', eng: 'Samsung' } },
  { asset: 'xyz:TSM', symbol: 'TSM', labels: { chs: '台积电', eng: 'TSM' } },
  { asset: 'xyz:AMD', symbol: 'AMD', labels: { chs: 'AMD', eng: 'AMD' } },
  { asset: 'xyz:NVDA', symbol: 'NVDA', labels: { chs: '英伟达', eng: 'NVIDIA' } },
  { asset: 'xyz:GOLD', symbol: 'GOLD', labels: { chs: '黄金', eng: 'Gold' } },
  { asset: 'xyz:SILVER', symbol: 'SILVER', labels: { chs: '白银', eng: 'Silver' } },
  { asset: 'xyz:CL', symbol: 'CL', labels: { chs: '原油', eng: 'Crude Oil' } },
  { asset: 'xyz:LLY', symbol: 'LLY', labels: { chs: '礼来', eng: 'Eli Lilly' } },
  { asset: 'xyz:TSLA', symbol: 'TSLA', labels: { chs: '特斯拉', eng: 'Tesla' } }
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
  cacheQuotes(items);
  return items;
}

export function subscribeMarketQuotes({ onUpdate, onError } = {}) {
  let stopped = false;
  let socket;
  let fallbackTimer;
  let reconnectTimer;
  let refreshContextTimer;
  let fallbackDelayTimer;
  let heartbeatTimer;
  let currentItems = loadCachedMarketQuotes();
  let latestMids = null;

  const emit = items => {
    if (!items.length) return;
    currentItems = items;
    cacheQuotes(items);
    onUpdate?.(items);
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
      const snapshot = await fetchMarketQuotes();
      emit(latestMids ? applyMidsToQuotes(snapshot, latestMids) : snapshot);
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
      try {
        const message = JSON.parse(event.data);
        if (message.channel === 'allMids') {
          hasReceivedSocketMids = true;
          handleMids(message.data?.mids || message.data || {});
        }
      } catch (err) {
        onError?.(err);
      }
    });

    socket.addEventListener('error', () => {
      onError?.(new Error('Hyperliquid WebSocket error'));
    });

    socket.addEventListener('close', () => {
      stopHeartbeat();
      window.clearTimeout(fallbackDelayTimer);
      if (!stopped) {
        startFallback();
        scheduleReconnect();
      }
    });
  }

  if (currentItems.length) {
    onUpdate?.(currentItems);
  }
  refreshSnapshot();
  connectWebSocket();
  refreshContextTimer = window.setInterval(refreshSnapshot, 5 * 60_000);

  return () => {
    stopped = true;
    window.clearInterval(fallbackTimer);
    window.clearInterval(refreshContextTimer);
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(fallbackDelayTimer);
    stopHeartbeat();
    socket?.close();
  };
}
