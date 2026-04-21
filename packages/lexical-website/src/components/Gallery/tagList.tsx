/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type Tag = {
  color: string;
  description: string;
  title: string;
};

export const TagList: {[type in string]: Tag} = {
  agent: {
    color: '#7c3aed',
    description: 'Examples using AI agents or LLM-powered features',
    title: 'Agent',
  },
  ai: {
    color: '#8b5cf6',
    description: 'Examples with AI and machine learning integration',
    title: 'AI',
  },
  block: {
    color: '#0891b2',
    description: 'Block-style editors with drag-and-drop or slash commands',
    title: 'Block',
  },
  chat: {
    color: '#2563eb',
    description: 'Chat and messaging interfaces built with Lexical',
    title: 'Chat',
  },
  collab: {
    color: '#d946ef',
    description: 'Real-time collaborative editing examples',
    title: 'Collaboration',
  },
  emoji: {
    color: '#f59e0b',
    description: 'Examples with emoji support and emoji plugins',
    title: 'Emoji',
  },
  extension: {
    color: '#0284c7',
    description: 'Examples using the Lexical Extension architecture',
    title: 'Extension',
  },
  favorite: {
    color: '#e9669e',
    description:
      'Our favorite Lexical examples that you must absolutely check out!',
    title: 'Favorite',
  },
  opensource: {
    color: '#39ca30',
    description: 'Open-source Lexical examples for inspiration',
    title: 'Open-Source',
  },
  react: {
    color: '#61dafb',
    description: 'Examples built with React',
    title: 'React',
  },
  simple: {
    color: '#6b7280',
    description: 'Minimal examples great for getting started',
    title: 'Simple',
  },
  ssr: {
    color: '#14b8a6',
    description: 'Server-side rendering and hydration examples',
    title: 'SSR',
  },
  svelte: {
    color: '#ff3e00',
    description: 'Examples built with Svelte',
    title: 'Svelte',
  },
  tables: {
    color: '#059669',
    description: 'Examples demonstrating table editing',
    title: 'Tables',
  },
  tailwind: {
    color: '#38bdf8',
    description: 'Examples styled with Tailwind CSS',
    title: 'Tailwind',
  },
  toolbar: {
    color: '#78716c',
    description: 'Examples with formatting toolbars',
    title: 'Toolbar',
  },
  vanilla: {
    color: '#eab308',
    description: 'Examples using vanilla JavaScript without a framework',
    title: 'Vanilla JS',
  },
};
