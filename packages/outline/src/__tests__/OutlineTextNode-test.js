import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_CODE,
  IS_LINK,
  IS_HASHTAG,
  FORMAT_BOLD,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
  FORMAT_UNDERLINE,
  FORMAT_CODE,
  FORMAT_LINK,
  FORMAT_HASHTAG,
  HAS_DIRECTION,
} from '../OutlineConstants';

let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;
let ParagraphNode;

describe('OutlineTextNode tests', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactTestUtils = require('react-dom/test-utils');
    Outline = require('outline');
    ParagraphNode = require('outline-extensions/ParagraphNode');

    container = document.createElement('div');
    document.body.appendChild(container);
    init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  function update(callback) {
    editor.update(callback, undefined, true);
  }

  function useOutlineEditor(editorElementRef) {
    const editor = React.useMemo(() => Outline.createEditor(), []);

    React.useEffect(() => {
      const editorElement = editorElementRef.current;

      editor.setEditorElement(editorElement);
    }, [editorElementRef, editor]);

    return editor;
  }

  let editor = null;

  function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    update((view) => {
      const paragraph = ParagraphNode.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  describe.each([
    [FORMAT_BOLD, IS_BOLD],
    [FORMAT_ITALIC, IS_ITALIC],
    [FORMAT_STRIKETHROUGH, IS_STRIKETHROUGH],
    [FORMAT_UNDERLINE, IS_UNDERLINE],
    [FORMAT_CODE, IS_CODE],
    [FORMAT_LINK, IS_LINK],
    [FORMAT_HASHTAG, IS_HASHTAG],
  ])('getTextNodeFormatFlags(%i)', (formatFlag, stateFlag) => {
    test(`getTextNodeFormatFlags(${formatFlag})`, () => {
      update((view) => {
        const root = view.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        const newFlags = textNode.getTextNodeFormatFlags(formatFlag, null);
        expect(newFlags).toBe(stateFlag | HAS_DIRECTION);

        textNode.setFlags(newFlags);
        const newFlags2 = textNode.getTextNodeFormatFlags(formatFlag, null);
        expect(newFlags2).toBe(HAS_DIRECTION);
      });
    });
  });
});
