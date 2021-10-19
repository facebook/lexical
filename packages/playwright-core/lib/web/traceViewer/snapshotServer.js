"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SnapshotServer = void 0;

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const kBlobUrlPrefix = 'http://playwright.bloburl/#';

class SnapshotServer {
  constructor(snapshotStorage) {
    this._snapshotStorage = void 0;
    this._snapshotIds = new Map();
    this._snapshotStorage = snapshotStorage;
  }

  serveSnapshot(pathname, searchParams, snapshotUrl) {
    const snapshot = this._snapshot(pathname.substring('/snapshot'.length), searchParams);

    if (!snapshot) return new Response(null, {
      status: 404
    });
    const renderedSnapshot = snapshot.render();

    this._snapshotIds.set(snapshotUrl, snapshot);

    return new Response(renderedSnapshot.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }

  serveSnapshotSize(pathname, searchParams) {
    const snapshot = this._snapshot(pathname.substring('/snapshotSize'.length), searchParams);

    return this._respondWithJson(snapshot ? snapshot.viewport() : {});
  }

  _snapshot(pathname, params) {
    const name = params.get('name');
    return this._snapshotStorage.snapshotByName(pathname.slice(1), name);
  }

  _respondWithJson(object) {
    return new Response(JSON.stringify(object), {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=31536000',
        'Content-Type': 'application/json'
      }
    });
  }

  async serveResource(requestUrl, snapshotUrl) {
    const snapshot = this._snapshotIds.get(snapshotUrl);

    const url = requestUrl.startsWith(kBlobUrlPrefix) ? requestUrl.substring(kBlobUrlPrefix.length) : removeHash(requestUrl);
    const resource = snapshot === null || snapshot === void 0 ? void 0 : snapshot.resourceByUrl(url);
    if (!resource) return new Response(null, {
      status: 404
    });
    const sha1 = resource.response.content._sha1;
    if (!sha1) return new Response(null, {
      status: 404
    });
    return this._innerServeResource(sha1, resource);
  }

  async _innerServeResource(sha1, resource) {
    const content = await this._snapshotStorage.resourceContent(sha1);
    if (!content) return new Response(null, {
      status: 404
    });
    let contentType = resource.response.content.mimeType;
    const isTextEncoding = /^text\/|^application\/(javascript|json)/.test(contentType);
    if (isTextEncoding && !contentType.includes('charset')) contentType = `${contentType}; charset=utf-8`;
    const headers = new Headers();
    headers.set('Content-Type', contentType);

    for (const {
      name,
      value
    } of resource.response.headers) headers.set(name, value);

    headers.delete('Content-Encoding');
    headers.delete('Access-Control-Allow-Origin');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.delete('Content-Length');
    headers.set('Content-Length', String(content.size));
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(content, {
      headers
    });
  }

}

exports.SnapshotServer = SnapshotServer;

function removeHash(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch (e) {
    return url;
  }
}