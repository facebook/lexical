import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import path from 'path';

const root = resolve(__dirname, 'src');

const moduleResolution = [
  {
    find: 'shared',
    replacement: path.resolve('../shared/src'),
  }
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: moduleResolution,
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        background: resolve(root, 'background', 'index.ts'),
        content: resolve(root, 'content', 'index.ts'),
        inject: resolve(root, 'inject', 'index.ts'),
        main: resolve(root, 'main', 'index.html'),
        panel: resolve(root, 'panel', 'index.html')
      },
      output: {
        entryFileNames: (chunk) => `src/${chunk.name}/index.js`
      }
    }
  }
});
