import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const fdnextPackageJson = (() => {
  try {
    return JSON.parse(readFileSync(new URL('./vendor/fdnext/package.json', import.meta.url), 'utf8'));
  } catch {
    return { version: 'dev' };
  }
})();
const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
})();
const appVersion = `${packageJson.version}-${commitHash}`;
const fdnextCommitHash = (() => {
  try {
    return execSync('git -C vendor/fdnext rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
})();
const shortFdnextCommitHash = value => String(value || '').trim().slice(0, 7) || 'dev';
const fdnextBuildCommitHash = shortFdnextCommitHash(process.env.FDNEXT_COMMIT_HASH || fdnextCommitHash);
const fdnextBuildTime = process.env.FDNEXT_BUILD_TIME || new Date().toISOString();
const appBuildTime = process.env.FLASHMASTER_BUILD_TIME || process.env.VITE_FLASHMASTER_BUILD_TIME || new Date().toISOString();
const sitemapLastmod = appBuildTime.slice(0, 10);
const fdnextVersion = fdnextPackageJson.version;
const pwaDescription = 'Memory Chip Intelligence Platform for memory-chip part-number lookup, NAND Flash ID decoding, database search, and result inspection.';
const googleTagId = 'G-61KFXH5ST6';
const canonicalOrigin = String(process.env.VITE_FLASHMASTER_CANONICAL_ORIGIN || 'https://fm.itxtech.org').replace(/\/+$/, '');
const BUILD_FLAVOR_WEB = 'web';
const BUILD_FLAVOR_SINGLEFILE = 'singlefile';
const BUILD_FLAVOR_SINGLEFILE_NANO = 'singlefile:nano';

function resolveBuildFlavor(mode) {
  const value = String(
    process.env.VITE_FLASHMASTER_BUILD_FLAVOR
    || process.env.FLASHMASTER_BUILD_FLAVOR
    || mode
    || ''
  ).trim().toLowerCase();

  if (['singlefile:nano', 'singlefile-nano', 'nano'].includes(value)) {
    return BUILD_FLAVOR_SINGLEFILE_NANO;
  }
  if (value === BUILD_FLAVOR_SINGLEFILE) {
    return BUILD_FLAVOR_SINGLEFILE;
  }
  return BUILD_FLAVOR_WEB;
}

function isSingleFileFlavor(flavor) {
  return flavor === BUILD_FLAVOR_SINGLEFILE || flavor === BUILD_FLAVOR_SINGLEFILE_NANO;
}

function singleFileOutputFileName(flavor) {
  return `FlashMaster-${appVersion}${flavor === BUILD_FLAVOR_SINGLEFILE_NANO ? '-nano' : ''}.html`;
}

function singleFilePagePath(flavor) {
  return `/singlefile/${singleFileOutputFileName(flavor)}`;
}

function googleTagHtml({ pagePath } = {}) {
  const config = pagePath
    ? `gtag('config', '${googleTagId}', { page_path: ${JSON.stringify(pagePath)}, page_location: ${JSON.stringify(`${canonicalOrigin}${pagePath}`)} });`
    : `gtag('config', '${googleTagId}');`;
  return `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${googleTagId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      ${config}
    </script>`;
}

function singleFileHtmlPlugin({ analyticsEnabled, pagePath }) {
  return {
    name: 'flashmaster-singlefile-html',
    enforce: 'pre',
    transformIndexHtml(html) {
      const googleTagPattern = /\n\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config', 'G-61KFXH5ST6'\);\s*<\/script>/;
      return html
        .replace(/\n\s*<link rel="icon"[^>]*>/g, '')
        .replace(/\n\s*<link rel="apple-touch-icon"[^>]*>/g, '')
        .replace(/\n\s*<link rel="manifest"[^>]*>/g, '')
        .replace(googleTagPattern, analyticsEnabled ? googleTagHtml({ pagePath }) : '');
    }
  };
}

function singleFileCleanupPlugin(flavor) {
  let outDir;
  const outputFileName = singleFileOutputFileName(flavor);
  const preservedHtmlFiles = new Set([
    singleFileOutputFileName(BUILD_FLAVOR_SINGLEFILE),
    singleFileOutputFileName(BUILD_FLAVOR_SINGLEFILE_NANO)
  ]);
  return {
    name: 'flashmaster-singlefile-cleanup',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      if (!outDir || !existsSync(outDir)) return;
      for (const entry of readdirSync(outDir, { withFileTypes: true })) {
        if (entry.name === 'index.html') continue;
        if (preservedHtmlFiles.has(entry.name)) continue;
        rmSync(join(outDir, entry.name), { recursive: true, force: true });
      }
      const indexHtml = join(outDir, 'index.html');
      if (existsSync(indexHtml)) {
        renameSync(indexHtml, join(outDir, outputFileName));
      }
    }
  };
}

function pwaPlugin(routerMode) {
  return VitePWA({
    injectRegister: 'auto',
    registerType: 'autoUpdate',
    manifestFilename: 'site.webmanifest',
    includeManifestIcons: false,
    manifest: {
      name: 'iTXTech FlashMaster',
      short_name: 'FlashMaster',
      description: pwaDescription,
      start_url: routerMode === 'history' ? './parts' : './#/parts',
      scope: './',
      display: 'standalone',
      background_color: '#07111f',
      theme_color: '#0f766e',
      icons: [
        {
          src: 'AppIcon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable'
        },
        {
          src: 'AppIcon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'AppIcon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'AppIcon.png',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any'
        }
      ]
    },
    workbox: {
      cleanupOutdatedCaches: true,
      globIgnores: ['**/og/**'],
      globPatterns: ['**/*.{html,js,css,svg,png,ico}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: 'index.html'
    }
  });
}

function sitemapLastmodPlugin(lastmod) {
  let outDir;
  return {
    name: 'flashmaster-sitemap-lastmod',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const sitemapFile = join(outDir, 'sitemap.xml');
      if (!existsSync(sitemapFile)) return;
      const html = readFileSync(sitemapFile, 'utf8')
        .replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${lastmod}</lastmod>`);
      writeFileSync(sitemapFile, html);
    }
  };
}

export default defineConfig(({ mode }) => {
  const buildFlavor = resolveBuildFlavor(mode);
  const singleFile = isSingleFileFlavor(buildFlavor);
  const analyticsEnabled = buildFlavor !== BUILD_FLAVOR_SINGLEFILE_NANO;
  const marketPulseEnabled = buildFlavor !== BUILD_FLAVOR_SINGLEFILE_NANO;
  const commercialBannerEnabled = buildFlavor !== BUILD_FLAVOR_SINGLEFILE_NANO;
  const routerMode = singleFile || process.env.VITE_FLASHMASTER_ROUTER_MODE !== 'history' ? 'hash' : 'history';
  const appBase = process.env.VITE_FLASHMASTER_BASE || (routerMode === 'history' ? '/' : './');
  const appSrc = fileURLToPath(new URL('./src', import.meta.url));
  const aliases = [
    ...(!analyticsEnabled ? [{
      find: '@/services/analytics',
      replacement: fileURLToPath(new URL('./src/services/analytics-noop.js', import.meta.url))
    }] : []),
    ...(!marketPulseEnabled ? [{
      find: '@/components/MarketPulse.vue',
      replacement: fileURLToPath(new URL('./src/components/NoopFeature.js', import.meta.url))
    }] : []),
    ...(!commercialBannerEnabled ? [{
      find: '@/components/CommercialServiceBanner.vue',
      replacement: fileURLToPath(new URL('./src/components/NoopFeature.js', import.meta.url))
    }] : []),
    {
      find: '@',
      replacement: appSrc
    },
    {
      find: '@itxtech/fdnext-core',
      replacement: fileURLToPath(new URL('./vendor/fdnext/packages/core/src/index.ts', import.meta.url))
    },
    {
      find: '@itxtech/fdnext-decodepack',
      replacement: fileURLToPath(new URL('./vendor/fdnext/packages/decodepack/src/index.ts', import.meta.url))
    }
  ];

  return {
    base: appBase,
    plugins: [
      vue(),
      ...(singleFile ? [
        singleFileHtmlPlugin({
          analyticsEnabled,
          pagePath: singleFilePagePath(buildFlavor)
        }),
        viteSingleFile({ removeViteModuleLoader: true }),
        singleFileCleanupPlugin(buildFlavor)
      ] : [
        pwaPlugin(routerMode)
      ]),
      sitemapLastmodPlugin(sitemapLastmod)
    ],
    build: {
      outDir: singleFile ? 'dist-singlefile' : 'dist',
      emptyOutDir: !singleFile
    },
    resolve: {
      alias: aliases
    },
    define: {
      VERSION: JSON.stringify(appVersion),
      FDNEXT_VERSION: JSON.stringify(fdnextVersion),
      __FDNEXT_COMMIT_HASH__: JSON.stringify(fdnextBuildCommitHash),
      __FDNEXT_BUILD_TIME__: JSON.stringify(fdnextBuildTime),
      __FLASHMASTER_BUILD_TIME__: JSON.stringify(appBuildTime),
      __FLASHMASTER_SINGLEFILE__: JSON.stringify(singleFile),
      __FLASHMASTER_MARKET_PULSE__: JSON.stringify(marketPulseEnabled),
      __FLASHMASTER_ANALYTICS__: JSON.stringify(analyticsEnabled),
      __FLASHMASTER_COMMERCIAL_BANNER__: JSON.stringify(commercialBannerEnabled),
      __FLASHMASTER_BUILD_FLAVOR__: JSON.stringify(buildFlavor)
    }
  };
});
