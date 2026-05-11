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
        FDNEXT_VERSION: 'readonly',
        __FDNEXT_COMMIT_HASH__: 'readonly',
        __FDNEXT_BUILD_TIME__: 'readonly',
        __FLASHMASTER_SINGLEFILE__: 'readonly'
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
