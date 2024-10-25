/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  applyCodeBlock,
  applyHeading,
  applyNormalFormat,
  applyQuoteBlock,
  centerAlign,
  clearFormatting,
  decreaseFontSize,
  increaseFontSize,
  indent,
  justifyAlign,
  leftAlign,
  outdent,
  rightAlign,
  selectCharacters,
  toggleBold,
  toggleBulletList,
  toggleChecklist,
  toggleInsertCodeBlock,
  toggleItalic,
  toggleNumberedList,
  toggleStrikethrough,
  toggleSubscript,
  toggleSuperscript,
  toggleUnderline,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  evaluate,
  expect,
  focusEditor,
  html,
  initialize,
  test,
  textContent,
} from '../utils/index.mjs';

const formatTestCases = [
  {
    applyShortcut: (page) => applyNormalFormat(page),
    format: 'Normal',
    isRevertible: false,
  },
  {
    applyShortcut: (page) => applyHeading(page, 1),
    format: 'Heading 1',
    isRevertible: false,
  },
  {
    applyShortcut: (page) => applyHeading(page, 2),
    format: 'Heading 2',
    isRevertible: false,
  },
  {
    applyShortcut: (page) => applyHeading(page, 3),
    format: 'Heading 3',
    isRevertible: false,
  },
  {
    applyShortcut: (page) => toggleBulletList(page),
    format: 'Bulleted List',
    isRevertible: true,
  },
  {
    applyShortcut: (page) => toggleNumberedList(page),
    format: 'Numbered List',
    isRevertible: true,
  },
  {
    applyShortcut: (page) => toggleChecklist(page),
    format: 'Check List',
    isRevertible: true,
  },
  {
    applyShortcut: (page) => applyQuoteBlock(page),
    format: 'Quote',
    isRevertible: false,
  },
  {
    applyShortcut: (page) => applyCodeBlock(page),
    format: 'Code Block',
    isRevertible: false,
  },
];

const alignmentTestCases = [
  {
    alignment: 'Left Align',
    applyShortcut: (page) => leftAlign(page),
  },
  {
    alignment: 'Center Align',
    applyShortcut: (page) => centerAlign(page),
  },
  {
    alignment: 'Right Align',
    applyShortcut: (page) => rightAlign(page),
  },
  {
    alignment: 'Justify Align',
    applyShortcut: (page) => justifyAlign(page),
  },
];

const additionalStylesTestCases = [
  {
    applyShortcut: (page) => toggleStrikethrough(page),
    style: 'Strikethrough',
  },
  {
    applyShortcut: (page) => toggleSubscript(page),
    style: 'Subscript',
  },
  {
    applyShortcut: (page) => toggleSuperscript(page),
    style: 'Superscript',
  },
];

const DEFAULT_FORMAT = 'Normal';

const getSelectedFormat = async (page) => {
  return await textContent(
    page,
    '.toolbar-item.block-controls > .text.dropdown-button-text',
  );
};

const isDropdownItemActive = async (page, dropdownItemIndex) => {
  return await evaluate(
    page,
    async (_dropdownItemIndex) => {
      await document
        .querySelector(
          'button[aria-label="Formatting options for additional text styles"]',
        )
        .click();

      const isActive = await document
        .querySelector('.dropdown')
        .children[_dropdownItemIndex].classList.contains('active');

      await document
        .querySelector(
          'button[aria-label="Formatting options for additional text styles"]',
        )
        .click();

      return isActive;
    },
    dropdownItemIndex,
  );
};

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  formatTestCases.forEach(({format, applyShortcut, isRevertible}) => {
    test(`Can use ${format} format with the shortcut`, async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);

      if (format === DEFAULT_FORMAT) {
        // Apply a different format first
        await applyHeading(page, 1);
      }

      await applyShortcut(page);

      expect(await getSelectedFormat(page)).toBe(format);

      if (isRevertible) {
        await applyShortcut(page);

        expect(await getSelectedFormat(page)).toBe(DEFAULT_FORMAT);
      }
    });
  });

  alignmentTestCases.forEach(({alignment, applyShortcut}, index) => {
    test(`Can use ${alignment} with the shortcut`, async ({
      page,
      isPlainText,
    }) => {
      test.skip(isPlainText);
      await focusEditor(page);
      await applyShortcut(page);

      const selectedAlignment = await textContent(
        page,
        '.toolbar-item.spaced.alignment > .text.dropdown-button-text',
      );

      expect(selectedAlignment).toBe(alignment);
    });
  });

  additionalStylesTestCases.forEach(
    ({applyShortcut, style}, dropdownItemIndex) => {
      test(`Can use ${style} with the shortcut`, async ({
        page,
        isPlainText,
      }) => {
        test.skip(isPlainText);
        await focusEditor(page);
        await applyShortcut(page);

        expect(await isDropdownItemActive(page, dropdownItemIndex)).toBe(true);

        // Toggle the style off and check if it's off
        await focusEditor(page);
        await applyShortcut(page);
        expect(await isDropdownItemActive(page, dropdownItemIndex)).toBe(false);
      });
    },
  );

  test('Can increase and decrease font size with the shortcuts', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await increaseFontSize(page);

    const getFontSize = async () => {
      return await evaluate(page, () => {
        return document.querySelector('.font-size-input').value;
      });
    };

    expect(await getFontSize()).toBe('17');
    await decreaseFontSize(page);
    expect(await getFontSize()).toBe('15');
  });

  test('Can clear formatting with the shortcut', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('abc');
    await selectCharacters(page, 'left', 3);

    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0],
    });

    await toggleBold(page);
    await toggleItalic(page);
    await toggleUnderline(page);
    await toggleStrikethrough(page);
    await toggleSubscript(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <sub data-lexical-text="true">
            <strong
              class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textSubscript">
              abc
            </strong>
          </sub>
        </p>
      `,
    );

    await clearFormatting(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
        </p>
      `,
    );
  });

  test('Can toggle Insert Code Block with the shortcut', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await toggleInsertCodeBlock(page);

    const isCodeBlockActive = await evaluate(page, () => {
      return document
        .querySelector(`button[aria-label="Insert code block"]`)
        .classList.contains('active');
    });

    expect(isCodeBlockActive).toBe(true);
  });

  test('Can indent and outdent with the shortcuts', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('abc');
    await indent(page, 3);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(120px);">
          <span data-lexical-text="true">abc</span>
        </p>
      `,
    );

    await outdent(page, 2);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr PlaygroundEditorTheme__indent"
          dir="ltr"
          style="padding-inline-start: calc(40px);">
          <span data-lexical-text="true">abc</span>
        </p>
      `,
    );

    await outdent(page, 1);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="">
          <span data-lexical-text="true">abc</span>
        </p>
      `,
    );
  });
});
