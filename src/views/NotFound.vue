<template>
  <div class="workspace workspace--not-found">
    <div class="workspace-grid single">
      <section class="panel not-found-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ $t('notFound.title') }}</div>
            <div class="panel-meta">{{ currentPath }}</div>
          </div>
        </div>
        <div class="panel-body not-found-body">
          <div class="empty-state">{{ $t('notFound.message') }}</div>
          <div class="action-row not-found-actions">
            <v-btn color="primary" prepend-icon="mdi-memory" @click="openParts">{{ $t('notFound.parts') }}</v-btn>
            <v-btn variant="tonal" prepend-icon="mdi-flash" @click="openIds">{{ $t('notFound.ids') }}</v-btn>
            <v-btn variant="text" prepend-icon="mdi-information-outline" @click="openAbout">{{ $t('notFound.about') }}</v-btn>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { aboutRoute, idsRoute, partsRoute } from '@/router/locations';

const route = useRoute();
const router = useRouter();

const currentPath = computed(() => route.fullPath);

function openParts() {
  router.push(partsRoute(route));
}

function openIds() {
  router.push(idsRoute(route));
}

function openAbout() {
  router.push(aboutRoute(route));
}
</script>

<style scoped>
.not-found-panel {
  width: min(100%, 720px);
  justify-self: center;
}

.not-found-body {
  display: grid;
  gap: 12px;
}

.not-found-actions {
  justify-content: center;
}
</style>
