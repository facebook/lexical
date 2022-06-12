'use strict';
const {resolve} = require('path');

const NODE_ENV = process.env.NODE_ENV;

if (!NODE_ENV) {
  console.error('NODE_ENV not set');
  process.exit(1);
}

const HOST = '127.0.0.1'
const PORT = 8888
const PACKAGE_DIR = resolve(__dirname, '../../')
const __DEV__ = NODE_ENV !== 'production'
const AUTO_RELOAD_EXTENSION_PATH = '/__auto_reload_extension__'
const HMR_PATH = '/__webpack_hmr__'
const HMR_URL = encodeURIComponent(`http://${HOST}:${PORT}${HMR_PATH}`)

module.exports = {
  AUTO_RELOAD_EXTENSION_PATH,
  HMR_PATH,
  HMR_URL,
  HOST,
  PACKAGE_DIR,
  PORT,
  __DEV__
}
