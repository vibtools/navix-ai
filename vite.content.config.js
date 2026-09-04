import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const projectRoot = import.meta.dirname;

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: resolve(projectRoot, 'src/content/contentScript.js'),
      name: 'NavixContentScript',
      formats: ['iife'],
      fileName: () => 'src/content.js'
    }
  }
});
