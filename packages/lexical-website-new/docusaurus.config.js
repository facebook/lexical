/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

'use strict';
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const TITLE = 'Lexical';
const GITHUB_REPO_URL = 'https://github.com/facebook/lexical'; // TODO: Update when repo name updated

/** @type {import('@docusaurus/types').Config} */
const config = {
  // TODO: Update when URL updated
  baseUrl: '/',

  favicon: 'img/favicon.ico',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  organizationName: 'facebook',
  // Usually your repo name.
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        blog: {
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website-new/blog/`,
          showReadingTime: true, // TODO: Update when directory finalized
        },
        docs: {
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website-new/docs/`,
          sidebarPath: require.resolve('./sidebars.js'), // TODO: Update when directory finalized
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  // Usually your GitHub org/user name.
  projectName: 'lexical',

  tagline: 'An extensible text editor library that does things differently',

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      footer: {
        copyright: `Copyright © ${new Date().getFullYear()} Meta, Inc. Built with Docusaurus.`,
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
                href: 'https://stackoverflow.com/questions/tagged/lexical',
                label: 'Stack Overflow',
              },
              {
                href: 'https://twitter.com/docusaurus',
                label: 'Twitter', // TODO: Update when created
              },
            ],
            title: 'Community',
          },
          {
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
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
            docId: 'intro',
            label: 'Docs',
            position: 'left',
            type: 'doc',
          },
          {label: 'Blog', position: 'left', to: '/blog'},
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
