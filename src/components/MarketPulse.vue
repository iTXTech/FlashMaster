<template>
  <div ref="pulseRoot" class="market-pulse" :aria-label="$t('market.ariaLabel')" :title="pulseTitle">
    <div ref="pulseViewport" class="market-pulse-viewport">
      <div v-if="visibleItems.length" class="market-pulse-track" @animationiteration="advancePulseWindow">
        <span
          v-for="item in visibleItems"
          :key="item.pulseKey"
          :class="['market-item', flashClass(item.asset)]"
          :style="{ left: `${item.x}px` }"
        >
          <span class="market-symbol">{{ item.name }}</span>
          <span class="market-price">{{ item.priceText }}</span>
          <span :class="['market-change', item.trend]">{{ item.changeText }}</span>
        </span>
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
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { trackInteractionEvent } from '@/services/analytics';
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
const pulseRoot = ref(null);
const pulseViewport = ref(null);
let unsubscribeMarket;
let resizeObserver;
let flashTimer;
let lastQuoteSignature = createQuoteSignature(quotes.value);
const MARKET_PULSE_RENDER_BUFFER_SLOTS = 2;
const MARKET_PULSE_SLOT_WIDTH = 200;

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

const baseItems = computed(() => quotes.value.map(item => ({
  ...item,
  name: item.labels?.[locale.value] || item.labels?.eng || item.symbol,
  priceText: formatPrice(item.price),
  changeText: formatChange(item.changePercent),
  trend: item.changePercent >= 0 ? 'is-up' : 'is-down'
})));

const visibleItems = computed(() => {
  if (!baseItems.value.length) return [];
  return Array.from({ length: renderedSlotCount.value }, (_, offset) => {
    const item = baseItems.value[(windowStart.value + offset) % baseItems.value.length];
    return {
      ...item,
      pulseKey: `${windowStart.value}-${offset}-${item.asset}`,
      x: offset * MARKET_PULSE_SLOT_WIDTH
    };
  });
});

const pulseTitle = computed(() => error.value ? `${t('market.title')} · ${error.value}` : t('market.title'));

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

function markPriceChanges(nextQuotes) {
  const previousByAsset = new Map(quotes.value.map(item => [item.asset, item.price]));
  const nextFlashes = {};
  nextQuotes.forEach(item => {
    const previous = previousByAsset.get(item.asset);
    if (typeof previous === 'number' && item.price !== previous) {
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

function advancePulseWindow() {
  if (document.hidden || !baseItems.value.length) return;
  windowStart.value = (windowStart.value + 1) % baseItems.value.length;
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
  if (document.hidden) {
    stopMarketService();
    flashingAssets.value = {};
  } else {
    startMarketService();
  }
}

function closeMarketPulse() {
  trackMarketPulseEvent('market_pulse_close', 'close');
  stopMarketService();
  emit('close');
}

function trackMarketPulseEvent(event, action) {
  trackInteractionEvent({
    event,
    surface: 'market_pulse',
    routeName: route.name,
    action,
    label: 'market_pulse'
  });
}
onMounted(() => {
  resizeObserver = new ResizeObserver(updateRenderedSlotCount);
  if (pulseViewport.value) {
    resizeObserver.observe(pulseViewport.value);
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  startMarketService();
  nextTick(() => {
    updateRenderedSlotCount();
  });
});

onUnmounted(() => {
  stopMarketService();
  resizeObserver?.disconnect();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.clearTimeout(flashTimer);
});

watch(() => baseItems.value.length, () => {
  if (windowStart.value >= baseItems.value.length) {
    windowStart.value = 0;
  }
  nextTick(() => {
    updateRenderedSlotCount();
  });
});
</script>
