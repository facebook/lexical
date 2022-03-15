/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToLineBeginning,
  moveToLineEnd,
  moveToNextWord,
  moveToParagraphBeginning,
  moveToParagraphEnd,
  moveToPrevWord,
} from '../keyboardShortcuts';
import {
  assertSelection,
  E2E_BROWSER,
  focusEditor,
  initializeE2E,
  IS_WINDOWS,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
} from '../utils';

describe('Keyboard Navigation', () => {
  initializeE2E((e2e) => {
    async function typeParagraphs(page) {
      await focusEditor(page);
      await page.keyboard.type(
        'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      );
      await page.keyboard.press('Enter');
      await page.keyboard.type(
        'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ',
      );
      await page.keyboard.press('Enter');
      await page.keyboard.type(
        'It was popularised in the 1960s with the release of Letraset sheets containing lorem ipsum passages.',
      );
    }

    it('can type several paragraphs', async () => {
      const {isRichText, page} = e2e;
      await typeParagraphs(page);
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 100,
          anchorPath: [2, 0, 0],
          focusOffset: 100,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 100,
          anchorPath: [0, 4, 0],
          focusOffset: 100,
          focusPath: [0, 4, 0],
        });
      }
    });

    it('can move to the beginning of the current line, then back to the end of the current line', async () => {
      const {isRichText, page} = e2e;
      await typeParagraphs(page);
      await moveToLineBeginning(page);
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [2, 0, 0],
          focusOffset: 0,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 4, 0],
          focusOffset: 0,
          focusPath: [0, 4, 0],
        });
      }
      await moveToLineEnd(page);
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 100,
          anchorPath: [2, 0, 0],
          focusOffset: 100,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 100,
          anchorPath: [0, 4, 0],
          focusOffset: 100,
          focusPath: [0, 4, 0],
        });
      }
    });

    it('can move to the top of the editor', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 0, 0],
        focusOffset: 0,
        focusPath: [0, 0, 0],
      });
    });

    it('can move one word to the right', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await moveToNextWord(page);
      if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 6,
            anchorPath: [0, 0, 0],
            focusOffset: 6,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 0, 0],
            focusOffset: 5,
            focusPath: [0, 0, 0],
          });
        }
      } else if (!IS_WINDOWS) {
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [0, 0, 0],
          focusOffset: 5,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 6,
          anchorPath: [0, 0, 0],
          focusOffset: 6,
          focusPath: [0, 0, 0],
        });
      }
    });

    it('can move to the beginning of the previous word', async () => {
      const {isRichText, page} = e2e;
      await typeParagraphs(page);
      await moveToPrevWord(page);
      // Chrome stops words on punctuation, so we need to trigger
      // the left arrow key one more time.
      if (E2E_BROWSER === 'chromium') {
        await moveToPrevWord(page);
      }
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 91,
          anchorPath: [2, 0, 0],
          focusOffset: 91,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 91,
          anchorPath: [0, 4, 0],
          focusOffset: 91,
          focusPath: [0, 4, 0],
        });
      }
      await moveToPrevWord(page);
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 85,
          anchorPath: [2, 0, 0],
          focusOffset: 85,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 85,
          anchorPath: [0, 4, 0],
          focusOffset: 85,
          focusPath: [0, 4, 0],
        });
      }
    });

    it('can move to the bottom of the editor', async () => {
      const {isRichText, page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await moveToEditorEnd(page);
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 100,
          anchorPath: [2, 0, 0],
          focusOffset: 100,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 100,
          anchorPath: [0, 4, 0],
          focusOffset: 100,
          focusPath: [0, 4, 0],
        });
      }
    });

    it('can move to the beginning of the current paragraph', async () => {
      const {isRichText, page} = e2e;
      await typeParagraphs(page);
      await moveToParagraphBeginning(page);
      if (isRichText) {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [2, 0, 0],
          focusOffset: 0,
          focusPath: [2, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 4, 0],
          focusOffset: 0,
          focusPath: [0, 4, 0],
        });
      }
    });

    it('can move to the top of the editor, then to the bottom of the current paragraph', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await moveToParagraphEnd(page);
      await assertSelection(page, {
        // Due to text rendering it can be in this range of offsets
        anchorOffset: [65, 74],

        anchorPath: [0, 0, 0],
        // Due to text rendering it can be in this range of offsets
        focusOffset: [65, 74],

        focusPath: [0, 0, 0],
      });
    });

    it('can navigate through the plain text word by word', async () => {
      const {page} = e2e;
      await focusEditor(page);
      // type sample text
      await page.keyboard.type('  123 abc 456  def  ');
      await assertSelection(page, {
        anchorOffset: 20,
        anchorPath: [0, 0, 0],
        focusOffset: 20,
        focusPath: [0, 0, 0],
      });
      // navigate through the text
      // 1 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorOffset: 15,
        anchorPath: [0, 0, 0],
        focusOffset: 15,
        focusPath: [0, 0, 0],
      });
      // 2 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorOffset: 10,
        anchorPath: [0, 0, 0],
        focusOffset: 10,
        focusPath: [0, 0, 0],
      });
      // 3 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorOffset: 6,
        anchorPath: [0, 0, 0],
        focusOffset: 6,
        focusPath: [0, 0, 0],
      });
      // 4 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0, 0, 0],
        focusOffset: 2,
        focusPath: [0, 0, 0],
      });
      // 5 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 0, 0],
        focusOffset: 0,
        focusPath: [0, 0, 0],
      });
      // 1 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 0, 0],
            focusOffset: 2,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 0, 0],
            focusOffset: 5,
            focusPath: [0, 0, 0],
          });
        }
      } else if (!IS_WINDOWS) {
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [0, 0, 0],
          focusOffset: 5,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 2,
          anchorPath: [0, 0, 0],
          focusOffset: 2,
          focusPath: [0, 0, 0],
        });
      }
      // 2 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 6,
            anchorPath: [0, 0, 0],
            focusOffset: 6,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 9,
            anchorPath: [0, 0, 0],
            focusOffset: 9,
            focusPath: [0, 0, 0],
          });
        }
      } else if (!IS_WINDOWS) {
        await assertSelection(page, {
          anchorOffset: 9,
          anchorPath: [0, 0, 0],
          focusOffset: 9,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 6,
          anchorPath: [0, 0, 0],
          focusOffset: 6,
          focusPath: [0, 0, 0],
        });
      }
      // 3 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 10,
            anchorPath: [0, 0, 0],
            focusOffset: 10,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 13,
            anchorPath: [0, 0, 0],
            focusOffset: 13,
            focusPath: [0, 0, 0],
          });
        }
      } else if (!IS_WINDOWS) {
        await assertSelection(page, {
          anchorOffset: 13,
          anchorPath: [0, 0, 0],
          focusOffset: 13,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 10,
          anchorPath: [0, 0, 0],
          focusOffset: 10,
          focusPath: [0, 0, 0],
        });
      }
      // 4 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 15,
            anchorPath: [0, 0, 0],
            focusOffset: 15,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 18,
            anchorPath: [0, 0, 0],
            focusOffset: 18,
            focusPath: [0, 0, 0],
          });
        }
      } else if (!IS_WINDOWS) {
        await assertSelection(page, {
          anchorOffset: 18,
          anchorPath: [0, 0, 0],
          focusOffset: 18,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 15,
          anchorPath: [0, 0, 0],
          focusOffset: 15,
          focusPath: [0, 0, 0],
        });
      }
      // 5 right
      await moveToNextWord(page);
      if (!IS_WINDOWS || E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 20,
          anchorPath: [0, 0, 0],
          focusOffset: 20,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 18,
          anchorPath: [0, 0, 0],
          focusOffset: 18,
          focusPath: [0, 0, 0],
        });

        // 6 right
        await moveToNextWord(page);
        await assertSelection(page, {
          anchorOffset: 20,
          anchorPath: [0, 0, 0],
          focusOffset: 20,
          focusPath: [0, 0, 0],
        });
      }
    });

    it('can navigate through the formatted text word by word', async () => {
      const {isRichText, page} = e2e;
      await focusEditor(page);
      // type sample text
      await page.keyboard.type('  123 abc 456  def  ');
      await assertSelection(page, {
        anchorOffset: 20,
        anchorPath: [0, 0, 0],
        focusOffset: 20,
        focusPath: [0, 0, 0],
      });
      // This test relies on rich text formatting
      if (isRichText) {
        // select "de" and make it bold
        await moveToPrevWord(page);
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Shift');
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        // select "ab" and make it bold
        await moveToPrevWord(page);
        await moveToPrevWord(page);
        await moveToPrevWord(page);
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Shift');
        await keyDownCtrlOrMeta(page);
        await page.keyboard.press('b');
        await keyUpCtrlOrMeta(page);
        await moveToLineEnd(page);
        await assertSelection(page, {
          anchorOffset: 3,
          anchorPath: [0, 4, 0],
          focusOffset: 3,
          focusPath: [0, 4, 0],
        });

        // navigate through the text
        // 1 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 7,
            anchorPath: [0, 2, 0],
            focusOffset: 7,
            focusPath: [0, 2, 0],
          });
        } else if (E2E_BROWSER === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 7,
            anchorPath: [0, 2, 0],
            focusOffset: 7,
            focusPath: [0, 2, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 7,
            anchorPath: [0, 2, 0],
            focusOffset: 7,
            focusPath: [0, 2, 0],
          });
        }
        // 2 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 2, 0],
            focusOffset: 2,
            focusPath: [0, 2, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 2, 0],
            focusOffset: 2,
            focusPath: [0, 2, 0],
          });
        }
        // 3 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 6,
            anchorPath: [0, 0, 0],
            focusOffset: 6,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 6,
            anchorPath: [0, 0, 0],
            focusOffset: 6,
            focusPath: [0, 0, 0],
          });
        }
        // 4 left
        await moveToPrevWord(page);
        await assertSelection(page, {
          anchorOffset: 2,
          anchorPath: [0, 0, 0],
          focusOffset: 2,
          focusPath: [0, 0, 0],
        });
        // 5 left
        await moveToPrevWord(page);
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        });
        // 1 right
        await moveToNextWord(page);
        if (IS_WINDOWS && E2E_BROWSER === 'chromium') {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 0, 0],
            focusOffset: 2,
            focusPath: [0, 0, 0],
          });
        } else if (E2E_BROWSER === 'firefox' && IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 0, 0],
            focusOffset: 2,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 0, 0],
            focusOffset: 5,
            focusPath: [0, 0, 0],
          });
        }
        // 2 right
        await moveToNextWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 1,
            anchorPath: [0, 2, 0],
            focusOffset: 1,
            focusPath: [0, 2, 0],
          });
        } else if (E2E_BROWSER === 'firefox') {
          if (IS_WINDOWS) {
            await assertSelection(page, {
              anchorOffset: 0,
              anchorPath: [0, 1, 0],
              focusOffset: 0,
              focusPath: [0, 1, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 1,
              anchorPath: [0, 2, 0],
              focusOffset: 1,
              focusPath: [0, 2, 0],
            });
          }
        } else {
          if (IS_WINDOWS) {
            await assertSelection(page, {
              anchorOffset: 6,
              anchorPath: [0, 0, 0],
              focusOffset: 6,
              focusPath: [0, 0, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 1,
              anchorPath: [0, 2, 0],
              focusOffset: 1,
              focusPath: [0, 2, 0],
            });
          }
        }
        // 3 right
        await moveToNextWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 2, 0],
            focusOffset: 5,
            focusPath: [0, 2, 0],
          });
        } else if (E2E_BROWSER === 'firefox') {
          if (IS_WINDOWS) {
            await assertSelection(page, {
              anchorOffset: 2,
              anchorPath: [0, 2, 0],
              focusOffset: 2,
              focusPath: [0, 2, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 5,
              anchorPath: [0, 2, 0],
              focusOffset: 5,
              focusPath: [0, 2, 0],
            });
          }
        } else {
          if (IS_WINDOWS) {
            await assertSelection(page, {
              anchorOffset: 2,
              anchorPath: [0, 2, 0],
              focusOffset: 2,
              focusPath: [0, 2, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 5,
              anchorPath: [0, 2, 0],
              focusOffset: 5,
              focusPath: [0, 2, 0],
            });
          }
        }
        // 4 right
        await moveToNextWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 1,
            anchorPath: [0, 4, 0],
            focusOffset: 1,
            focusPath: [0, 4, 0],
          });
        } else if (E2E_BROWSER === 'firefox') {
          if (IS_WINDOWS) {
            await assertSelection(page, {
              anchorOffset: 0,
              anchorPath: [0, 3, 0],
              focusOffset: 0,
              focusPath: [0, 3, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 1,
              anchorPath: [0, 4, 0],
              focusOffset: 1,
              focusPath: [0, 4, 0],
            });
          }
        } else {
          if (IS_WINDOWS) {
            await assertSelection(page, {
              anchorOffset: 7,
              anchorPath: [0, 2, 0],
              focusOffset: 7,
              focusPath: [0, 2, 0],
            });
          } else {
            await assertSelection(page, {
              anchorOffset: 1,
              anchorPath: [0, 4, 0],
              focusOffset: 1,
              focusPath: [0, 4, 0],
            });
          }
        }
        // 5 right
        await moveToNextWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 4, 0],
            focusOffset: 3,
            focusPath: [0, 4, 0],
          });
        } else if (!IS_WINDOWS || E2E_BROWSER === 'firefox') {
          if (E2E_BROWSER === 'firefox') {
            if (IS_WINDOWS) {
              await assertSelection(page, {
                anchorOffset: 3,
                anchorPath: [0, 4, 0],
                focusOffset: 3,
                focusPath: [0, 4, 0],
              });
            } else {
              await assertSelection(page, {
                anchorOffset: 3,
                anchorPath: [0, 4, 0],
                focusOffset: 3,
                focusPath: [0, 4, 0],
              });
            }
          } else {
            await assertSelection(page, {
              anchorOffset: 3,
              anchorPath: [0, 4, 0],
              focusOffset: 3,
              focusPath: [0, 4, 0],
            });
          }
        } else if (!IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 1,
            anchorPath: [0, 4, 0],
            focusOffset: 1,
            focusPath: [0, 4, 0],
          });
          // 6 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 4, 0],
            focusOffset: 3,
            focusPath: [0, 4, 0],
          });
        } else {
          // 6 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 4, 0],
            focusOffset: 3,
            focusPath: [0, 4, 0],
          });
        }
      }
    });

    it('can navigate through the text with emoji word by word', async () => {
      const {page} = e2e;
      await focusEditor(page);
      // type sample text
      await page.keyboard.type('123:)456 abc:):)de fg');
      await assertSelection(page, {
        anchorOffset: 5,
        anchorPath: [0, 5, 0],
        focusOffset: 5,
        focusPath: [0, 5, 0],
      });
      // navigate through the text
      // 1 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorOffset: 3,
        anchorPath: [0, 5, 0],
        focusOffset: 3,
        focusPath: [0, 5, 0],
      });
      // 2 left
      await moveToPrevWord(page);
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 2, 0],
          focusOffset: 4,
          focusPath: [0, 2, 0],
        });
      } else if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorOffset: 2,
          anchorPath: [0, 4, 0, 0],
          focusOffset: 2,
          focusPath: [0, 4, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 2,
          anchorPath: [0, 4, 0, 0],
          focusOffset: 2,
          focusPath: [0, 4, 0, 0],
        });
      }
      // 3 left
      await moveToPrevWord(page);
      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 2, 0],
          focusOffset: 4,
          focusPath: [0, 2, 0],
        });
      } else if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 7,
          anchorPath: [0, 2, 0],
          focusOffset: 7,
          focusPath: [0, 2, 0],
        });
      }
      // Non-Firefox requires more arrow presses
      if (E2E_BROWSER !== 'firefox') {
        // 4 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 1, 0, 0],
            focusOffset: 2,
            focusPath: [0, 1, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 4,
            anchorPath: [0, 2, 0],
            focusOffset: 4,
            focusPath: [0, 2, 0],
          });
        }
        // 5 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 0,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 1, 0, 0],
            focusOffset: 2,
            focusPath: [0, 1, 0, 0],
          });
        }
        // 6 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'chromium') {
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 0, 0],
            focusOffset: 3,
            focusPath: [0, 0, 0],
          });
        } else if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 0,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 2, 0],
            focusOffset: 0,
            focusPath: [0, 2, 0],
          });
        }

        // 7 left
        await moveToPrevWord(page);
        if (E2E_BROWSER === 'chromium') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 0,
            focusPath: [0, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 0,
            focusPath: [0, 0, 0],
          });
        }

        // 8 left
        await moveToPrevWord(page);
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        });
      }
      // 1 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorOffset: 3,
          anchorPath: [0, 0, 0],
          focusOffset: 3,
          focusPath: [0, 0, 0],
        });
      } else if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 4,
            anchorPath: [0, 2, 0],
            focusOffset: 4,
            focusPath: [0, 2, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 2, 0],
            focusOffset: 3,
            focusPath: [0, 2, 0],
          });
        }
      } else {
        await assertSelection(page, {
          anchorOffset: 3,
          anchorPath: [0, 0, 0],
          focusOffset: 3,
          focusPath: [0, 0, 0],
        });
      }
      // 2 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorOffset: 3,
          anchorPath: [0, 2, 0],
          focusOffset: 3,
          focusPath: [0, 2, 0],
        });
      } else if (E2E_BROWSER === 'firefox') {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 5, 0],
            focusOffset: 3,
            focusPath: [0, 5, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 5, 0],
            focusOffset: 2,
            focusPath: [0, 5, 0],
          });
        }
      } else {
        if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 1, 0, 0],
            focusOffset: 2,
            focusPath: [0, 1, 0, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 1, 0, 0],
            focusOffset: 2,
            focusPath: [0, 1, 0, 0],
          });
        }
      }
      // 3 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorOffset: 7,
          anchorPath: [0, 2, 0],
          focusOffset: 7,
          focusPath: [0, 2, 0],
        });
      } else if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [0, 5, 0],
          focusOffset: 5,
          focusPath: [0, 5, 0],
        });
      } else if (IS_WINDOWS) {
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 2, 0],
          focusOffset: 4,
          focusPath: [0, 2, 0],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 3,
          anchorPath: [0, 2, 0],
          focusOffset: 3,
          focusPath: [0, 2, 0],
        });
      }
      // 4 right
      await moveToNextWord(page);
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 5,
          anchorPath: [0, 5, 0],
          focusOffset: 5,
          focusPath: [0, 5, 0],
        });
      } else {
        // 5 right
        await moveToNextWord(page);
        if (E2E_BROWSER === 'webkit') {
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 5, 0],
            focusOffset: 5,
            focusPath: [0, 5, 0],
          });
        } else if (IS_WINDOWS) {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 4, 0, 0],
            focusOffset: 2,
            focusPath: [0, 4, 0, 0],
          });

          // 6 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 3,
            anchorPath: [0, 5, 0],
            focusOffset: 3,
            focusPath: [0, 5, 0],
          });

          // 7 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 5, 0],
            focusOffset: 5,
            focusPath: [0, 5, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 4, 0, 0],
            focusOffset: 2,
            focusPath: [0, 4, 0, 0],
          });

          // 6 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 2,
            anchorPath: [0, 5, 0],
            focusOffset: 2,
            focusPath: [0, 5, 0],
          });

          // 7 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 5, 0],
            focusOffset: 5,
            focusPath: [0, 5, 0],
          });
        }

        if (E2E_BROWSER === 'webkit') {
          // 6 right
          await moveToNextWord(page);
          await assertSelection(page, {
            anchorOffset: 5,
            anchorPath: [0, 5, 0],
            focusOffset: 5,
            focusPath: [0, 5, 0],
          });
        }
      }
    });
  });
});
