/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import react from '@vitejs/plugin-react';
import * as path from 'path';
import {defineConfig, UserManifest} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  debug: !!process.env.DEBUG_WXT,
  manifest: (configEnv) => {
    const manifestConf: UserManifest = {
      icons: {
        128: '/icon/128.png',
        16: '/icon/16.png',
        32: '/icon/32.png',
        48: '/icon/48.png',
      },
      permissions: ['scripting', 'storage', 'devtools_page'],
      web_accessible_resources: [
        {
          extension_ids: [],
          matches: ['<all_urls>'],
          resources: ['injected.js'],
        },
      ],
    };

    if (configEnv.mode === 'development') {
      // When building the local development version of the
      // extension we want to be able to have a stable extension ID
      // for the local build (in order to be able to reliably detect
      // duplicate installations of DevTools).
      // By specifying a key in the built manifest.json file,
      // we can make it so the generated extension ID is stable.
      // For more details see the docs here: https://developer.chrome.com/docs/extensions/reference/manifest/key
      // Generated via:
      // $ openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem # private key
      // $ openssl rsa -in key.pem -pubout -outform DER | openssl base64 -A # this key below (strip % at the end)
      // $ openssl rsa -in key.pem -pubout -outform DER | shasum -a 256 | head -c32 | tr 0-9a-f a-p # extension ID
      // @ts-expect-error https://github.com/wxt-dev/wxt/issues/521#issuecomment-1978147707
      manifestConf.key =
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAve7nOT9MtnECslFqKw5x0a/OvR/ZzsDBvcR3SIpQg446O7tKwFZTOQWgmceKZJAPT03Ztwdj7qJfAteSwaW4Aeoo6gK5BU7lAAAXeZNhzmuLSJhE4eu8KVDwck16iEx1C/IBKCypM+7H1wjwSVsjGpij2EDiH4Pw/aJ9LLRia7LO3xXTQTYzaJCzx1A+5JiFo5Y9tTtORdyFV/5bfaxibentXNxm52sj3spBe3wC7BuNoYmto9YdKhYk8Xsvs0u8tC7lRae9h57flLCmqPTi9ho4PkJXs4v/okxtGN2Lhwf3Az3ws1LAUqzGJrNK598IRU70a5ONtqXUc3vdGVJxtwIDAQAB';
    }

    return manifestConf;
  },
  runner: {
    chromiumArgs: [
      '--auto-open-devtools-for-tabs',
      // Open chrome://version to validate it works
      // We use this instead of chromiumProfile because of https://github.com/wxt-dev/wxt/issues/366
      `--user-data-dir=${path.join(__dirname, '.browser-profiles/chromium')}`,
      '--hide-crash-restore-bubble',
      '--enable-extension-activity-logging',
    ],
    startUrls: [
      'https://playground.lexical.dev/',
      'about:debugging#/runtime/this-firefox',
      // Doesn't work due to https://github.com/mozilla/web-ext/pull/2774
      // 'chrome://inspect/#service-workers',
    ],
  },
  srcDir: './src',
  vite: () => ({
    plugins: [react()],
  }),
});
