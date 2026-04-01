# AI Agent Example

A React + Tailwind CSS rich text editor with AI agent functionality powered by [transformers.js](https://huggingface.co/docs/transformers.js). The AI runs entirely in the browser using WebAssembly — no server required.

Based on the [website-toolbar](../website-toolbar) example with added AI capabilities.

## Features

- **Rich text editing** with block types (headings, quotes), formatting (bold, italic, underline), and alignment
- **AI Bullet Points** — select text (or use the entire document) and click "Bullet Points" to convert prose into a structured list
- **AI Generate** — click "Generate" to have the AI write a new paragraph, streamed token-by-token into the editor
- **Abort** — click "Stop" or press Escape to cancel an in-progress AI operation
- **Dark mode** toggle

## How it works

Uses [SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) (q4 quantized, ~70MB download) running via `@huggingface/transformers` in a Web Worker. The WASM backend is used for broad compatibility, including Safari on iOS.

The model is loaded lazily on the first AI action. Generated text streams directly into the editor as tokens arrive.

> **Note:** SmolLM2-135M is a small language model. Results are best-effort and meant as a demonstration of browser-based AI integration with Lexical.

## Run it locally

```bash
npm i && npm run dev
```
