import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';

const root = resolve(__dirname, 'src');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        background: resolve(root, 'background', 'index.js'),
        content: resolve(root, 'content', 'index.js'),
        devtools: resolve(root, 'devtools', 'index.html'),
        panel: resolve(root, 'panel', 'index.html'),
        popup: resolve(root, 'popup', 'index.html')
      },
      output: {
        entryFileNames: (chunk) => `src/${chunk.name}/index.js`
      }
    }
  }
});
