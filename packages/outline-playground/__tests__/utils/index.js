/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {chromium, firefox, webkit} from 'playwright';

const E2E_DEBUG = process.env.E2E_DEBUG;
const E2E_PORT = process.env.E2E_PORT || 3000;
const E2E_BROWSER = process.env.E2E_BROWSER;

jest.setTimeout(60000);

const retryCount = 10;

export function initializeE2E(runTests) {
  const e2e = {
    browser: null,
    page: null,
    skip(browsers, cb) {
      const shouldSkip = browsers.find((browser) => browser === E2E_BROWSER);
      if (shouldSkip) {
        const it = global.it;
        global.it = global.it.skip;
        try {
          cb();
        } finally {
          global.it = it;
        }
      } else {
        cb();
      }
    },
    async saveScreenshot(print) {
      const currentTest = expect.getState().currentTestName;
      const path = currentTest.replace(/\s/g, '_') + '.png';
      await e2e.page.screenshot({path});
    },
    async logScreenshot(print) {
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
    const browser = await {chromium, webkit, firefox}[E2E_BROWSER].launch({
      headless: !E2E_DEBUG,
    });
    e2e.browser = browser;
  });
  beforeEach(async () => {
    const page = await e2e.browser.newPage();
    await page.goto(`http://localhost:${E2E_PORT}/`);
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
              const page = await await e2e.browser.newPage();
              await page.goto(`http://localhost:${E2E_PORT}/`);
              e2e.page = page;
              // retry
              return await attempt();
            } else {
              // fail for real + log screenshot
              console.log(`Flaky Test: ${description}:`);
              await e2e.logScreenshot();
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

export async function repeat(times, cb) {
  for (let i = 0; i < times; i++) {
    await cb();
  }
}

export async function assertHTMLSnapshot(page) {
  // Assert HTML of the editor matches the snapshot
  const html = await page.innerHTML('div.editor');
  // HTML might differ between browsers, so we use attach
  // it to an element using JSDOM to normalize and prettify
  // the output.
  const element = document.createElement('div');
  element.innerHTML = html;
  expect(element.firstChild).toMatchSnapshot();
}
export async function assertSelection(page, expected) {
  // Assert the selection of the editor matches the snapshot
  const selection = await page.evaluate(() => {
    const editorElement = document.querySelector('div.editor');

    const getPathFromNode = (node) => {
      const path = [];
      while (node !== null) {
        const parent = node.parentNode;
        if (parent === null || node === editorElement) {
          break;
        }
        path.push(Array.from(parent.childNodes).indexOf(node));
        node = parent;
      }
      return path.reverse();
    };

    const {
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    } = window.getSelection();

    return {
      anchorPath: getPathFromNode(anchorNode),
      anchorOffset,
      focusPath: getPathFromNode(focusNode),
      focusOffset,
    };
  }, expected);
  expect(selection).toEqual(expected);
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
      const pasteEvent = new ClipboardEvent('paste', {bubbles: true});
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
          const inputEvent = new InputEvent('beforeinput', {bubbles: true});
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
