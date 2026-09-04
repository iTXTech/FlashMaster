import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const source = await readFile(new URL('../src/services/marketApi.js', import.meta.url), 'utf8');

async function createHarness({ catalogMarketId = 139 } = {}) {
  const requests = [];
  const storage = new Map();
  const context = createContext({
    AbortController,
    URLSearchParams,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    fetch: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      const requestUrl = String(url);
      if (requestUrl.endsWith('/exchangeStats')) {
        return response({
          order_book_stats: [{
            symbol: 'SNDK',
            last_trade_price: 1599.42,
            daily_price_change: 4.05,
            daily_quote_token_volume: 15_000_000
          }]
        });
      }
      if (requestUrl.endsWith('/orderBooks')) {
        return response({
          order_books: [{
            market_id: catalogMarketId,
            symbol: 'SNDK',
            status: 'active'
          }]
        });
      }
      if (requestUrl.includes('/candles?')) {
        return response({
          c: [{
            t: 1788480000000,
            o: 1550.01,
            h: 1608.4,
            l: 1549.42,
            c: 1599.3,
            v: 2968.13
          }]
        });
      }
      throw new Error(`Unexpected fetch: ${requestUrl}`);
    }
  });
  const requestControl = new SyntheticModule([
    'isRequestTimeoutError',
    'runWithRequestTimeout'
  ], function () {
    this.setExport('isRequestTimeoutError', () => false);
    this.setExport('runWithRequestTimeout', task => task(new AbortController().signal));
  }, { context });
  await requestControl.link(() => {});
  await requestControl.evaluate();

  const module = new SourceTextModule(source, {
    context,
    initializeImportMeta: meta => {
      meta.env = {};
    }
  });
  await module.link(specifier => {
    assert.equal(specifier, '@/services/requestControl');
    return requestControl;
  });
  await module.evaluate();

  return { api: module.namespace, requests, storage };
}

function response(data) {
  return {
    ok: true,
    json: async () => data
  };
}

function candleRequest(requests) {
  const request = requests.find(item => item.url.includes('/candles?'));
  assert.ok(request, 'expected a Lighter candle request');
  return new URL(request.url);
}

test('resolves a missing Lighter market id before exposing the quote or fetching candles', async () => {
  const harness = await createHarness();
  const quotes = await harness.api.fetchMarketQuotes({
    provider: harness.api.MARKET_PROVIDER_LIGHTER,
    cache: false,
    fallback: false
  });
  const sndk = quotes.find(item => item.asset === 'xyz:SNDK');

  assert.ok(sndk);
  assert.equal(sndk.market.key, 'lighter:139');
  assert.equal(sndk.market.instrument, '139');
  assert.equal(sndk.source, undefined);
  assert.equal(sndk.sourceMarketId, undefined);

  const snapshot = await harness.api.fetchMarketCandles(sndk.market, {
    interval: '1d',
    rangeKey: '1d',
    startTime: 1788480000000,
    endTime: 1788566400000,
    cache: false
  });

  assert.equal(candleRequest(harness.requests).searchParams.get('market_id'), '139');
  assert.equal(snapshot.marketKey, 'lighter:139');
  assert.equal(snapshot.items[0].open, 1550.01);
});

test('preserves an explicit Lighter market id of zero without treating absence as zero', async () => {
  const harness = await createHarness({ catalogMarketId: 0 });
  const quotes = await harness.api.fetchMarketQuotes({
    provider: harness.api.MARKET_PROVIDER_LIGHTER,
    cache: false,
    fallback: false
  });
  const sndk = quotes.find(item => item.asset === 'xyz:SNDK');

  assert.equal(sndk.market.key, 'lighter:0');
  await harness.api.fetchMarketCandles(sndk.market, {
    interval: '1d',
    rangeKey: '1d',
    startTime: 1788480000000,
    endTime: 1788566400000,
    cache: false
  });
  assert.equal(candleRequest(harness.requests).searchParams.get('market_id'), '0');
});

test('rejects live quote merging across market identities', async () => {
  const harness = await createHarness();
  const now = Date.UTC(2026, 8, 4, 10);
  const ethSnapshot = {
    market: {
      key: 'lighter:0',
      provider: 'lighter',
      instrument: '0',
      asset: 'xyz:SNDK',
      symbol: 'SNDK'
    },
    marketKey: 'lighter:0',
    items: [{
      time: Date.UTC(2026, 8, 4) / 1000,
      open: 2506.78,
      high: 2546,
      low: 2496.38,
      close: 2519.05,
      volume: 47443.34
    }]
  };
  const sndkQuote = {
    price: 1599.42,
    market: {
      key: 'lighter:139',
      provider: 'lighter',
      instrument: '139',
      asset: 'xyz:SNDK',
      symbol: 'SNDK'
    }
  };

  const unchanged = harness.api.mergeMarketQuoteIntoCandleSnapshot(
    ethSnapshot,
    sndkQuote,
    '1d',
    now
  );
  assert.equal(unchanged, ethSnapshot);

  const sndkSnapshot = {
    ...ethSnapshot,
    market: sndkQuote.market,
    marketKey: sndkQuote.market.key,
    items: [{
      ...ethSnapshot.items[0],
      open: 1550.01,
      high: 1608.4,
      low: 1549.42,
      close: 1599.3
    }]
  };
  const updated = harness.api.mergeMarketQuoteIntoCandleSnapshot(
    sndkSnapshot,
    sndkQuote,
    '1d',
    now
  );
  assert.notEqual(updated, sndkSnapshot);
  assert.equal(updated.items.at(-1).open, 1550.01);
  assert.equal(updated.items.at(-1).low, 1549.42);
  assert.equal(updated.items.at(-1).close, 1599.42);
});
