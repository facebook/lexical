/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line strict
const {Server} = require('@hocuspocus/server');
const {Logger} = require('@hocuspocus/extension-logger');
const {SQLite} = require('@hocuspocus/extension-sqlite');

const server = Server.configure({
  address: '127.0.0.1',
  debounce: 0,
  extensions: [new Logger(), new SQLite()],
  name: 'hocuspocus-fra1-01',
  port: 7398,
});

server.listen();
