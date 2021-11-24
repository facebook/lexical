/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Settings as AppSettings} from '../../src/appSettings';
import {chromium, firefox, webkit} from 'playwright';
import {URLSearchParams} from 'url';

export const E2E_DEBUG = process.env.E2E_DEBUG;
export const E2E_PORT = process.env.E2E_PORT || 3000;
export const E2E_BROWSER = process.env.E2E_BROWSER;
export const IS_MAC = process.platform === 'darwin';
export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = !IS_MAC && !IS_WINDOWS;

jest.setTimeout(60000);

const retryCount = 20;

type Config = $ReadOnly<{
  appSettings?: AppSettings,
}>;

async function attemptToLaunchBrowser(attempt = 0) {
  try {
    return await {chromium, webkit, firefox}[E2E_BROWSER].launch({
      headless: !E2E_DEBUG,
    });
  } catch (e) {
    if (attempt > retryCount) {
      throw e;
    }
    return await new Promise((resolve) => {
      setTimeout(async () => {
        resolve(await attemptToLaunchBrowser(attempt + 1));
      }, 1000);
    });
  }
}

export function initializeE2E(runTests, config: Config = {}) {
  const {appSettings = {}} = config;
  if (appSettings.isRichText === undefined) {
    appSettings.isRichText = process.env.E2E_EDITOR_MODE !== 'plain-text';
  }
  if (appSettings.disableBeforeInput === undefined) {
    appSettings.disableBeforeInput =
      process.env.E2E_EVENTS_MODE === 'legacy-events';
  }
  const urlParams = appSettingsToURLParams(appSettings);
  const e2e = {
    isRichText: appSettings.isRichText,
    browser: null,
    page: null,
    async saveScreenshot() {
      const currentTest = expect.getState().currentTestName;
      const path =
        'e2e-screenshots/' + currentTest.replace(/\s/g, '_') + '.png';
      await e2e.page.screenshot({path});
    },
    async logScreenshot() {
      const currentTest = expect.getState().currentTestName;
      const buffer = await e2e.page.screenshot();
      console.log(
        `Screenshot "${currentTest}": \n\n` +
          buffer.toString('base64') +
          '\n\n',
      );
    },
  };

  beforeAll(async () => {
    e2e.browser = await attemptToLaunchBrowser();
  });
  beforeEach(async () => {
    const url = `http://localhost:${E2E_PORT}/?${urlParams.toString()}`;
    const page = await e2e.browser.newPage();
    await page.goto(url);
    e2e.page = page;
  });
  afterEach(async () => {
    if (!E2E_DEBUG) {
      await e2e.page.close();
    }
  });
  afterAll(async () => {
    if (!E2E_DEBUG) {
      await e2e.browser.close();
    }
  });

  if (!E2E_DEBUG) {
    const it = global.it;
    // if we mark the test as flaky, overwrite the original 'it' function
    // to attempt the test 10 times before actually failing
    global.it = async (description, test) => {
      const result = it(description, async () => {
        let count = 0;
        async function attempt() {
          try {
            // test attempt
            return await test();
          } catch (err) {
            // test failed
            if (count < retryCount) {
              count++;
              // Close and re-open page
              await e2e.page.close();
              const url = `http://localhost:${E2E_PORT}/?${urlParams.toString()}`;
              const page = await e2e.browser.newPage();
              await page.goto(url);
              e2e.page = page;
              // retry
              return await attempt();
            } else {
              // fail for real + log screenshot
              console.log(`Flaky Test: ${description}:`);
              await e2e.saveScreenshot();
              throw err;
            }
          }
        }
        return await attempt();
      });
      return result;
    };
  }

  runTests(e2e);
}

function appSettingsToURLParams(settings: AppSettings): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(settings).forEach(([setting, value]) => {
    params.append(setting, value);
  });
  return params;
}

export async function repeat(times, cb) {
  for (let i = 0; i < times; i++) {
    await cb();
  }
}

export async function assertHTML(page, expectedHtml) {
  // Assert HTML of the editor matches the given html
  const actualHtml = await page.innerHTML('div.editor');
  if (expectedHtml === '') {
    console.log('Output HTML:\n\n' + actualHtml);
    throw new Error('Empty HTML assertion!');
  }
  // HTML might differ between browsers, so we use attach
  // outputs to an element using JSDOM to normalize and prettify
  // the output.
  const actual = document.createElement('div');
  actual.innerHTML = actualHtml;
  const expected = document.createElement('div');
  expected.innerHTML = expectedHtml;
  expect(actual).toEqual(expected);
}

export async function assertSelection(page, expected) {
  // Assert the selection of the editor matches the snapshot
  const selection = await page.evaluate(() => {
    const rootElement = document.querySelector('div.editor');

    const getPathFromNode = (node) => {
      const path = [];
      if (node === rootElement) {
        return [];
      }
      while (node !== null) {
        const parent = node.parentNode;
        if (parent === null || node === rootElement) {
          break;
        }
        path.push(Array.from(parent.childNodes).indexOf(node));
        node = parent;
      }
      return path.reverse();
    };

    const {anchorNode, anchorOffset, focusNode, focusOffset} =
      window.getSelection();

    return {
      anchorPath: getPathFromNode(anchorNode),
      anchorOffset,
      focusPath: getPathFromNode(focusNode),
      focusOffset,
    };
  }, expected);
  expect(selection.anchorPath).toEqual(expected.anchorPath);
  expect(selection.focusPath).toEqual(expected.focusPath);
  if (Array.isArray(expected.anchorOffset)) {
    const [start, end] = expected.anchorOffset;
    expect(selection.anchorOffset).toBeGreaterThanOrEqual(start);
    expect(selection.anchorOffset).toBeLessThanOrEqual(end);
  } else {
    expect(selection.anchorOffset).toEqual(expected.anchorOffset);
  }
  if (Array.isArray(expected.focusOffset)) {
    const [start, end] = expected.focusOffset;
    expect(selection.focusOffset).toBeGreaterThanOrEqual(start);
    expect(selection.focusOffset).toBeLessThanOrEqual(end);
  } else {
    expect(selection.focusOffset).toEqual(expected.focusOffset);
  }
}

export async function isMac(page) {
  return page.evaluate(
    () =>
      typeof window !== 'undefined' &&
      /Mac|iPod|iPhone|iPad/.test(window.navigator.platform),
  );
}

export async function supportsBeforeInput(page) {
  return page.evaluate(() => {
    if ('InputEvent' in window) {
      return 'getTargetRanges' in new window.InputEvent('input');
    }
    return false;
  });
}

export async function keyDownCtrlOrMeta(page) {
  if (await isMac(page)) {
    await page.keyboard.down('Meta');
  } else {
    await page.keyboard.down('Control');
  }
}

export async function keyUpCtrlOrMeta(page) {
  if (await isMac(page)) {
    await page.keyboard.up('Meta');
  } else {
    await page.keyboard.up('Control');
  }
}

export async function keyDownCtrlOrAlt(page) {
  if (await isMac(page)) {
    await page.keyboard.down('Alt');
  } else {
    await page.keyboard.down('Control');
  }
}

export async function keyUpCtrlOrAlt(page) {
  if (await isMac(page)) {
    await page.keyboard.up('Alt');
  } else {
    await page.keyboard.up('Control');
  }
}

export async function copyToClipboard(page) {
  return await page.evaluate(() => {
    const clipboardData = {};
    const editor = document.querySelector('div.editor');
    const copyEvent = new ClipboardEvent('copy');
    Object.defineProperty(copyEvent, 'clipboardData', {
      value: {
        setData(type, value) {
          clipboardData[type] = value;
        },
      },
    });
    editor.dispatchEvent(copyEvent);
    return clipboardData;
  });
}

export async function pasteFromClipboard(page, clipboardData) {
  const canUseBeforeInput = supportsBeforeInput(page);
  await page.evaluate(
    async ({clipboardData, canUseBeforeInput}) => {
      const editor = document.querySelector('div.editor');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData(type, value) {
            return clipboardData[type];
          },
        },
      });
      editor.dispatchEvent(pasteEvent);
      if (!pasteEvent.defaultPrevented) {
        if (canUseBeforeInput) {
          const inputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
          });
          Object.defineProperty(inputEvent, 'inputType', {
            value: 'insertFromPaste',
          });
          Object.defineProperty(inputEvent, 'dataTransfer', {
            value: {
              getData(type, value) {
                return clipboardData[type];
              },
            },
          });
          editor.dispatchEvent(inputEvent);
        }
      }
    },
    {clipboardData, canUseBeforeInput},
  );
}

export async function sleep(delay) {
  await new Promise((resolve) => setTimeout(resolve, delay));
}
