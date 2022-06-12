'use strict';
const _getPort = require('get-port');

async function getPort(host, port) {
  const result = await _getPort({ host, port })

  if (result === port) {
    return result
  }

  return getPort(host, port + 1)
}

module.exports = {
  getPort
}
