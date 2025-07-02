import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'lexical',
            fileName: (format) => format === 'es' ? 'lexical.mjs' : 'lexical.js',
            formats: ['es', 'cjs'],
        },
        outDir: './dist',
        minify: false,
        rollupOptions: {
            external: ['@lexical/html', '@lexical/list', '@lexical/selection', '@lexical/utils', 'lexical'],
        },
    },
    define: {
        __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
    },
    plugins: [
    ],
    resolve: {
        alias: {
            'shared': path.resolve(__dirname, '../shared/src'),
        },
    },
})
