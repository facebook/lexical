/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import * as path from 'node:path';
import {Readable} from 'node:stream';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const devtoolsDir = path.resolve('packages/lexical-devtools');
const devtoolsRequire = createRequire(path.join(devtoolsDir, 'package.json'));
const wxtRequire = createRequire(devtoolsRequire.resolve('wxt'));
// Exercise the exact publishing library used by `wxt submit` in the lockfile.
const {ChromeWebStoreV2, resolveConfig, validateConfig} = await import(
  wxtRequire.resolve('publish-browser-extension')
);
const workflow = readFileSync(
  '.github/workflows/devtools-extension-publish.yml',
  'utf8',
);
const publishArgs: string[] = JSON.parse(
  readFileSync(path.join(devtoolsDir, 'package.json'), 'utf8'),
).scripts.publish.split(/\s+/);
const fixtureValues: Record<string, string> = {
  EXTENSION_CHROME_EXTENSION_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  EXTENSION_CHROME_PUBLISHER_ID: 'test-publisher',
  EXTENSION_CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL: 'fixture@example.invalid',
  EXTENSION_CHROME_SERVICE_ACCOUNT_PRIVATE_KEY: 'fixture-key-never-used',
  EXTENSION_FIREFOX_EXTENSION_ID: 'fixture-firefox',
  EXTENSION_FIREFOX_JWT_ISSUER: 'fixture-issuer',
  EXTENSION_FIREFOX_JWT_SECRET: 'fixture-secret',
};

function flag(name: string) {
  const index = publishArgs.indexOf(name);
  return index === -1 ? undefined : publishArgs[index + 1];
}

function publishingConfig(zip: string) {
  return validateConfig(
    resolveConfig({
      chrome: {
        apiVersion: flag('--chrome-api-version'),
        publishType: flag('--chrome-publish-type'),
        zip,
      },
      firefox: {
        sourcesZip: flag('--firefox-sources-zip'),
        zip: flag('--firefox-zip'),
      },
    }),
  );
}

describe('DevTools publishing configuration', () => {
  beforeEach(() => {
    // Ignore ambient credentials. All HTTP calls below are intercepted.
    for (const name of Object.keys(process.env)) {
      if (/^(CHROME_|FIREFOX_|EDGE_|OPERA_|DRY_RUN$)/.test(name)) {
        vi.stubEnv(name, undefined);
      }
    }
    for (const [, name, source] of workflow.matchAll(
      /^\s+(CHROME_\w+|FIREFOX_\w+): \$\{\{ (?:secrets|vars)\.(\w+) \}\}$/gm,
    )) {
      vi.stubEnv(name, fixtureValues[source]);
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Unexpected HTTP call');
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('selects v2 and default publishing with the workflow settings', () => {
    vi.stubEnv('CHROME_API_VERSION', 'v1.1');
    const config = publishingConfig('fixture.zip');
    expect(config.chrome).toMatchObject({
      apiVersion: 'v2',
      cancelPending: false,
      extensionId: fixtureValues.EXTENSION_CHROME_EXTENSION_ID,
      publishType: 'DEFAULT_PUBLISH',
      publisherId: fixtureValues.EXTENSION_CHROME_PUBLISHER_ID,
      serviceAccountClientEmail:
        fixtureValues.EXTENSION_CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL,
      serviceAccountPrivateKey:
        fixtureValues.EXTENSION_CHROME_SERVICE_ACCOUNT_PRIVATE_KEY,
    });
    expect(config.chrome.skipReview).toBeUndefined();
    expect(config.chrome.skipSubmitReview).toBe(false);
    expect(config.firefox).toMatchObject({
      channel: 'listed',
      extensionId: fixtureValues.EXTENSION_FIREFOX_EXTENSION_ID,
      jwtIssuer: fixtureValues.EXTENSION_FIREFOX_JWT_ISSUER,
      jwtSecret: fixtureValues.EXTENSION_FIREFOX_JWT_SECRET,
      sourcesZip: '.output/*-sources.zip',
      zip: '.output/*-firefox.zip',
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    'CHROME_EXTENSION_ID',
    'CHROME_PUBLISHER_ID',
    'CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL',
    'CHROME_SERVICE_ACCOUNT_PRIVATE_KEY',
  ])('rejects missing %s before any HTTP call', name => {
    vi.stubEnv(name, '');
    expect(() => publishingConfig('fixture.zip')).toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(['SUCCEEDED', 'FAILED', 'UPLOAD_IN_PROGRESS'])(
    'publishes only after a successful v2 upload (%s)',
    async uploadState => {
      const dir = mkdtempSync(path.join(tmpdir(), 'lexical-cws-'));
      const zip = path.join(dir, 'fixture.zip');
      writeFileSync(zip, 'offline upload fixture');
      const base =
        'https://chromewebstore.googleapis.com/v2/publishers/test-publisher/items/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const uploadUrl = base.replace('/v2/', '/upload/v2/') + ':upload';
      const requests: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: URL, init: RequestInit) => {
          const endpoint = String(url);
          requests.push(endpoint);
          if (endpoint === base + ':fetchStatus') {
            expect(init.method).toBe('GET');
            return Response.json({
              submittedItemRevisionStatus: {state: 'PENDING_REVIEW'},
            });
          }
          if (endpoint === uploadUrl) {
            expect(init.method).toBe('POST');
            expect(init.body).toBeInstanceOf(Readable);
            // Consume the upload so the fixture stream closes before cleanup.
            for await (const _chunk of init.body as unknown as Readable) {
              // No real upload is performed.
            }
            return Response.json({uploadState});
          }
          if (endpoint === base + ':publish') {
            expect(init.method).toBe('POST');
            expect(JSON.parse(String(init.body))).toEqual({
              publishType: 'DEFAULT_PUBLISH',
            });
            return Response.json({});
          }
          throw new Error('Unexpected HTTP call: ' + endpoint);
        }),
      );
      try {
        const store = new ChromeWebStoreV2(publishingConfig(zip).chrome);
        // Supply a synthetic token locally; never sign/exchange credentials.
        vi.spyOn(store, 'getAccessToken').mockResolvedValue('offline-fixture');
        if (uploadState === 'SUCCEEDED') {
          await store.submit();
          expect(requests).toEqual([
            base + ':fetchStatus',
            uploadUrl,
            base + ':publish',
          ]);
        } else {
          await expect(store.submit()).rejects.toThrow(uploadState);
          expect(requests).toEqual([base + ':fetchStatus', uploadUrl]);
        }
      } finally {
        rmSync(dir, {force: true, recursive: true});
      }
    },
  );
});
