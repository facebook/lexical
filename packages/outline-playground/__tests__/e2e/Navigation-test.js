/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
    initializeE2E,
    assertSelection,
    assertHTMLSnapshot,
    keyDownCtrlOrMeta,
    keyUpCtrlOrMeta,
    keyDownCtrlOrAlt,
    keyUpCtrlOrAlt,
    sleep,
  } from '../utils';

describe('Keyboard Navigation', () => {
    initializeE2E({chromium: true, webkit: true, firefox: true}, (e2e) => {
        e2e.skip(['firefox'], () => {
            // TODO: Don't skip firefox once #272 is resolved (option + up/down not working)
            it('can navigate a larger block of text using keyboard shortcuts', async () => {
                const {page} = e2e;

                await page.focus('div.editor');
                await page.keyboard.type('Lorem Ipsum is simply dummy text of the printing and typesetting industry.');
                await page.keyboard.press('Enter');
                await sleep(500);
                await page.keyboard.type('It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ');
                await page.keyboard.press('Enter');
                await sleep(500);
                await page.keyboard.type('It was popularised in the 1960s with the release of Letraset sheets containing lorem ipsum passages.');

                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [2, 0, 0],
                    anchorOffset: 100,
                    focusPath: [2, 0, 0],
                    focusOffset: 100,
                });

                //   Move to beginning of the current line
                await keyDownCtrlOrMeta(page);
                await page.keyboard.press('ArrowLeft');
                await keyUpCtrlOrMeta(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [2, 0, 0],
                    anchorOffset: 68,
                    focusPath: [2, 0, 0],
                    focusOffset: 68,
                });
                sleep(2000)

                // Move back to end of current line
                await keyDownCtrlOrMeta(page);
                await page.keyboard.press('ArrowRight');
                await keyUpCtrlOrMeta(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [2, 0, 0],
                    anchorOffset: 100,
                    focusPath: [2, 0, 0],
                    focusOffset: 100,
                });

                // Move to the top of the edit field
                await keyDownCtrlOrMeta(page);
                await page.keyboard.press("ArrowUp");
                await keyUpCtrlOrMeta(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [0, 0, 0],
                    anchorOffset: 0,
                    focusPath: [0, 0, 0],
                    focusOffset: 0,
                });

                // Move one word to the right

                await keyDownCtrlOrAlt(page);
                await page.keyboard.press("ArrowRight");
                await keyUpCtrlOrAlt(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [0, 0, 0],
                    anchorOffset: 5,
                    focusPath: [0, 0, 0],
                    focusOffset: 5,
                });

                // Move to end of the current line, then move to the beginning of the last word

                await keyDownCtrlOrMeta(page);
                await page.keyboard.press("ArrowRight");
                await keyUpCtrlOrMeta(page);
                await keyDownCtrlOrAlt(page);
                await page.keyboard.press("ArrowLeft");
                await keyUpCtrlOrAlt(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [0, 0, 0],
                    anchorOffset: 53,
                    focusPath: [0, 0, 0],
                    focusOffset: 53,
                });

                // Move to bottom of the edit field
                await keyDownCtrlOrMeta(page);
                await page.keyboard.press("ArrowDown");
                await keyUpCtrlOrMeta(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [2, 0, 0],
                    anchorOffset: 100,
                    focusPath: [2, 0, 0],
                    focusOffset: 100,
                });

                // Move to the beginning of the current paragraph
                await keyDownCtrlOrAlt(page);
                await page.keyboard.press("ArrowUp");
                await keyUpCtrlOrAlt(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [2, 0, 0],
                    anchorOffset: 0,
                    focusPath: [2, 0, 0],
                    focusOffset: 0,
                });

                // Move to the top of the editor, then to the bottom of the current paragraph
                await keyDownCtrlOrMeta(page);
                await page.keyboard.press("ArrowUp");
                await keyUpCtrlOrMeta(page);
                await keyDownCtrlOrAlt(page);
                await page.keyboard.press("ArrowDown");
                await keyUpCtrlOrAlt(page);
                await assertHTMLSnapshot(page);
                await assertSelection(page, {
                    anchorPath: [0, 0, 0],
                    anchorOffset: 74,
                    focusPath: [0, 0, 0],
                    focusOffset: 74,
                });
            });
        });
    });
});
