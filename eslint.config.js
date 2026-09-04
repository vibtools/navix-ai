export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  {
    files: ['src/**/*.{js,jsx}', 'scripts/**/*.mjs', 'server.ts', 'vite.config.js', 'vite.content.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Blob: 'readonly',
        chrome: 'readonly',
        console: 'readonly',
        CustomEvent: 'readonly',
        document: 'readonly',
        DOMException: 'readonly',
        Event: 'readonly',
        fetch: 'readonly',
        FileReader: 'readonly',
        indexedDB: 'readonly',
        KeyboardEvent: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        Node: 'readonly',
        process: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        TextDecoder: 'readonly',
        URL: 'readonly',
        window: 'readonly',
        __dirname: 'readonly'
      }
    },
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-loss-of-precision': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-promise-executor-return': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-with': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    }
  }
];
