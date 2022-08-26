/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { createHeadlessEditor } from '@lexical/headless';
import * as http from 'http';
import * as url from 'url';

const hostname = 'localhost';
const port = 1235;

let editorStateJSON = null;

const editor = createHeadlessEditor({
  namespace: 'validation',
  nodes: [],
  onError: (error: Error) => {
    console.error(error);
  },
});

const getJSON = (req: http.IncomingMessage) => {
  const body: Array<Uint8Array> = [];
  return new Promise((resolve) => {
    req
      .on('data', (chunk: Uint8Array) => {
        body.push(chunk);
      })
      .on('end', () => {
        const data = Buffer.concat(body).toString();
        const json = JSON.parse(data);
        resolve(json);
      })
      .on('error', (error: Error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  });
};

const validateEditorState = (json: unknown): boolean => {
  return true;
}

const server = http.createServer(async (req, res) => {
  // @ts-ignore
  const pathname = url.parse(req.url).pathname;
  const {method} = req;
  res.setHeader('Content-Type', 'application/json');

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.end();
    return;
  }

  if (method === 'POST' && pathname === '/setEditorState') {
    const json = await getJSON(req);
    editorStateJSON = json;
    res.statusCode = 200;
    res.end();
  } else if (method === 'POST' && pathname === '/updateEditorState') {
    const json = await getJSON(req);
    if (validateEditorState(json)) {
      res.statusCode = 200;
    } else {
      res.statusCode = 403;
    }
    res.end();
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(port, hostname, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Read-only validation server running at http://${hostname}:${port}/`,
  );
});
