'use strict';

const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const { resolve } = require('path')

const { __DEV__, PACKAGE_DIR } = require('../utils/constants')

const devtoolPath = resolve(PACKAGE_DIR, './src/devtool/index.ts')
const popupPath = resolve(PACKAGE_DIR, './src/popup/index.ts')
const contentScriptPath = resolve(PACKAGE_DIR, './src/content-script/index.ts')
const backgroundPath = resolve(PACKAGE_DIR, './src/background/index.ts')

const injectGlobalHook = [contentScriptPath]
const background = [backgroundPath]

if (__DEV__) {
  // injectGlobalHook.unshift(resolve(__dirname, '../utils/contentScriptClient.js'))
  background.unshift(resolve(__dirname, '../utils/backgroundClient.js'))
}

const commonConfig = {
  context: PACKAGE_DIR,
  entry: {
    background,
    devtool: [devtoolPath],
    injectGlobalHook,
    popup: [popupPath]
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: { cacheDirectory: true },
        test: /\.(js|ts|tsx)$/
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              localIdentName: '[local]___[hash:base64:5]',
              modules: true,
              sourceMap: true,
            },
          },
        ],
      }
    ]
  },
  output: {
    filename: 'js/[name].js',
    hotUpdateChunkFilename: 'hot/[id].[fullhash].hot-update.js',
    hotUpdateMainFilename: 'hot/[runtime].[fullhash].hot-update.json',
    path: resolve(PACKAGE_DIR, 'build'),
    publicPath: '/'
  },
  plugins: [
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    new HtmlWebpackPlugin({
      chunks: ['devtool'],
      filename: 'devtool.html',
      template: resolve(PACKAGE_DIR, 'public/devtool.html'),
      title: 'devtool page'
    }),
    new HtmlWebpackPlugin({
      chunks: ['popup'],
      filename: 'popup.html',
      template: resolve(PACKAGE_DIR, 'public/popup.html'),
      title: 'popup page'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: resolve(PACKAGE_DIR, 'public'),
          globOptions: {
            ignore: ['**/public/devtool.html', '**/public/popup.html']
          }
        },
        {
          from: resolve(PACKAGE_DIR, `src/manifest.${__DEV__ ? 'dev' : 'prod'}.json`),
          to: 'manifest.json'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(PACKAGE_DIR, 'src'),
    },
    extensions: ['.js', '.ts', '.tsx', '.json']
  },
  watchOptions: {
    ignored: ['node_modules/**', 'build/**']
  }
}

module.exports = commonConfig
