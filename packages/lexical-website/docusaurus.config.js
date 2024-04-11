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

const {github: lightCodeTheme, dracula: darkCodeTheme} =
  require('prism-react-renderer').themes;
const importPlugin = require('remark-import-partial');
const slugifyPlugin = require('./src/plugins/lexical-remark-slugify-anchors');
const {packagesManager} = require('../../scripts/shared/packagesManager');
const path = require('node:path');

const TITLE = 'Lexical';
const GITHUB_REPO_URL = 'https://github.com/facebook/lexical'; // TODO: Update when repo name updated
const IOS_GITHUB_REPO_URL = 'https://github.com/facebook/lexical-ios';

function sourceLinkOptions() {
  const sourceLinkTemplate = `${GITHUB_REPO_URL}/tree/{gitRevision}/{path}#L{line}`;
  return {
    disableGit: true,
    gitRevision: 'main',
    sourceLinkTemplate,
  };
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  baseUrl: '/',

  favicon: 'img/favicon.ico',

  markdown: {format: 'md'},

  onBrokenAnchors: 'throw',
  // These are false positives when linking from API docs
  onBrokenLinks: 'ignore',
  onBrokenMarkdownLinks: 'throw',
  organizationName: 'facebook',
  plugins: [
    './plugins/webpack-buffer',
    [
      'docusaurus-plugin-typedoc',
      {
        ...sourceLinkOptions(),
        entryPoints: packagesManager
          .getPublicPackages()
          .flatMap((pkg) =>
            pkg
              .getExportedNpmModuleEntries()
              .map((entry) => [
                path.relative(
                  __dirname,
                  pkg.resolve('src', entry.sourceFileName),
                ),
              ]),
          ),
        excludeInternal: true,
        plugin: [
          './src/plugins/lexical-typedoc-plugin-no-inherit',
          './src/plugins/lexical-typedoc-plugin-module-name',
        ],
        sidebar: {
          position: 5,
        },
        tsconfig: '../../tsconfig.json',
        watch: process.env.TYPEDOC_WATCH === 'true',
      },
    ],
    async function tailwindcss() {
      return {
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require('tailwindcss'));
          postcssOptions.plugins.push(require('autoprefixer'));
          return postcssOptions;
        },
        name: 'docusaurus-tailwindcss',
      };
    },
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
          beforeDefaultRemarkPlugins: [importPlugin, slugifyPlugin],
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website/`,
          path: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        gtag: {
          trackingID: 'G-7C6YYBYBBT',
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
            href: 'https://facebook.github.io/lexical-ios/',
            label: 'iOS',
            position: 'left',
          },
          {
            href: GITHUB_REPO_URL,
            label: 'GitHub',
            position: 'right',
          },
          {
            href: IOS_GITHUB_REPO_URL,
            label: 'iOS GitHub',
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
