/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');
const importPlugin = require('remark-import-partial');

const TITLE = 'Lexical';
const GITHUB_REPO_URL = 'https://github.com/facebook/lexical'; // TODO: Update when repo name updated

/** @type {import('@docusaurus/types').Config} */
const config = {
  baseUrl: '/',

  favicon: 'img/favicon.ico',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  organizationName: 'facebook',
  plugins: [
    './plugins/webpack-buffer',
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: [
          '../lexical/src/index.ts',
          '../lexical-clipboard/src/index.ts',
          '../lexical-code/src/index.ts',
          '../lexical-dragon/src/index.ts',
          '../lexical-file/src/index.ts',
          '../lexical-hashtag/src/index.ts',
          '../lexical-headless/src/index.ts',
          '../lexical-history/src/index.ts',
          '../lexical-html/src/index.ts',
          '../lexical-link/src/index.ts',
          '../lexical-list/src/index.ts',
          '../lexical-mark/src/index.ts',
          '../lexical-markdown/src/index.ts',
          '../lexical-offset/src/index.ts',
          '../lexical-overflow/src/index.ts',
          '../lexical-selection/src/index.ts',
          '../lexical-table/src/index.ts',
          '../lexical-text/src/index.ts',
          '../lexical-utils/src/index.ts',
          '../lexical-yjs/src/index.ts',
        ],
        excludeInternal: true,
        plugin: ['./src/plugins/lexical-typedoc-plugin-no-inherit'],
        sidebar: {
          position: 5,
        },
        tsconfig: '../../tsconfig.json',
        watch: process.env.TYPEDOC_WATCH === 'true',
      },
    ],
  ],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        blog: {
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website/blog/`,
          showReadingTime: true, // TODO: Update when directory finalized
        },
        docs: {
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website/`,
          path: 'docs',
          remarkPlugins: [importPlugin],
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  // Usually your GitHub org/user name.
  projectName: 'lexical',

  tagline: 'An extensible text editor framework that does things differently',

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig & import('@docusaurus/theme-search-algolia').ThemeConfig} */
    ({
      algolia: {
        apiKey: '00b99bc61a623e1abd819b1d655da918',
        appId: 'YRGKJK6OMH',
        contextualSearch: true,
        indexName: 'lexical',
      },
      docs: {
        sidebar: {
          autoCollapseCategories: true,
          hideable: true,
        },
      },
      footer: {
        copyright: `Copyright © ${new Date().getFullYear()} Meta Platforms, Inc. Built with Docusaurus.`,
        links: [
          {
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
            ],
            title: 'Docs',
          },
          {
            items: [
              {
                href: 'https://stackoverflow.com/questions/tagged/lexicaljs',
                label: 'Stack Overflow',
              },
              {
                href: 'https://twitter.com/lexicaljs',
                label: 'Twitter',
              },
            ],
            title: 'Community',
          },
          {
            items: [
              {
                href: 'https://github.com/facebook/lexical',
                label: 'GitHub',
              },
            ],
            title: 'More',
          },
          {
            // Please do not remove the privacy and terms, it's a legal requirement.
            items: [
              {
                href: 'https://opensource.facebook.com/legal/privacy/',
                label: 'Privacy',
                rel: 'noreferrer noopener',
                target: '_blank',
              },
              {
                href: 'https://opensource.facebook.com/legal/terms/',
                label: 'Terms',
                rel: 'noreferrer noopener',
                target: '_blank',
              },
            ],

            title: 'Legal',
          },
        ],
        style: 'dark',
      },
      navbar: {
        items: [
          {
            label: 'Playground',
            position: 'left',
            to: 'https://playground.lexical.dev/',
          },
          {
            docId: 'intro',
            label: 'Docs',
            position: 'left',
            sidebarId: 'docs',
            type: 'docSidebar',
          },
          {
            label: 'API',
            position: 'left',
            sidebarId: 'api',
            type: 'docSidebar',
          },
          {label: 'Community', position: 'left', to: '/community'},
          {
            href: GITHUB_REPO_URL,
            label: 'GitHub',
            position: 'right',
          },
        ],
        logo: {
          alt: 'Lexical',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
      },
      prism: {
        darkTheme: darkCodeTheme,
        theme: lightCodeTheme,
      },
    }),

  title: TITLE,

  url: 'https://lexical.dev',
};

module.exports = config;
