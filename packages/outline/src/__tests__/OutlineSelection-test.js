let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;

const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_UNDERLINE = 3;

function sanitizeHTML(html) {
  // Remove the special space characters
  return html.replace(/\uFEFF/g, '');
}

function insertText(text) {
  return {
    type: 'insert_text',
    text,
  };
}

function insertParagraph(text) {
  return {
    type: 'insert_paragraph',
  };
}

function deleteWordBackward() {
  return {
    type: 'delete_word_backward',
    text: null,
  };
}

function deleteWordForward() {
  return {
    type: 'delete_word_forward',
    text: null,
  };
}

function deleteBackward() {
  return {
    type: 'delete_backward',
    text: null,
  };
}

function deleteForward() {
  return {
    type: 'delete_forward',
    text: null,
  };
}

function formatBold() {
  return {
    type: 'format_text',
    format: FORMAT_BOLD,
  };
}

function formatItalic() {
  return {
    type: 'format_text',
    format: FORMAT_ITALIC,
  };
}

function formatStrikeThrough() {
  return {
    type: 'format_text',
    format: FORMAT_STRIKETHROUGH,
  };
}

function formatUnderline() {
  return {
    type: 'format_text',
    format: FORMAT_UNDERLINE,
  };
}

function moveWordBackward() {
  return {
    type: 'move_word_backward',
  };
}

function moveWordForward() {
  return {
    type: 'move_word_forward',
  };
}

function moveBackward() {
  return {
    type: 'move_backward',
  };
}

function moveForward() {
  return {
    type: 'move_forward',
  };
}

function moveNativeSelection(anchorPath, anchorOffset, focusPath, focusOffset) {
  return {
    type: 'move_native_selection',
    anchorPath,
    anchorOffset,
    focusPath,
    focusOffset,
  };
}

function getNodeFromPath(path, editorElement) {
  let node = editorElement;
  for (let i = 0; i < path.length; i++) {
    node = node.childNodes[path[i]];
  }
  return node;
}

function setNativeSelection(
  editorElement,
  anchorPath,
  anchorOffset,
  focusPath,
  focusOffset,
) {
  const anchorNode = getNodeFromPath(anchorPath, editorElement);
  const focusNode = getNodeFromPath(focusPath, editorElement);
  const domSelection = window.getSelection();
  const range = document.createRange();
  range.setStart(anchorNode, anchorOffset);
  range.setEnd(focusNode, focusOffset);
  domSelection.removeAllRanges();
  domSelection.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

function applySelectionInputs(inputs, update, editor) {
  const editorElement = editor.getEditorElement();
  inputs.forEach((input) => {
    update((view) => {
      const selection = view.getSelection();

      switch (input.type) {
        case 'insert_text': {
          selection.insertText(input.text);
          break;
        }
        case 'insert_paragraph': {
          selection.insertParagraph();
          break;
        }
        case 'delete_backward': {
          selection.deleteBackward();
          break;
        }
        case 'delete_forward': {
          selection.deleteForward();
          break;
        }
        case 'delete_word_backward': {
          selection.deleteWordBackward();
          break;
        }
        case 'delete_word_forward': {
          selection.deleteWordForward();
          break;
        }
        case 'format_text': {
          selection.formatText(input.format);
          break;
        }
        case 'move_backward': {
          selection.moveBackward();
          break;
        }
        case 'move_forward': {
          selection.moveForward();
          break;
        }
        case 'move_word_backward': {
          selection.moveWordBackward();
          break;
        }
        case 'move_word_forward': {
          selection.moveWordForward();
          break;
        }
        case 'move_native_selection': {
          setNativeSelection(
            editorElement,
            input.anchorPath,
            input.anchorOffset,
            input.focusPath,
            input.focusOffset,
          );
          break;
        }
        default:
          console.log('TODO');
      }
    });
  });
}

describe('OutlineSelection tests', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactTestUtils = require('react-dom/test-utils');
    Outline = require('outline');

    container = document.createElement('div');
    document.body.appendChild(container);
    init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  function useOutlineEditor(editorElementRef) {
    const editor = React.useMemo(() => Outline.createEditor(), []);

    React.useEffect(() => {
      const editorElement = editorElementRef.current;

      editor.setEditorElement(editorElement);
    }, [editorElementRef, editor]);

    return editor;
  }

  let editor = null;
  let ref;

  function init() {
    ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });
    ref.current.focus();
  }

  function emptySetup() {
    // Insert initial block
    update((view) => {
      const paragraph = Outline.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });

    // Focus first element
    setNativeSelection(ref.current, [0, 0, 0], 0, [0, 0, 0], 0);
  }

  function update(callback) {
    editor.update(callback, true);
  }

  test('Expect initial output to be a block with some text', () => {
    emptySetup();
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p><span data-text="true"><br></span></p></div>',
    );
  });

  const suite = [
    {
      name: 'Simple typing',
      inputs: [
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },

    {
      name: 'Simple typing in bold',
      inputs: [
        formatBold(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><strong data-text="true">Hello</strong></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Simple typing in italic',
      inputs: [
        formatItalic(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><em data-text="true">Hello</em></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Simple typing in underline',
      inputs: [
        formatUnderline(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr">' +
        '<span data-text="true" style="text-decoration: underline;">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Simple typing in strikethrough',
      inputs: [
        formatStrikeThrough(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr">' +
        '<span data-text="true" style="text-decoration: line-through;">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Deletion',
      inputs: [
        insertText('1'),
        insertText('2'),
        insertText('3'),
        deleteBackward(),
        insertText('4'),
        insertText('5'),
        deleteBackward(),
        insertText('6'),
        deleteForward(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p><span data-text="true">1246</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      },
      setup: emptySetup,
    },
    {
      name: 'Jump to beginning and insert',
      inputs: [
        insertText('1'),
        insertText('1'),
        insertText('2'),
        insertText('3'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
        insertText('a'),
        insertText('b'),
        insertText('c'),
        deleteForward(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">abc123</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      },
      setup: emptySetup,
    },
    {
      name: 'Select and replace',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        insertText('outline'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello outline!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 13,
        focusPath: [0, 0, 0],
        focusOffset: 13,
      },
      setup: emptySetup,
    },
    {
      name: 'Select and bold',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatBold(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello </span>' +
        '<strong data-text="true">draft</strong><span data-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Select and italic',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatItalic(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello </span>' +
        '<em data-text="true">draft</em><span data-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Select and bold + italic',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatBold(),
        formatItalic(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello </span>' +
        '<strong data-text="true" style="font-style: italic;">draft</strong><span data-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name: 'Select and replace all',
      inputs: [
        insertText('This is broken.'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 15),
        insertText('This works!'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">This works!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 11,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      },
      setup: emptySetup,
    },
    {
      name: 'Select and delete',
      inputs: [
        insertText('A lion.'),
        moveNativeSelection([0, 0, 0], 2, [0, 0, 0], 6),
        deleteForward(),
        insertText('duck'),
        moveNativeSelection([0, 0, 0], 2, [0, 0, 0], 6),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">A duck.</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      },
      setup: emptySetup,
    },
    {
      name: 'Inserting a paragraph',
      inputs: [insertParagraph()],
      expectedHTML:
        '<div contenteditable="true"><p><span data-text="true"><br></span></p>' +
        '<p><span data-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      },
      setup: emptySetup,
    },
    {
      name: 'Inserting a paragraph and then removing it',
      inputs: [insertParagraph(), deleteBackward()],
      expectedHTML:
        '<div contenteditable="true"><p><span data-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
      setup: emptySetup,
    },
    {
      name: 'Inserting a paragraph part way through text',
      inputs: [
        insertText('Hello world'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 6),
        insertParagraph(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello </span></p>' +
        '<p dir="ltr"><span data-text="true">world</span></p></div>',
      expectedSelection: {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      },
      setup: emptySetup,
    },
    {
      name: 'Inserting two paragraphs and then deleting via selection',
      inputs: [
        insertText('123'),
        insertParagraph(),
        insertText('456'),
        moveNativeSelection([0, 0, 0], 0, [1, 0, 0], 3),
        deleteBackward(),
      ],
      expectedHTML:
        '<div contenteditable="true"><p><span data-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
      setup: emptySetup,
    },
    {
      name:
        'Type text, move backward, insert text and move forward and insert more text',
      inputs: [
        insertText('ahi'),
        moveBackward(),
        moveBackward(),
        insertText(' bcd'),
        moveForward(),
        moveBackward(),
        insertText(' efg '),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">a bcd efg hi</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 10,
        focusPath: [0, 0, 0],
        focusOffset: 10,
      },
      setup: emptySetup,
    },
    {
      name:
        'Type text, move word backward, insert text and move word forward and insert more text',
      inputs: [
        insertText('world'),
        moveWordBackward(),
        insertText('Hello '),
        moveWordForward(),
        moveWordForward(),
        insertText('!'),
      ],
      expectedHTML:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello world!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 12,
        focusPath: [0, 0, 0],
        focusOffset: 12,
      },
      setup: emptySetup,
    },
    {
      name:
        'Type two words, delete word backward from end',
      inputs: [
        insertText('Hello world'),
        deleteWordBackward(),
      ],
      expectedHTML:
        '<div contenteditable=\"true\"><p dir=\"ltr\"><span data-text=\"true\">Hello </span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      },
      setup: emptySetup,
    },
    {
      name:
        'Type two words, delete word forward from beginning',
      inputs: [
        insertText('Hello world'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
        deleteWordForward(),
      ],
      expectedHTML:
        '<div contenteditable=\"true\"><p dir=\"ltr\"><span data-text=\"true\"> world</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
      setup: emptySetup,
    },
    {
      name:
        'Type two words, delete word forward from beginning of preceding whitespace',
      inputs: [
        insertText('Hello world'),
        moveNativeSelection([0, 0, 0], 5, [0, 0, 0], 5),
        deleteWordForward(),
      ],
      expectedHTML:
        '<div contenteditable=\"true\"><p dir=\"ltr\"><span data-text=\"true\">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
      setup: emptySetup,
    },
    {
      name:
        'Type two words, delete word backward from end of trailing whitespace',
      inputs: [
        insertText('Hello world'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 6),
        deleteWordBackward(),
      ],
      expectedHTML:
        '<div contenteditable=\"true\"><p dir=\"ltr\"><span data-text=\"true\">world</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
      setup: emptySetup,
    },
  ];

  suite.forEach((testUnit, i) => {
    const name = testUnit.name || 'Test case';
    test(name + ` (#${i + 1})`, () => {
      testUnit.setup();
      applySelectionInputs(testUnit.inputs, update, editor);
      // Validate HTML matches
      expect(sanitizeHTML(container.innerHTML)).toBe(testUnit.expectedHTML);
      // Validate selection matches
      const editorElement = editor.getEditorElement();
      const acutalSelection = window.getSelection();
      const expectedSelection = testUnit.expectedSelection;
      expect(acutalSelection.anchorNode).toBe(
        getNodeFromPath(expectedSelection.anchorPath, editorElement),
      );
      expect(acutalSelection.anchorOffset).toBe(expectedSelection.anchorOffset);
      expect(acutalSelection.focusNode).toBe(
        getNodeFromPath(expectedSelection.focusPath, editorElement),
      );
      expect(acutalSelection.focusOffset).toBe(expectedSelection.focusOffset);
    });
  });
});
