/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  focusEditor,
  waitForSelector,
  click,
  dragMouse,
  clickSelectors,
  IS_COLLAB,
  E2E_BROWSER,
} from '../utils';

async function insertTable(page) {
  // Open modal
  await waitForSelector(page, 'button .table');
  await click(page, 'button .table');

  // Confirm default 3x3 dimensions
  await waitForSelector(
    page,
    'div[data-test-id="table-model-confirm-insert"] > .Button__root',
  );
  await click(
    page,
    'div[data-test-id="table-model-confirm-insert"] > .Button__root',
  );
}

async function fillTablePartiallyWithText(page) {
  await page.keyboard.type('a');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('b');
  await page.keyboard.press('Tab');
  await page.keyboard.press('c');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  await page.keyboard.press('b');

  if (E2E_BROWSER !== 'chromium') {
    await page.click(`table:first-of-type > tr:nth-child(1) > td:nth-child(2)`);
  }

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('d');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('e');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('f');
  await page.keyboard.press('ArrowUp');
  if (E2E_BROWSER !== 'chromium') {
    await page.click(`table:first-of-type > tr:nth-child(1) > td:nth-child(3)`);
  }
  await page.keyboard.press('c');
}

async function selectCellsFromTableCords(page, firstCords, secondCords) {
  let p = page;

  if (IS_COLLAB) {
    await focusEditor(page);
    p = await page.frame('left');
  }

  const firstRowFirstColumnCellBoundingBox = await p.locator(
    `table:first-of-type > tr:nth-child(${firstCords.y + 1}) > th:nth-child(${
      firstCords.x + 1
    })`,
  );

  const secondRowSecondCellBoundingBox = await p.locator(
    `table:first-of-type > tr:nth-child(${secondCords.y + 1}) > td:nth-child(${
      secondCords.x + 1
    })`,
  );

  // Focus on inside the iFrame or the boundingBox() below returns null.
  await firstRowFirstColumnCellBoundingBox.click();

  await dragMouse(
    page,
    await firstRowFirstColumnCellBoundingBox.boundingBox(),
    await secondRowSecondCellBoundingBox.boundingBox(),
  );
}

describe('Tables', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      `Can a table be inserted from the toolbar`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
        );

        await insertTable(page);

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><table class="PlaygroundEditorTheme__table b2p7l5pb l068gjig gvxzyvdx efm7ts3d c2b2pakg mfclru0v"><tr><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr></table><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
        );
      },
    );

    it.skipIf(e2e.isPlainText, `Can type inside of table cell`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await insertTable(page);

      await page.keyboard.type('abc');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><table class="PlaygroundEditorTheme__table b2p7l5pb l068gjig gvxzyvdx efm7ts3d c2b2pakg mfclru0v"><tr><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">abc</span></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr></table><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );
    });

    it.skipIf(e2e.isPlainText, `Can navigate table with keyboard`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await insertTable(page);

      await fillTablePartiallyWithText(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><table class="PlaygroundEditorTheme__table b2p7l5pb l068gjig gvxzyvdx efm7ts3d c2b2pakg mfclru0v"><tr><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">a</span></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">bb</span></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">cc</span></p></th></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">d</span></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">e</span></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">f</span></p></td></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr></table><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
      );
    });

    it.skipIf(
      e2e.isPlainText,
      `Can select cells using Table selection`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await insertTable(page);

        await fillTablePartiallyWithText(page);
        await selectCellsFromTableCords(page, {x: 0, y: 0}, {x: 1, y: 1});

        // Check that the highlight styles are applied.
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><table class="PlaygroundEditorTheme__table b2p7l5pb l068gjig gvxzyvdx efm7ts3d c2b2pakg mfclru0v"><tr><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">a</span></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">bb</span></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">cc</span></p></th></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">d</span></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">e</span></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">f</span></p></td></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr></table><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can style text using Table selection`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await insertTable(page);

        await fillTablePartiallyWithText(page);
        await selectCellsFromTableCords(page, {x: 0, y: 0}, {x: 1, y: 1});

        await clickSelectors(page, [
          '.bold',
          '.italic',
          '.underline',
          '.strikethrough',
        ]);

        // Check that the character styles are applied.
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><table class="PlaygroundEditorTheme__table b2p7l5pb l068gjig gvxzyvdx efm7ts3d c2b2pakg mfclru0v"><tr><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c PlaygroundEditorTheme__textItalic qp0gn4il PlaygroundEditorTheme__textUnderlineStrikethrough kf6cyplv" data-lexical-text="true">a</strong></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c PlaygroundEditorTheme__textItalic qp0gn4il PlaygroundEditorTheme__textUnderlineStrikethrough kf6cyplv" data-lexical-text="true">bb</strong></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">cc</span></p></th></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c PlaygroundEditorTheme__textItalic qp0gn4il PlaygroundEditorTheme__textUnderlineStrikethrough kf6cyplv" data-lexical-text="true">d</strong></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36" style="background-color: rgb(163, 187, 255); caret-color: transparent;"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><strong class="PlaygroundEditorTheme__textBold igjjae4c PlaygroundEditorTheme__textItalic qp0gn4il PlaygroundEditorTheme__textUnderlineStrikethrough kf6cyplv" data-lexical-text="true">e</strong></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">f</span></p></td></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr></table><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
        );
      },
    );

    it.skipIf(
      e2e.isPlainText,
      `Can clear text using Table selection`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);
        await insertTable(page);

        await fillTablePartiallyWithText(page);
        await selectCellsFromTableCords(page, {x: 0, y: 0}, {x: 1, y: 1});

        await page.keyboard.press('Backspace');

        // Check that the text was cleared.
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p><table class="PlaygroundEditorTheme__table b2p7l5pb l068gjig gvxzyvdx efm7ts3d c2b2pakg mfclru0v"><tr><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></th><th class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36 PlaygroundEditorTheme__tableCellHeader h3v0m4r6 ztn2w49o"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">cc</span></p></th></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">f</span></p></td></tr><tr><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td><td class="PlaygroundEditorTheme__tableCell hfn9ay4j o16r2wbc e22jxqte gpza54hc nq2b4knc jl13m0i8 qbvjirod ejhi0i36"><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p></td></tr></table><p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y"><br></p>',
        );
      },
    );
  });
});
