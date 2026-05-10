<template>
  <div class="external-link-list" :class="{ 'external-link-list--compact': compact }">
    <a
      v-for="link in links"
      :key="link.key"
      class="external-link-card"
      :class="{ 'external-link-card--image': link.image }"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      :title="link.hint || link.label"
    >
      <span
        class="external-link-media"
        :class="{
          'external-link-media--image': link.image,
          'external-link-media--dark': link.imageDark
        }"
      >
        <img v-if="link.image" :src="link.image" alt="" class="external-link-image" />
        <v-icon v-else :icon="link.icon" size="16" />
      </span>
      <span class="external-link-copy">
        <span class="external-link-label">{{ link.label }}</span>
        <span v-if="link.hint || link.categoryLabel" class="external-link-hint">
          {{ link.hint || link.categoryLabel }}
        </span>
      </span>
      <v-icon class="external-link-open" icon="mdi-open-in-new" size="14" />
    </a>
  </div>
</template>

<script setup>
defineProps({
  links: {
    type: Array,
    default: () => []
  },
  compact: {
    type: Boolean,
    default: false
  }
});
</script>
