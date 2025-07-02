import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'lexical',
            fileName: 'lexical',
            formats: ['es', 'cjs'],
        },
        outDir: './dist',
        minify: false,
        rollupOptions: {
            external: ['@lexical/selection', '@lexical/utils', 'lexical'],
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
