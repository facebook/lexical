'use strict';
const express = require('express')
const webpack = require('webpack')
const chalk = require('chalk')
const cors = require('cors')
const webpackDevMiddleware = require('webpack-dev-middleware')
// const webpackHotMiddleware = require('webpack-hot-middleware')

const { getPort } = require('../utils/helpers')
const { extensionAutoReload } = require('../utils/reload')
const {
  HOST,
  PORT: DEFAULT_PORT,
  // HMR_PATH,
  AUTO_RELOAD_EXTENSION_PATH
} = require('../utils/constants')

const devConfig = require('../configs/webpack.dev')

async function start() {
  const compiler = webpack(devConfig)
  const devServer = express()
  const PORT = await getPort(HOST, DEFAULT_PORT)

  setupMiddlewares(devServer, compiler)
  runHttpServer(devServer, HOST, PORT)
}

function setupMiddlewares(devServer, compiler) {
  const publicPath = devConfig.output.publicPath
  const devMiddlewareOptions = {
    publicPath,
    stats: 'minimal',
    writeToDisk: true
  }

  devServer.use(cors())
  devServer.use([
    webpackDevMiddleware(compiler, devMiddlewareOptions),
    // webpackHotMiddleware(compiler, { path: HMR_PATH })
  ])
  devServer.use(AUTO_RELOAD_EXTENSION_PATH, extensionAutoReload(compiler))
}

function runHttpServer(devServer, host, port) {
  const httpServer = devServer.listen(port, HOST, () => {
    const coloredAddress = chalk.magenta.underline(`http://${host}:${port}`)
    // eslint-disable-next-line no-console
    console.log(`${chalk.bgGreen.black(' INFO ')} DevServer is running at ${coloredAddress}`)
  })

  const signals = ['SIGINT', 'SIGTERM']

  signals.forEach((signal) => {
    process.on(signal, () => {
      httpServer.close()
      process.exit()
    })
  })
}

start()
