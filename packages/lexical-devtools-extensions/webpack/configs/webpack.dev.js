'use strict';

const { HotModuleReplacementPlugin } = require('webpack')
const { merge } = require('webpack-merge')

const commonConfig = require('./webpack.common')

const devConfig = merge(commonConfig, {
  devtool: 'eval-source-map',
  mode: 'development',
  plugins: [
    new HotModuleReplacementPlugin(),
  ]
})

module.exports = devConfig
