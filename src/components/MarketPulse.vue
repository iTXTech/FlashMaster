<template>
  <div :class="['market-pulse-shell', { 'is-chart-open': selectedMarketItem }]">
    <div ref="pulseRoot" class="market-pulse" :aria-label="$t('market.ariaLabel')" :title="pulseTitle">
      <div
        ref="pulseViewport"
        class="market-pulse-viewport"
      >
        <div
          v-if="visibleItems.length"
          ref="trackRef"
          :class="[
            'market-pulse-track',
            {
              'is-scroll-running': shouldAutoScroll && !isManualScroll,
              'is-manual-scroll': isManualScroll
            }
          ]"
          :style="trackStyle"
          @pointerdown="onPointerDown"
          @mouseenter="onMouseEnter"
          @mouseleave="onMouseLeave"
          @animationiteration="onScrollIteration"
        >
          <button
            v-for="item in visibleItems"
            :key="item.pulseKey"
            type="button"
            :class="['market-item', flashClass(item.asset), { 'is-selected': selectedAsset === item.asset }]"
            :style="{ left: `${item.x}px` }"
            :aria-expanded="selectedAsset === item.asset"
            :title="$t('market.chartOpen', [item.name])"
            @click="openMarketChart(item, $event)"
          >
            <span class="market-symbol">{{ item.name }}</span>
            <span class="market-price">{{ item.priceText }}</span>
            <span :class="['market-change', item.trend]">{{ item.changeText }}</span>
          </button>
        </div>
        <div v-else-if="loading" class="market-pulse-placeholder">{{ $t('market.loading') }}</div>
      </div>
      <v-btn
        class="market-pulse-close"
        icon="mdi-close"
        size="x-small"
        density="compact"
        variant="text"
        :title="$t('market.close')"
        @click="closeMarketPulse"
      />
    </div>
    <MarketPulseChart v-if="selectedMarketItem" :item="selectedMarketItem" @close="closeMarketChart" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import MarketPulseChart from '@/components/MarketPulseChart.vue';
import { trackMarketPulseEvent } from '@/services/analytics';
import { loadCachedMarketQuotes, subscribeMarketQuotes } from '@/services/marketApi';

const emit = defineEmits(['close']);
const route = useRoute();
const { locale, t } = useI18n();

const quotes = ref(loadCachedMarketQuotes());
const loading = ref(false);
const error = ref('');
const flashingAssets = ref({});
const renderedSlotCount = ref(4);
const windowStart = ref(0);
const selectedAsset = ref('');
const pulseRoot = ref(null);
const pulseViewport = ref(null);
const trackRef = ref(null);
const isHovered = ref(false);
const isDragging = ref(false);
const isManualScroll = ref(false);
const documentVisible = ref(!document.hidden);
const scrollOffset = ref(0);

let unsubscribeMarket;
let resizeObserver;
let flashTimer;
let manualResumeTimer;
let lastClientX = 0;
let dragDelta = 0;
let lastQuoteSignature = createQuoteSignature(quotes.value);
const MARKET_PULSE_RENDER_BUFFER_SLOTS = 2;
const MARKET_PULSE_SLOT_WIDTH = 200;
const MARKET_PULSE_SLOT_DURATION_MS = 18_000;

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const precisePriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

const visibleItems = computed(() => {
  const items = quotes.value;
  if (!items.length) return [];
  return Array.from({ length: renderedSlotCount.value }, (_, offset) => {
    const marketIndex = (windowStart.value + offset) % items.length;
    const item = items[marketIndex];
    return formatMarketItem(item, {
      pulseKey: `${windowStart.value}-${offset}-${item.asset}`,
      visibleIndex: offset + 1,
      marketIndex: marketIndex + 1,
      x: offset * MARKET_PULSE_SLOT_WIDTH
    });
  });
});

const selectedQuote = computed(() => {
  return quotes.value.find(item => item.asset === selectedAsset.value) || null;
});

const selectedMarketItem = computed(() => {
  return selectedQuote.value ? formatMarketItem(selectedQuote.value) : null;
});

const pulseTitle = computed(() => error.value ? `${t('market.title')} · ${error.value}` : t('market.title'));

const shouldAutoScroll = computed(() =>
  documentVisible.value
  && !isHovered.value
  && !isDragging.value
  && selectedQuote.value === null
  && quotes.value.length > 0
);

const trackStyle = computed(() => {
  const style = {
    '--market-slot-duration': `${MARKET_PULSE_SLOT_DURATION_MS}ms`,
    '--market-scroll-delay': `${-scrollOffsetToPhase(scrollOffset.value)}ms`
  };
  if (isManualScroll.value) {
    style.transform = `translate3d(${scrollOffset.value}px, 0, 0)`;
  }
  return style;
});

function formatMarketItem(item, extra = {}) {
  return {
    ...item,
    name: item.labels?.[locale.value] || item.labels?.eng || item.symbol,
    priceText: formatPrice(item.price),
    changeText: formatChange(item.changePercent),
    trend: item.changePercent >= 0 ? 'is-up' : 'is-down',
    ...extra
  };
}

function formatPrice(value) {
  return (Math.abs(value) >= 100 ? priceFormatter : precisePriceFormatter).format(value);
}

function formatChange(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function quotePrecision(value) {
  return Math.abs(value) >= 100 ? 2 : 3;
}

function createQuoteSignature(items) {
  return items.map(item => {
    return `${item.asset}:${item.price.toFixed(quotePrecision(item.price))}:${item.changePercent.toFixed(2)}`;
  }).join('|');
}

function flashClass(asset) {
  const direction = flashingAssets.value[asset];
  return direction ? `is-flashing-${direction}` : '';
}

function getVisibleAssetSet(items = quotes.value) {
  const length = items.length;
  const assets = new Set();
  if (!length) return assets;
  for (let offset = 0; offset < renderedSlotCount.value; offset += 1) {
    const item = items[(windowStart.value + offset) % length];
    if (item?.asset) {
      assets.add(item.asset);
    }
  }
  return assets;
}

function markPriceChanges(nextQuotes) {
  const previousByAsset = new Map(quotes.value.map(item => [item.asset, item.price]));
  const visibleAssets = getVisibleAssetSet(nextQuotes);
  const nextFlashes = {};
  nextQuotes.forEach(item => {
    const previous = previousByAsset.get(item.asset);
    if (visibleAssets.has(item.asset) && typeof previous === 'number' && item.price !== previous) {
      nextFlashes[item.asset] = item.price > previous ? 'up' : 'down';
    }
  });
  flashingAssets.value = nextFlashes;
  window.clearTimeout(flashTimer);
  if (Object.keys(nextFlashes).length) {
    flashTimer = window.setTimeout(() => {
      flashingAssets.value = {};
    }, 900);
  }
}

function handleMarketUpdate(nextQuotes) {
  const nextSignature = createQuoteSignature(nextQuotes);
  if (nextSignature === lastQuoteSignature) {
    loading.value = false;
    error.value = '';
    return;
  }
  markPriceChanges(nextQuotes);
  quotes.value = nextQuotes;
  lastQuoteSignature = nextSignature;
  loading.value = false;
  error.value = '';
}

function updateRenderedSlotCount() {
  const viewportWidth = pulseViewport.value?.clientWidth || pulseRoot.value?.clientWidth || 0;
  if (!viewportWidth) return;
  renderedSlotCount.value = Math.max(4, Math.ceil(viewportWidth / MARKET_PULSE_SLOT_WIDTH) + MARKET_PULSE_RENDER_BUFFER_SLOTS);
}

function applyManualScroll(delta) {
  const length = quotes.value.length;
  if (!length) return;

  let wStart = windowStart.value;
  let nextOffset = scrollOffset.value + delta;

  let changedWindow = false;
  while (nextOffset <= -MARKET_PULSE_SLOT_WIDTH) {
    nextOffset += MARKET_PULSE_SLOT_WIDTH;
    wStart = (wStart + 1) % length;
    changedWindow = true;
  }
  while (nextOffset > 0) {
    nextOffset -= MARKET_PULSE_SLOT_WIDTH;
    wStart = (wStart - 1 + length) % length;
    changedWindow = true;
  }

  scrollOffset.value = nextOffset;

  if (changedWindow) {
    windowStart.value = wStart;
  }
}

function scrollOffsetToPhase(offset) {
  const progress = ((-offset / MARKET_PULSE_SLOT_WIDTH) % 1 + 1) % 1;
  return progress * MARKET_PULSE_SLOT_DURATION_MS;
}

function readTrackOffset() {
  if (!trackRef.value) return scrollOffset.value;
  const transform = getComputedStyle(trackRef.value).transform;
  if (!transform || transform === 'none') return scrollOffset.value;
  const matrix = new DOMMatrixReadOnly(transform);
  return matrix.m41;
}

function freezeScroll() {
  window.clearTimeout(manualResumeTimer);
  if (!isManualScroll.value) {
    scrollOffset.value = readTrackOffset();
  }
  isManualScroll.value = true;
}

function resumeScroll() {
  window.clearTimeout(manualResumeTimer);
  if (shouldAutoScroll.value) {
    isManualScroll.value = false;
  }
}

function scheduleManualScrollEnd() {
  window.clearTimeout(manualResumeTimer);
  manualResumeTimer = window.setTimeout(resumeScroll, 180);
}

function onScrollIteration() {
  if (!shouldAutoScroll.value || isManualScroll.value || !quotes.value.length) return;
  windowStart.value = (windowStart.value + 1) % quotes.value.length;
}

function onMouseEnter() {
  isHovered.value = true;
}

function onMouseLeave() {
  isHovered.value = false;
}

function onPointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  freezeScroll();
  isDragging.value = true;
  lastClientX = e.clientX;
  dragDelta = 0;

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
  if (!isDragging.value) return;
  const delta = e.clientX - lastClientX;
  lastClientX = e.clientX;

  dragDelta += Math.abs(delta);
  applyManualScroll(delta);
}

function onPointerUp() {
  isDragging.value = false;
  resumeScroll();
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  setTimeout(() => {
    dragDelta = 0;
  }, 0);
}

function onWheel(e) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault();
    freezeScroll();
    applyManualScroll(-e.deltaX);
    scheduleManualScrollEnd();
  }
}

function startMarketService() {
  if (unsubscribeMarket || document.hidden) return;
  loading.value = quotes.value.length === 0;
  unsubscribeMarket = subscribeMarketQuotes({
    onUpdate: handleMarketUpdate,
    onError: err => {
      error.value = err.message || String(err);
      loading.value = false;
    }
  });
}

function stopMarketService() {
  unsubscribeMarket?.();
  unsubscribeMarket = undefined;
  loading.value = false;
}

function handleVisibilityChange() {
  documentVisible.value = !document.hidden;
  if (document.hidden) {
    stopMarketService();
    flashingAssets.value = {};
  } else {
    startMarketService();
  }
}

function closeMarketPulse() {
  trackPulseEvent('market_pulse_visibility', 'dismiss', null, { enabled: false });
  stopMarketService();
  selectedAsset.value = '';
  emit('close');
}

function openMarketChart(item, event) {
  if (dragDelta > 5) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  const previousItem = selectedMarketItem.value;
  const shouldCloseCurrent = selectedAsset.value === item.asset;

  if (shouldCloseCurrent) {
    selectedAsset.value = '';
    trackPulseEvent('market_pulse_chart', 'close', item);
    return;
  }

  if (previousItem) {
    trackPulseEvent('market_pulse_chart', 'switch_close', previousItem);
  }

  selectedAsset.value = item.asset;
  trackPulseEvent('market_pulse_chart', 'open', item);
}

function closeMarketChart() {
  if (selectedMarketItem.value) {
    trackPulseEvent('market_pulse_chart', 'close', selectedMarketItem.value);
  }
  selectedAsset.value = '';
}

function trackPulseEvent(event, action, item = null, options = {}) {
  trackMarketPulseEvent({
    event,
    routeName: route.name,
    action,
    item,
    visiblePosition: item?.visibleIndex,
    cyclePosition: item?.marketIndex,
    visibleSlots: renderedSlotCount.value,
    ...options
  });
}
onMounted(() => {
  resizeObserver = new ResizeObserver(updateRenderedSlotCount);
  if (pulseViewport.value) {
    resizeObserver.observe(pulseViewport.value);
    pulseViewport.value.addEventListener('wheel', onWheel, { passive: false });
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  startMarketService();
  nextTick(() => {
    updateRenderedSlotCount();
  });
});

onUnmounted(() => {
  stopMarketService();
  window.clearTimeout(manualResumeTimer);
  resizeObserver?.disconnect();
  if (pulseViewport.value) {
    pulseViewport.value.removeEventListener('wheel', onWheel);
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.clearTimeout(flashTimer);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
});

watch(() => quotes.value.length, length => {
  if (windowStart.value >= length) {
    windowStart.value = 0;
  }
  if (selectedAsset.value && !selectedMarketItem.value) {
    selectedAsset.value = '';
  }
  nextTick(() => {
    updateRenderedSlotCount();
  });
});

watch(shouldAutoScroll, running => {
  if (running) {
    resumeScroll();
  } else {
    freezeScroll();
  }
}, { flush: 'sync' });
</script>
