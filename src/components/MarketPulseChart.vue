<template>
  <section class="market-chart-panel" :aria-label="chartLabel">
    <header class="market-chart-header">
      <div class="market-chart-title">
        <span class="market-chart-symbol">{{ item.name || item.symbol }}</span>
      </div>
      <div class="market-chart-quote">
        <span :class="['market-chart-price', livePriceFlash]">{{ item.priceText }}</span>
        <span :class="['market-chart-change', item.trend]">{{ item.changeText }}</span>
      </div>
      <v-btn
        class="market-chart-close"
        icon="mdi-close"
        size="x-small"
        density="compact"
        variant="text"
        :title="$t('market.chartClose')"
        @click="$emit('close')"
      />
    </header>

    <div class="market-chart-body">
      <div ref="chartRoot" class="market-chart-canvas" />
      <div v-if="loading" class="market-chart-state">{{ $t('market.chartLoading') }}</div>
      <div v-else-if="error" class="market-chart-state is-error">
        <span>{{ error }}</span>
        <v-btn size="x-small" density="compact" variant="tonal" @click="loadCandles">{{ $t('market.chartRetry') }}</v-btn>
      </div>
    </div>

    <footer class="market-chart-footer">
      <span>{{ activeTimeText }}</span>
      <span>{{ $t('market.candleFields.open') }} {{ formatPrice(activeCandle?.open) }}</span>
      <span>{{ $t('market.candleFields.high') }} {{ formatPrice(activeCandle?.high) }}</span>
      <span>{{ $t('market.candleFields.low') }} {{ formatPrice(activeCandle?.low) }}</span>
      <span>{{ $t('market.candleFields.close') }} {{ formatPrice(activeCandle?.close) }}</span>
      <span>{{ $t('market.candleFields.volume') }} {{ formatVolume(activeCandle?.volume) }}</span>
    </footer>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  DEFAULT_MARKET_CANDLE_RANGE,
  MARKET_CANDLE_MAX_POINTS,
  fetchMarketCandles,
  getMarketCandleRange,
  getMarketCandleWindow,
  isAbortError,
  loadCachedMarketCandles
} from '@/services/marketApi';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

defineEmits(['close']);

const { locale, t } = useI18n();
const chartRoot = ref(null);
const activeRangeKey = ref(DEFAULT_MARKET_CANDLE_RANGE);
const activeRange = computed(() => getMarketCandleRange(activeRangeKey.value));
const candles = ref(loadCachedMarketCandles(
  props.item.asset,
  activeRange.value.interval,
  activeRange.value.key,
  props.item.source
));
const activeCandle = ref(candles.value.at(-1) || null);
const loading = ref(false);
const error = ref('');
const livePriceFlash = ref('');
let chart;
let candleSeries;
let volumeSeries;
let resizeObserver;
let livePriceFlashTimer;
let requestController;
let requestId = 0;
let lightweightCharts;
let hoveredCandleTime = null;

const chartLabel = computed(() => t('market.chartAriaLabel', [props.item.name || props.item.symbol]));
const activeTimeText = computed(() => formatTime(activeCandle.value?.time));

function formatPrice(value) {
  if (typeof value !== 'number') return '--';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: Math.abs(value) >= 100 ? 2 : 3,
    maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 3
  });
}

function formatVolume(value) {
  if (typeof value !== 'number') return '--';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(value >= 10 ? 0 : 2);
}

function formatTime(time) {
  if (!time) return '--';
  return new Intl.DateTimeFormat(locale.value === 'chs' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time * 1000));
}

function cssVar(name, fallback) {
  const value = getComputedStyle(chartRoot.value || document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function themeColor(name, alpha = 1, fallback = '0, 0, 0') {
  return `rgba(${cssVar(name, fallback)}, ${alpha})`;
}

async function ensureChart() {
  if (!chartRoot.value || chart) return;
  lightweightCharts ||= await import('lightweight-charts');
  const { CandlestickSeries, CrosshairMode, HistogramSeries, createChart } = lightweightCharts;
  const width = chartRoot.value.clientWidth || 560;
  const height = chartRoot.value.clientHeight || 220;

  chart = createChart(chartRoot.value, {
    width,
    height,
    layout: {
      background: { type: 'solid', color: 'transparent' },
      textColor: themeColor('--v-theme-on-surface', 0.64)
    },
    grid: {
      vertLines: { color: themeColor('--v-theme-on-surface', 0.06) },
      horzLines: { color: themeColor('--v-theme-on-surface', 0.06) }
    },
    crosshair: { mode: CrosshairMode.Magnet },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.08, bottom: 0.26 }
    },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 2,
      barSpacing: 6
    },
    localization: {
      priceFormatter: formatPrice
    }
  });

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#00b386',
    downColor: '#ff5b6b',
    borderVisible: false,
    wickUpColor: '#00b386',
    wickDownColor: '#ff5b6b'
  });
  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume'
  });
  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.78, bottom: 0 }
  });
  chart.subscribeCrosshairMove(handleCrosshairMove);

  resizeObserver = new ResizeObserver(resizeChart);
  resizeObserver.observe(chartRoot.value);
}

function candleByTime(time) {
  return candles.value.find(item => item.time === Number(time)) || null;
}

function handleCrosshairMove(param) {
  if (param?.time === undefined) {
    hoveredCandleTime = null;
    activeCandle.value = candles.value.at(-1) || null;
    return;
  }
  hoveredCandleTime = Number(param.time);
  activeCandle.value = candleByTime(hoveredCandleTime) || candles.value.at(-1) || null;
}

function resizeChart() {
  if (!chart || !chartRoot.value) return;
  const width = chartRoot.value.clientWidth;
  const height = chartRoot.value.clientHeight;
  if (width && height) {
    chart.resize(width, height);
  }
}

function renderCandles() {
  if (!chart || !candleSeries || !volumeSeries || !candles.value.length) return;
  candleSeries.setData(candles.value.map(({ time, open, high, low, close }) => ({
    time,
    open,
    high,
    low,
    close
  })));
  volumeSeries.setData(candles.value.map(({ time, open, close, volume }) => ({
    time,
    value: volume,
    color: close >= open ? 'rgba(0, 179, 134, 0.26)' : 'rgba(255, 91, 107, 0.26)'
  })));
  activeCandle.value = candles.value.at(-1) || null;
  chart.timeScale().fitContent();
  updateLivePrice(props.item.price);
}

function clearCandles() {
  candles.value = [];
  activeCandle.value = null;
  hoveredCandleTime = null;
  candleSeries?.setData([]);
  volumeSeries?.setData([]);
}

function intervalSeconds(interval) {
  const value = Number.parseInt(interval, 10);
  if (!Number.isFinite(value)) return 3600;
  if (interval.endsWith('m')) return value * 60;
  if (interval.endsWith('h')) return value * 3600;
  if (interval.endsWith('d')) return value * 86_400;
  if (interval.endsWith('w')) return value * 604_800;
  return 3600;
}

function updateLivePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0 || !candles.value.length) return;

  const bucketSize = intervalSeconds(activeRange.value.interval);
  const bucket = Math.floor(Date.now() / 1000 / bucketSize) * bucketSize;
  const last = candles.value.at(-1);
  const lastTime = Number(last?.time);
  if (Number.isFinite(lastTime) && lastTime > bucket) return;

  const next = last && lastTime === bucket
    ? {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price
      }
    : {
        time: bucket,
        open: last?.close ?? price,
        high: price,
        low: price,
        close: price,
        volume: 0
      };

  if (last && lastTime === bucket) {
    candles.value[candles.value.length - 1] = next;
  } else {
    candles.value = [...candles.value, next].slice(-MARKET_CANDLE_MAX_POINTS);
  }

  candleSeries?.update({
    time: next.time,
    open: next.open,
    high: next.high,
    low: next.low,
    close: next.close
  });
  volumeSeries?.update({
    time: next.time,
    value: next.volume,
    color: next.close >= next.open ? 'rgba(0, 179, 134, 0.26)' : 'rgba(255, 91, 107, 0.26)'
  });

  if (hoveredCandleTime === null || hoveredCandleTime === lastTime || hoveredCandleTime === bucket) {
    activeCandle.value = next;
  }
}

function flashLivePrice(price, previousPrice) {
  if (!Number.isFinite(price) || !Number.isFinite(previousPrice) || price === previousPrice) return;
  window.clearTimeout(livePriceFlashTimer);
  livePriceFlash.value = '';
  window.requestAnimationFrame(() => {
    livePriceFlash.value = price > previousPrice ? 'is-live-up' : 'is-live-down';
    livePriceFlashTimer = window.setTimeout(() => {
      livePriceFlash.value = '';
    }, 900);
  });
}

async function loadCandles({ silent = false } = {}) {
  const currentRequestId = ++requestId;
  requestController?.abort();
  requestController = new AbortController();
  if (!silent) {
    loading.value = true;
  }
  error.value = '';

  try {
    const { range, startTime, endTime, maxCandles } = getMarketCandleWindow(activeRangeKey.value);
    const items = await fetchMarketCandles(props.item.asset, {
      interval: range.interval,
      rangeKey: range.key,
      startTime,
      endTime,
      maxCandles,
      fallback: false,
      marketId: props.item.sourceMarketId,
      source: props.item.source,
      signal: requestController.signal
    });
    if (currentRequestId !== requestId) return;
    candles.value = items;
    await nextTick();
    await ensureChart();
    renderCandles();
  } catch (err) {
    if (currentRequestId !== requestId) return;
    if (isAbortError(err)) return;
    error.value = err?.message || String(err);
  } finally {
    if (currentRequestId === requestId) {
      loading.value = false;
    }
  }
}

async function loadCachedRange() {
  const range = activeRange.value;
  const cached = loadCachedMarketCandles(props.item.asset, range.interval, range.key, props.item.source);
  if (!cached.length) {
    clearCandles();
    return false;
  }
  candles.value = cached;
  activeCandle.value = cached.at(-1) || null;
  await nextTick();
  await ensureChart();
  renderCandles();
  return true;
}

onMounted(async () => {
  await nextTick();
  if (candles.value.length) {
    await ensureChart();
    renderCandles();
  }
  loadCandles({ silent: candles.value.length > 0 });
});

onUnmounted(() => {
  requestController?.abort();
  window.clearTimeout(livePriceFlashTimer);
  resizeObserver?.disconnect();
  chart?.remove();
});

watch(() => props.item.price, (price, previousPrice) => {
  updateLivePrice(price);
  flashLivePrice(Number(price), Number(previousPrice));
});

watch(() => props.item.asset, () => {
  hoveredCandleTime = null;
  loadCachedRange().then(hasCachedRange => {
    loadCandles({ silent: hasCachedRange });
  });
});
</script>
