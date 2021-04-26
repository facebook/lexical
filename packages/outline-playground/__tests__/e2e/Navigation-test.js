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
        async function typeParagraphs(page) {
            await page.focus('div.editor');
            await page.keyboard.type('Lorem Ipsum is simply dummy text of the printing and typesetting industry.');
            await page.keyboard.press('Enter');
            await sleep(500);
            await page.keyboard.type('It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ');
            await page.keyboard.press('Enter');
            await sleep(500);
            await page.keyboard.type('It was popularised in the 1960s with the release of Letraset sheets containing lorem ipsum passages.');
        };

        it('can type several paragraphs', async () => {
            const {page} = e2e;
            await typeParagraphs(page);
            await assertHTMLSnapshot(page);
            await assertSelection(page, {
                anchorPath: [2, 0, 0],
                anchorOffset: 100,
                focusPath: [2, 0, 0],
                focusOffset: 100,
            });
        });

        it('can move to the beginning of the current line, then back to the end of the current line', async () => {
            const {page} = e2e;
            await typeParagraphs(page);
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
        });

        it('can move to the top of the editor', async () => {
            const {page} = e2e;
            await typeParagraphs(page);
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
        });

        it('can move one word to the right', async () => {
            const {page} = e2e;
            await typeParagraphs(page);
            // go to the top of the editor
            await keyDownCtrlOrMeta(page);
            await page.keyboard.press("ArrowUp");
            await keyUpCtrlOrMeta(page);
            // move one word to the right
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
        });

        it('can move to the beginning of the previous word', async () => {
            const {page} = e2e;
            await typeParagraphs(page);
            // go one word to the left
            await keyDownCtrlOrAlt(page);
            await page.keyboard.press("ArrowLeft");
            await keyUpCtrlOrAlt(page);
            await assertHTMLSnapshot(page);
            await assertSelection(page, {
                anchorPath: [2, 0, 0],
                anchorOffset: 91,
                focusPath: [2, 0, 0],
                focusOffset: 91,
            });
            // go another word to the left
            await keyDownCtrlOrAlt(page);
            await page.keyboard.press("ArrowLeft");
            await keyUpCtrlOrAlt(page);
            await assertHTMLSnapshot(page);
            await assertSelection(page, {
                anchorPath: [2, 0, 0],
                anchorOffset: 85,
                focusPath: [2, 0, 0],
                focusOffset: 85,
            });
        });

        it('can move to the bottom of the editor', async () => {
            const {page} = e2e;
            await typeParagraphs(page);
            // go to the top of the editor
            await keyDownCtrlOrMeta(page);
            await page.keyboard.press("ArrowUp");
            await keyUpCtrlOrMeta(page);
            // go to the end of the editor
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
        });

        e2e.skip(['firefox'], () => {
            // we skip these tests on firefox because it doesn't support keyboard shortcuts to move to the beginning/end of the paragraph
            it('can move to the beginning of the current paragraph', async () => {
                const {page} = e2e;
                await typeParagraphs(page);
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
            });

            it ('can move to the top of the editor, then to the bottom of the current paragraph', async () => {
                const {page} = e2e;
                await typeParagraphs(page);
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
