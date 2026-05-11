<template>
  <div v-if="logo" class="vendor-logo-wrap" :class="{ 'vendor-logo-wrap--dark': darkLogo }">
    <img :src="logo" :alt="altText" :class="['vendor-logo', logoClass]" />
  </div>
  <slot v-else />
</template>

<script setup>
import { computed } from 'vue';
import getVendorLogo, { getVendorLogoKey, isVendorLogoDark } from '@/services/vendorLogos';

const props = defineProps({
  vendor: {
    type: String,
    default: ''
  }
});

const logo = computed(() => getVendorLogo(props.vendor));
const logoKey = computed(() => getVendorLogoKey(props.vendor));
const logoClass = computed(() => logoKey.value ? `vendor-logo--${logoKey.value}` : '');
const darkLogo = computed(() => isVendorLogoDark(props.vendor));
const altText = computed(() => props.vendor || 'Vendor');
</script>
