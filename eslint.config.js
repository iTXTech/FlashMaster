import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'vendor/**']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        VERSION: 'readonly',
        __FDNEXT_VERSION__: 'readonly',
        __FDNEXT_COMMIT_HASH__: 'readonly',
        __FDNEXT_BUILD_TIME__: 'readonly',
        __FLASHMASTER_SINGLEFILE__: 'readonly',
        __FLASHMASTER_MARKET_PULSE__: 'readonly',
        __FLASHMASTER_ANALYTICS__: 'readonly',
        __FLASHMASTER_COMMERCIAL_BANNER__: 'readonly',
        __FLASHMASTER_ER_EXTERNAL_LINK__: 'readonly',
        __FLASHMASTER_EMBEDDED_PARSER__: 'readonly',
        __FLASHMASTER_LOCKED_SERVER__: 'readonly',
        __FLASHMASTER_BUILD_FLAVOR__: 'readonly'
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['*.config.js', 'vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
];
