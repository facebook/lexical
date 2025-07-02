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
        rollupOptions: {
            external: ['nanoid', 'use-woby', 'react', 'oby', 'woby', 'woby/jsx-runtime', 'react-dom', '@lexical/devtools-core', '@lexical/dragon', '@lexical/hashtag', '@lexical/history', '@lexical/link', '@lexical/list', '@lexical/mark', '@lexical/markdown', '@lexical/overflow', '@lexical/plain-text', '@lexical/rich-text', '@lexical/table', '@lexical/text', '@lexical/utils', '@lexical/yjs', 'lexical'],
            output: {
                globals: {
                    'react': 'react',
                    'woby': 'woby',
                    'woby/jsx-runtime': 'woby/jsx-runtime',
                }
            }
        },
        outDir: './dist',
        minify: false,
    },
    define: {
        __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
    },
    plugins: [
    ],
    resolve: {
        alias: {
            'shared': path.resolve(__dirname, '../shared/src'),
            // Add aliases for all workspace packages with correct directory names
            '@lexical/devtools-core': path.resolve(__dirname, '../lexical-devtools-core/src/index.ts'),
            '@lexical/dragon': path.resolve(__dirname, '../lexical-dragon/src/index.ts'),
            '@lexical/hashtag': path.resolve(__dirname, '../lexical-hashtag/src/index.ts'),
            '@lexical/history': path.resolve(__dirname, '../lexical-history/src/index.ts'),
            '@lexical/link': path.resolve(__dirname, '../lexical-link/src/index.ts'),
            '@lexical/list': path.resolve(__dirname, '../lexical-list/src/index.ts'),
            '@lexical/mark': path.resolve(__dirname, '../lexical-mark/src/index.ts'),
            '@lexical/markdown': path.resolve(__dirname, '../lexical-markdown/src/index.ts'),
            '@lexical/overflow': path.resolve(__dirname, '../lexical-overflow/src/index.ts'),
            '@lexical/plain-text': path.resolve(__dirname, '../lexical-plain-text/src/index.ts'),
            '@lexical/rich-text': path.resolve(__dirname, '../lexical-rich-text/src/index.ts'),
            '@lexical/table': path.resolve(__dirname, '../lexical-table/src/index.ts'),
            '@lexical/text': path.resolve(__dirname, '../lexical-text/src/index.ts'),
            '@lexical/utils': path.resolve(__dirname, '../lexical-utils/src/index.ts'),
            '@lexical/yjs': path.resolve(__dirname, '../lexical-yjs/src/index.ts'),
            'lexical': path.resolve(__dirname, '../lexical/src/index.ts'),
        },
    },
})
