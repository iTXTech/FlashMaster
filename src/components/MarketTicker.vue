<template>
  <div class="market-ticker" :aria-label="$t('market.ariaLabel')" :title="tickerTitle">
    <div v-if="displayItems.length" class="market-ticker-track">
      <div v-for="loop in 2" :key="loop" class="market-ticker-group">
        <span v-for="item in tickerItems" :key="`${loop}-${item.tickerKey}`" :class="['market-item', flashClass(item.asset)]">
          <span class="market-symbol">{{ item.name }}</span>
          <span class="market-price">{{ formatPrice(item.price) }}</span>
          <span :class="['market-change', trendClass(item.changePercent)]">{{ formatChange(item.changePercent) }}</span>
        </span>
      </div>
    </div>
    <div v-else-if="loading" class="market-ticker-placeholder">{{ $t('market.loading') }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { loadCachedMarketQuotes, subscribeMarketQuotes } from '@/services/marketApi';

const { locale, t } = useI18n();

const quotes = ref(loadCachedMarketQuotes());
const loading = ref(false);
const error = ref('');
const flashingAssets = ref({});
let unsubscribeMarket;
const TICKER_CONTENT_REPEATS = 6;

const displayItems = computed(() => quotes.value.map(item => ({
  ...item,
  name: item.labels?.[locale.value] || item.labels?.eng || item.symbol
})));

const tickerItems = computed(() => Array.from({ length: TICKER_CONTENT_REPEATS }, (_, copyIndex) =>
  displayItems.value.map(item => ({
    ...item,
    tickerKey: `${copyIndex}-${item.asset}`
  }))
).flat());

const tickerTitle = computed(() => error.value ? `${t('market.title')} · ${error.value}` : t('market.title'));

function formatPrice(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 3
  }).format(value);
}

function formatChange(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function trendClass(value) {
  return value >= 0 ? 'is-up' : 'is-down';
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
  if (Object.keys(nextFlashes).length) {
    window.setTimeout(() => {
      flashingAssets.value = {};
    }, 900);
  }
}

function handleMarketUpdate(nextQuotes) {
  markPriceChanges(nextQuotes);
  quotes.value = nextQuotes;
  loading.value = false;
  error.value = '';
}

onMounted(() => {
  loading.value = quotes.value.length === 0;
  unsubscribeMarket = subscribeMarketQuotes({
    onUpdate: handleMarketUpdate,
    onError: err => {
      error.value = err.message || String(err);
      loading.value = false;
    }
  });
});

onUnmounted(() => {
  unsubscribeMarket?.();
});
</script>
