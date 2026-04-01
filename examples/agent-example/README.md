# AI Agent Example

A React-based rich text editor example with AI agent functionality powered by [transformers.js](https://huggingface.co/docs/transformers.js). The AI runs entirely in the browser using WebAssembly — no server required.

## Features

- **Rich text editing** with formatting toolbar (bold, italic, underline, strikethrough, alignment)
- **AI Proofread** — select text (or use the entire document) and click "Proofread" to fix grammar and spelling
- **AI Generate** — click "Generate" to have the AI write a new paragraph based on the existing content

## How it works

The example uses [SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) (q4 quantized, ~70MB download) running via `@huggingface/transformers` in a Web Worker. The WASM backend is used for broad compatibility, including Safari on iOS.

The model is loaded lazily on the first AI action. Subsequent requests reuse the cached model.

> **Note:** SmolLM2-135M is a small language model. Results are best-effort and meant as a demonstration of browser-based AI integration with Lexical.

## Run it locally

```bash
npm i && npm run dev
```

**Run from monorepo root:**

```bash
npm run start:example agent-example
```
