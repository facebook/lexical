let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;

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

function moveNativeSelection(
  anchorPath,
  anchorOffset,
  focusPath,
  focusOffset,
  isCollapsed = false,
) {
  return {
    type: 'move_native_selection',
    anchorPath,
    anchorOffset,
    focusPath,
    focusOffset,
    isCollapsed,
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
  isCollapsed = false,
) {
  const anchorNode = getNodeFromPath(anchorPath, editorElement);
  const focusNode = getNodeFromPath(focusPath, editorElement);
  const domSelection = window.getSelection();
  const range = document.createRange();
  range.collapse(isCollapsed);
  range.setStart(anchorNode, anchorOffset);
  range.setEnd(focusNode, focusOffset);
  domSelection.removeAllRanges();
  domSelection.addRange(range);
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
        case 'move_native_selection': {
          setNativeSelection(
            editorElement,
            input.anchorPath,
            input.anchorOffset,
            input.focusPath,
            input.focusOffset,
            input.isCollapsed,
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

  let editor = null;

  function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = Outline.useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });
    ref.current.focus();

    // Insert initial block
    update((view) => {
      const paragraph = Outline.createParagraph();
      const text = Outline.createText();
      paragraph.append(text);
      view.getBody().append(paragraph);
    });

    // Focus first element
    setNativeSelection(ref.current, [0, 0, 0], 0, [0, 0, 0], 0);
  }

  function update(callback) {
    const viewModel = editor.createViewModel(callback);
    editor.update(viewModel, true);
  }

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  test('Expect initial output to be a block with some text', () => {
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
    },
  ];

  suite.forEach((testUnit, i) => {
    const name = testUnit.name || 'Test case';
    test(name + ` (#${i + 1})`, () => {
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
