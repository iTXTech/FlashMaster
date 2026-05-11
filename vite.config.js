import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
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
const fdnextVersion = fdnextPackageJson.version;

function singleFileHtmlPlugin() {
  return {
    name: 'flashmaster-singlefile-html',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html
        .replace(/\n\s*<link rel="icon"[^>]*>/g, '')
        .replace(/\n\s*<link rel="apple-touch-icon"[^>]*>/g, '')
        .replace(/\n\s*<link rel="manifest"[^>]*>/g, '')
        .replace(/\n\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config', 'G-61KFXH5ST6'\);\s*<\/script>/, '');
    }
  };
}

function singleFileCleanupPlugin() {
  let outDir;
  const outputFileName = `FlashMaster-${appVersion}.html`;
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
        rmSync(join(outDir, entry.name), { recursive: true, force: true });
      }
      const indexHtml = join(outDir, 'index.html');
      if (existsSync(indexHtml)) {
        renameSync(indexHtml, join(outDir, outputFileName));
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const singleFile = mode === 'singlefile'
    || process.env.VITE_FLASHMASTER_BUILD_FLAVOR === 'singlefile'
    || process.env.FLASHMASTER_BUILD_FLAVOR === 'singlefile';
  const routerMode = singleFile || process.env.VITE_FLASHMASTER_ROUTER_MODE !== 'history' ? 'hash' : 'history';
  const appBase = process.env.VITE_FLASHMASTER_BASE || (routerMode === 'history' ? '/' : './');

  return {
    base: appBase,
    plugins: [
      vue(),
      ...(singleFile ? [
        singleFileHtmlPlugin(),
        viteSingleFile({ removeViteModuleLoader: true }),
        singleFileCleanupPlugin()
      ] : [])
    ],
    build: {
      outDir: singleFile ? 'dist-singlefile' : 'dist'
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@itxtech/fdnext-core': fileURLToPath(new URL('./vendor/fdnext/packages/core/src/index.ts', import.meta.url)),
        '@itxtech/fdnext-decodepack': fileURLToPath(new URL('./vendor/fdnext/packages/decodepack/src/index.ts', import.meta.url))
      }
    },
    define: {
      VERSION: JSON.stringify(appVersion),
      FDNEXT_VERSION: JSON.stringify(fdnextVersion),
      __FDNEXT_COMMIT_HASH__: JSON.stringify(fdnextBuildCommitHash),
      __FDNEXT_BUILD_TIME__: JSON.stringify(fdnextBuildTime),
      __FLASHMASTER_SINGLEFILE__: JSON.stringify(singleFile)
    }
  };
});
