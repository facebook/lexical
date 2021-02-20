import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_CODE,
  IS_LINK,
  IS_HASHTAG,
  IS_OVERFLOWED,
} from '../OutlineConstants';

let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;
let ParagraphNodeModule;

describe('OutlineTextNode tests', () => {
  beforeEach(async () => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactTestUtils = require('react-dom/test-utils');
    Outline = require('outline');
    ParagraphNodeModule = require('outline-extensions/ParagraphNode');

    container = document.createElement('div');
    document.body.appendChild(container);
    await init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
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

  async function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    await update((view) => {
      const paragraph = ParagraphNodeModule.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  test('getTextContent()', async () => {
    await update(() => {
      const textNode = Outline.createTextNode('My new text node');

      expect(textNode.getTextContent()).toBe('My new text node');
    });
  });

  test('getTextContent() (inert)', async () => {
    await update(() => {
      const textNode = Outline.createTextNode('My inert text node');
      textNode.makeInert();

      expect(textNode.getTextContent()).toBe('');
      expect(textNode.getTextContent(true)).toBe('My inert text node');
    });
  });

  describe.each([
    ['bold', IS_BOLD, (node) => node.isBold()],
    ['italic', IS_ITALIC, (node) => node.isItalic()],
    ['strikethrough', IS_STRIKETHROUGH, (node) => node.isStrikethrough()],
    ['underline', IS_UNDERLINE, (node) => node.isUnderline()],
    ['code', IS_CODE, (node) => node.isCode()],
    ['link', IS_LINK, (node) => node.isLink()],
    ['hashtag', IS_HASHTAG, (node) => node.isHashtag()],
    ['overflowed', IS_OVERFLOWED, (node) => node.isOverflowed()],
  ])('%s flag', (formatFlag, stateFlag, flagPredicate) => {
    test(`getTextNodeFormatFlags(${formatFlag})`, async () => {
      await update((view) => {
        const root = view.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        const newFlags = textNode.getTextNodeFormatFlags(formatFlag, null);
        expect(newFlags).toBe(stateFlag);

        textNode.setFlags(newFlags);
        const newFlags2 = textNode.getTextNodeFormatFlags(formatFlag, null);
        expect(newFlags2).toBe(0);
      });
    });

    test(`flagPredicate for ${formatFlag}`, async () => {
      await update((view) => {
        const root = view.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        textNode.setFlags(stateFlag);
        expect(flagPredicate(textNode)).toBe(true);
      });
    });
  });
});
