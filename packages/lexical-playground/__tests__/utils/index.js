/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Settings as AppSettings} from '../../src/appSettings';

import {toMatchInlineSnapshot} from 'jest-snapshot';
import {chromium, firefox, webkit} from 'playwright';
import prettier from 'prettier';
import {URLSearchParams} from 'url';
import {v4 as uuidv4} from 'uuid';

import {selectAll} from '../keyboardShortcuts';

export const E2E_DEBUG = process.env.E2E_DEBUG;
export const E2E_PORT = process.env.E2E_PORT || 3000;
export const E2E_BROWSER = process.env.E2E_BROWSER;
export const E2E_EVENTS_MODE = process.env.E2E_EVENTS_MODE || 'modern-events';
export const PLATFORM = process.platform;
export const IS_MAC = PLATFORM === 'darwin';
export const IS_WINDOWS = PLATFORM === 'win32';
export const IS_LINUX = !IS_MAC && !IS_WINDOWS;
export const E2E_EDITOR_MODE = process.env.E2E_EDITOR_MODE || 'rich-text';
export const IS_COLLAB = E2E_EDITOR_MODE === 'rich-text-with-collab';
export const IS_CI = process.env.CI;

jest.setTimeout(60000);

const retryCount = 20;
const recordVideo = IS_CI
  ? {
      dir: './e2e-videos',
    }
  : undefined;

type Config = $ReadOnly<{
  appSettings?: AppSettings,
}>;

async function attemptToLaunchBrowser(attempt = 0) {
  try {
    return await {chromium, firefox, webkit}[E2E_BROWSER].launch({
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
    appSettings.isRichText = E2E_EDITOR_MODE !== 'plain-text';
  }
  if (appSettings.disableBeforeInput === undefined) {
    appSettings.disableBeforeInput = E2E_EVENTS_MODE === 'legacy-events';
  }
  appSettings.isCollab = IS_COLLAB;
  if (appSettings.showNestedEditorTreeView === undefined) {
    appSettings.showNestedEditorTreeView = true;
  }
  const e2e = {
    browser: null,
    isCollab: IS_COLLAB,
    isPlainText: !appSettings.isRichText,
    isRichText: appSettings.isRichText,
    async logScreenshot() {
      const currentTest = expect.getState().currentTestName;
      const buffer = await e2e.page.screenshot();
      // eslint-disable-next-line no-console
      console.log(
        `Screenshot "${currentTest}": \n\n` +
          buffer.toString('base64') +
          '\n\n',
      );
    },
    page: null,
    async saveScreenshot() {
      const currentTest = expect.getState().currentTestName;
      const path =
        'e2e-screenshots/' + currentTest.replace(/\s/g, '_') + '.png';
      await e2e.page.screenshot({path});
    async saveVideo(attempt) {
      const currentTest = expect.getState().currentTestName;
      const testName = currentTest.replace(/\s/g, '_');
      e2e.page
        .video()
        .saveAs(
          `./e2e-videos/FAILED-${testName}-${PLATFORM}-${E2E_EDITOR_MODE}-${E2E_EVENTS_MODE}-${E2E_BROWSER}.webm`,
        );
    },
  };

  beforeAll(async () => {
    e2e.browser = await attemptToLaunchBrowser();
  });
  beforeEach(async () => {
    if (IS_COLLAB) {
      appSettings.collabId = uuidv4();
    }
    const urlParams = appSettingsToURLParams(appSettings);
    const url = `http://localhost:${E2E_PORT}/${
      IS_COLLAB ? 'split/' : ''
    }?${urlParams.toString()}`;
    const context = await e2e.browser.newContext({
      acceptDownloads: true,
      recordVideo,
    });
    const page = await context.newPage();
    await page.goto(url, {timeout: 60000});
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

  if (!E2E_DEBUG && !global.it._overridden) {
    const it = global.it;
    // if we mark the test as flaky, overwrite the original 'it' function
    // to attempt the test 10 times before actually failing
    const newIt = async (description, test) => {
      const result = it(description, async () => {
        let count = 0;
        async function attempt() {
          try {
            // test attempt
            await test();
          } catch (err) {
            // test failed
            await e2e.saveVideo(count + 1);
            if (count < 5) {
              count++;
              console.log(`Attempt #${count + 1} - ${description}`);
              // Close and re-open page
              await e2e.page.close();
              if (IS_COLLAB) {
                appSettings.collabId = uuidv4();
              }
              const urlParams = appSettingsToURLParams(appSettings);
              const url = `http://localhost:${E2E_PORT}/${
                IS_COLLAB ? 'split/' : ''
              }?${urlParams.toString()}`;
              const context = await e2e.browser.newContext({
                acceptDownloads: true,
                recordVideo,
              });
              const page = await context.newPage();
              await page.goto(url);
              e2e.page = page;
              // retry
              return await attempt();
            } else {
              // fail for real + log screenshot
              // eslint-disable-next-line no-console
              console.log(`Flaky Test: ${description}:`);
              await e2e.saveScreenshot();
              throw err;
            }
          }
        }
        return attempt();
      });
      return result;
    };
    global.it = newIt;
    // Preventing from overridding global.it twice (in case test suite runs initializeE2E twice)
    newIt._overridden = true;
    newIt.skipIf = async (condition, description, test) => {
      if (typeof condition === 'function' ? condition() : !!condition) {
        it.skip(description, test);
      } else {
        newIt(description, test);
      }
    };
  } else if (E2E_DEBUG) {
    it.skipIf = async (condition, description, test) => {
      if (typeof condition === 'function' ? condition() : !!condition) {
        it.skip(description, test);
      } else {
        it(description, test);
      }
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

export async function clickSelectors(page, selectors) {
  for (let i = 0; i < selectors.length; i++) {
    await waitForSelector(page, selectors[i]);
    await click(page, selectors[i]);
  }
}

async function assertHTMLOnPageOrFrame(pageOrFrame, expectedHtml) {
  // Assert HTML of the editor matches the given html
  const actualHtml = await pageOrFrame.innerHTML('div[contenteditable="true"]');
  if (expectedHtml === '') {
    // eslint-disable-next-line no-console
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

export async function assertHTML(page, expectedHtml, ignoreSecondFrame) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await assertHTMLOnPageOrFrame(leftFrame, expectedHtml);
    if (!ignoreSecondFrame) {
      let attempts = 0;
      while (attempts < 4) {
        const rightFrame = await page.frame('right');
        let failed = false;
        try {
          await assertHTMLOnPageOrFrame(rightFrame, expectedHtml);
        } catch (e) {
          if (attempts === 5) {
            throw e;
          }
          failed = true;
        }
        if (!failed) {
          break;
        }
        attempts++;
        await sleep(500);
      }
    }
  } else {
    await assertHTMLOnPageOrFrame(page, expectedHtml);
  }
}

async function assertSelectionOnPageOrFrame(page, expected) {
  // Assert the selection of the editor matches the snapshot
  const selection = await page.evaluate(() => {
    const rootElement = document.querySelector('div[contenteditable="true"]');

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
      anchorOffset,
      anchorPath: getPathFromNode(anchorNode),
      focusOffset,
      focusPath: getPathFromNode(focusNode),
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

export async function assertSelection(page, expected) {
  if (IS_COLLAB) {
    const frame = await page.frame('left');
    await assertSelectionOnPageOrFrame(frame, expected);
  } else {
    await assertSelectionOnPageOrFrame(page, expected);
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

async function copyToClipboardPageOrFrame(pageOrFrame) {
  return await pageOrFrame.evaluate(() => {
    const clipboardData = {};
    const editor = document.querySelector('div[contenteditable="true"]');
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

export async function copyToClipboard(page) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return await copyToClipboardPageOrFrame(leftFrame);
  } else {
    return await copyToClipboardPageOrFrame(page);
  }
}

async function pasteFromClipboardPageOrFrame(pageOrFrame, clipboardData) {
  const canUseBeforeInput = supportsBeforeInput(pageOrFrame);
  await pageOrFrame.evaluate(
    async ({
      clipboardData: _clipboardData,
      canUseBeforeInput: _canUseBeforeInput,
    }) => {
      const editor = document.querySelector('div[contenteditable="true"]');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData(type, value) {
            return _clipboardData[type];
          },
        },
      });
      editor.dispatchEvent(pasteEvent);
      if (!pasteEvent.defaultPrevented) {
        if (_canUseBeforeInput) {
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
                return _clipboardData[type];
              },
            },
          });
          editor.dispatchEvent(inputEvent);
        }
      }
    },
    {canUseBeforeInput, clipboardData},
  );
}

export async function pasteFromClipboard(page, clipboardData) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await pasteFromClipboardPageOrFrame(leftFrame, clipboardData);
  } else {
    await pasteFromClipboardPageOrFrame(page, clipboardData);
  }
}

export async function sleep(delay) {
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function focusEditor(page, parentSelector = '.editor-shell') {
  const selector = `${parentSelector} div[contenteditable="true"]`;
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    if ((await leftFrame.$$('.loading').length) !== 0) {
      await leftFrame.waitForSelector('.loading', {
        state: 'detached',
      });
      await sleep(500);
    }
    await leftFrame.focus(selector);
  } else {
    await page.focus(selector);
  }
}

export async function getEditorElement(page, parentSelector = '.editor-shell') {
  const selector = `${parentSelector} div[contenteditable="true"]`;

  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.waitForSelector(selector);
    return leftFrame.$(selector);
  } else {
    await page.waitForSelector(selector);
    return page.$(selector);
  }
}

export async function waitForSelector(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.waitForSelector(selector, options);
  } else {
    await page.waitForSelector(selector, options);
  }
}

export async function click(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.click(selector, options);
  } else {
    await page.click(selector, options);
  }
}

export async function focus(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.focus(selector, options);
  } else {
    await page.focus(selector, options);
  }
}

export async function selectOption(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    await leftFrame.selectOption(selector, options);
  } else {
    await page.selectOption(selector, options);
  }
}

export async function textContent(page, selector, options) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return await leftFrame.textContent(selector, options);
  } else {
    return await page.textContent(selector, options);
  }
}

export async function evaluate(page, fn, args) {
  if (IS_COLLAB) {
    const leftFrame = await page.frame('left');
    return await leftFrame.evaluate(fn, args);
  } else {
    return await page.evaluate(fn, args);
  }
}

export async function clearEditor(page) {
  await selectAll(page);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
}

export async function insertImage(page, caption = null) {
  await waitForSelector(page, 'button .image');
  await click(page, 'button .image');
  await waitForSelector(page, '.editor-image img');

  if (caption !== null) {
    await click(page, '.editor-image img');
    await click(page, '.image-caption-button');
    await waitForSelector(page, '.editor-image img.focused', {
      state: 'detached',
    });
    await focusEditor(page, '.image-caption-container');
    await page.keyboard.type(caption);
  }
}

export async function dragMouse(page, firstBoundingBox, secondBoundingBox) {
  await page.mouse.move(
    firstBoundingBox.x + firstBoundingBox.width / 2,
    firstBoundingBox.y + firstBoundingBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    secondBoundingBox.x + secondBoundingBox.width / 2,
    secondBoundingBox.y + secondBoundingBox.height / 2,
  );
  await page.mouse.up();
}

expect.extend({
  async toMatchEditorInlineSnapshot(pageOrOptions, ...args) {
    // Setting error field allows jest to know where the matcher was called
    // to populate inline snapshot during update cycle
    this.error = new Error();
    let html;

    const {
      page,
      ignoreSecondFrame,
      ignoreClasses,
      ignoreInlineStyles,
      parentSelector,
    } = isElement(pageOrOptions)
      ? {
          ignoreClasses: true,
          ignoreInlineStyles: true,
          ignoreSecondFrame: false,
          page: pageOrOptions,
          parentSelector: '.editor-shell',
        }
      : {
          ignoreClasses: pageOrOptions.ignoreClasses !== false,
          ignoreInlineStyles: pageOrOptions.ignoreInlineStyles !== false,
          ignoreSecondFrame: pageOrOptions.ignoreSecondFrame === true,
          page: pageOrOptions.page,
          parentSelector: pageOrOptions.parentSelector || '.editor-shell',
        };

    const editorSelector = `${parentSelector} div[contenteditable="true"]`;

    if (!isElement(page)) {
      throw new Error(
        'toMatchEditorInlineSnapshot expects page or options object with page property',
      );
    }

    if (IS_COLLAB) {
      // For collab we make sure that left and right sides are matching each other
      // and then asserting it to the snapshot
      const leftFrame = await page.frame('left');
      const leftFrameEditor = await leftFrame.$(editorSelector);
      const leftFrameHTML = new PrettyHTML(await leftFrameEditor.innerHTML(), {
        ignoreClasses,
        ignoreInlineStyles,
      }).prettify();

      if (!ignoreSecondFrame) {
        let attempts = 5;

        while (attempts--) {
          const rightFrame = await page.frame('right');
          const rightFrameEditor = await rightFrame.$(editorSelector);
          const rightFrameHTML = new PrettyHTML(
            await rightFrameEditor.innerHTML(),
            {ignoreClasses, ignoreInlineStyles},
          ).prettify();

          if (rightFrameHTML === leftFrameHTML) {
            break;
          }

          if (!attempts) {
            // Returning as a matcher for a nicer left vs right diff formatting
            return expect(leftFrameHTML).toBe(rightFrameHTML);
          }

          await sleep(500);
        }
      }

      html = leftFrameHTML;
    } else {
      const editor = await page.$(editorSelector);
      html = await editor.innerHTML();
    }

    return toMatchInlineSnapshot.call(
      this,
      new PrettyHTML(html, {ignoreClasses, ignoreInlineStyles}),
      ...args,
    );
  },
});

function isElement(element) {
  return element && typeof element.$ === 'function';
}

// Wrapper around HTML string that is used as indicator for snapshot serializer
// that it should use own formatter (below)
class PrettyHTML {
  constructor(html, {ignoreClasses, ignoreInlineStyles}) {
    this.html = html;
    this.ignoreClasses = ignoreClasses;
    this.ignoreInlineStyles = ignoreInlineStyles;
  }

  prettify() {
    let html = this.html;

    if (this.ignoreClasses) {
      html = html.replace(/\sclass="([^"]*)"/g, '');
    }

    if (this.ignoreInlineStyles) {
      html = html.replace(/\sstyle="([^"]*)"/g, '');
    }

    return prettier
      .format(html, {
        htmlWhitespaceSensitivity: 'ignore',
        parser: 'html',
      })
      .trim();
  }
}

expect.addSnapshotSerializer({
  print: (value) => {
    return value.prettify();
  },
  test: (value) => {
    return value instanceof PrettyHTML;
  },
});
