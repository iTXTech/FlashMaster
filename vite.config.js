import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

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
    return execSync('git -C vendor/fdnext rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
})();
const fdnextVersion = `${fdnextPackageJson.version}-${fdnextCommitHash}`;

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@itxtech/fdnext-core': fileURLToPath(new URL('./vendor/fdnext/packages/core/src/index.ts', import.meta.url)),
      '@itxtech/fdnext-dsl': fileURLToPath(new URL('./vendor/fdnext/packages/dsl/src/index.ts', import.meta.url))
    }
  },
  define: {
    VERSION: JSON.stringify(appVersion),
    FDNEXT_VERSION: JSON.stringify(fdnextVersion)
  }
});
