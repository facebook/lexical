/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {SerializedDocument} from '@lexical/file';

// The `#doc=` hash codec, matching the playground's convention: the
// SerializedDocument JSON, gzipped and url-safe base64 encoded.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function* generateReader<T = any>(
  reader: ReadableStreamDefaultReader<T>,
) {
  let done = false;
  while (!done) {
    const res = await reader.read();
    const {value} = res;
    if (value !== undefined) {
      yield value;
    }
    done = res.done;
  }
}

async function readBytestoString(
  reader: ReadableStreamDefaultReader,
): Promise<string> {
  const output = [];
  const chunkSize = 0x8000;
  for await (const value of generateReader(reader)) {
    for (let i = 0; i < value.length; i += chunkSize) {
      output.push(String.fromCharCode(...value.subarray(i, i + chunkSize)));
    }
  }
  return output.join('');
}

let warnedCompressionAPI = false;
function warnCompressionAPIOnce(): void {
  if (!warnedCompressionAPI) {
    warnedCompressionAPI = true;
    console.warn(
      'Your browser does not support CompressionStream/DecompressionStream',
    );
  }
}

// Feature detection is extracted to functions as a workaround until
// https://github.com/amilajack/eslint-plugin-compat/pull/687 lands
function getCompressionStream() {
  if (typeof CompressionStream !== 'undefined') {
    return new CompressionStream('gzip');
  }
}

function getDecompressionStream() {
  if (typeof DecompressionStream !== 'undefined') {
    return new DecompressionStream('gzip');
  }
}

export async function docToHash(doc: SerializedDocument): Promise<string> {
  const cs = getCompressionStream();
  if (!cs) {
    warnCompressionAPIOnce();
    return '';
  }
  const writer = cs.writable.getWriter();
  const [, output] = await Promise.all([
    writer
      .write(new TextEncoder().encode(JSON.stringify(doc)))
      .then(() => writer.close()),
    readBytestoString(cs.readable.getReader()),
  ]);
  return `#doc=${btoa(output)
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/, '')}`;
}

export async function docFromHash(
  hash: string,
): Promise<SerializedDocument | null> {
  const m = /^#doc=(.*)$/.exec(hash);
  if (!m) {
    return null;
  }
  const ds = getDecompressionStream();
  if (!ds) {
    warnCompressionAPIOnce();
    return null;
  }
  const writer = ds.writable.getWriter();
  const b64 = atob(m[1].replace(/_/g, '/').replace(/-/g, '+'));
  const array = new Uint8Array(b64.length);
  for (let i = 0; i < b64.length; i++) {
    array[i] = b64.charCodeAt(i);
  }
  const closed = writer.write(array).then(() => writer.close());
  const output = [];
  for await (const chunk of generateReader(
    ds.readable.pipeThrough(new TextDecoderStream()).getReader(),
  )) {
    output.push(chunk);
  }
  await closed;
  return JSON.parse(output.join(''));
}
