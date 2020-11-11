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
      inputs: [
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      result:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">Hello</span></p></div>',
    },
    {
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
      result:
        '<div contenteditable="true"><p><span data-text="true">1246</span></p></div>',
    },
    {
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
      result:
        '<div contenteditable="true"><p dir="ltr"><span data-text="true">abc123</span></p></div>',
    },
  ];

  suite.forEach((testUnit, i) => {
    test('Test case #' + (i + 1), () => {
      applySelectionInputs(testUnit.inputs, update, editor);
      expect(sanitizeHTML(container.innerHTML)).toBe(testUnit.result);
    });
  });
});
