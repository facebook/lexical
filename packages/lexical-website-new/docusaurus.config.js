'use strict';
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const TITLE = 'Lexical';
const GITHUB_REPO_URL = 'https://github.com/facebook/outline'; // TODO: Update when repo name updated

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: TITLE,
  tagline: 'An extensible text editor library that does things differently',
  url: 'https://outline.dev', // TODO: Update when URL updated
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'lexical', // Usually your repo name.
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website-new/docs/`, // TODO: Update when directory finalized
        },
        blog: {
          showReadingTime: true,
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website-new/blog/`, // TODO: Update when directory finalized
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        logo: {
          alt: 'Lexical',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: GITHUB_REPO_URL,
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/lexical',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/docusaurus', // TODO: Update when created
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/facebook/outline',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Meta, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
