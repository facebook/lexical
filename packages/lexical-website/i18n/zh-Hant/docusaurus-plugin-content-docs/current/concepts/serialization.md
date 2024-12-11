# 序列化與反序列化

內部而言，Lexical 會在記憶體中維護給定編輯器的狀態，並根據使用者的輸入進行更新。有時，將這個狀態轉換為序列化格式以便於在編輯器之間傳輸或存儲以便於後續檢索是很有用的。為了簡化這個過程，Lexical 提供了一些 API，允許節點指定它們應如何在常見的序列化格式中表示。

## HTML

目前，HTML 序列化主要用於通過 [`@lexical/clipboard`](https://github.com/facebook/lexical/blob/main/packages/lexical-clipboard/README.md) 的複製與粘貼功能在 Lexical 和非 Lexical 編輯器（例如 Google Docs 或 Quip）之間傳輸數據，但我們也提供了將 `Lexical` -> `HTML` 和 `HTML` -> `Lexical` 的通用工具，位於我們的 [`@lexical/html`](https://github.com/facebook/lexical/blob/main/packages/lexical-html/README.md) 包中。

### Lexical -> HTML

當從編輯器生成 HTML 時，可以傳遞選擇對象以縮小到某個區域，或傳遞 `null` 以轉換整個編輯器。

```js
import {$generateHtmlFromNodes} from '@lexical/html';

const htmlString = $generateHtmlFromNodes(editor, selection | null);
```

#### `LexicalNode.exportDOM()`

可以通過添加 `exportDOM()` 方法來控制 `LexicalNode` 以 HTML 表示的方式。

```js
exportDOM(editor: LexicalEditor): DOMExportOutput
```

在將編輯器狀態轉換為 HTML 時，我們會遍歷當前的編輯器狀態（或其所選擇的子集），並調用每個節點的 `exportDOM` 方法，以將其轉換為 `HTMLElement`。

有時，在節點被轉換為 HTML 後，進行一些後處理是必要或有用的。為此，我們在 `DOMExportOutput` 上暴露了「after」API，允許 `exportDOM` 指定在轉換為 `HTMLElement` 後應運行的函數。

```js
export type DOMExportOutput = {
  after?: (generatedElement: ?HTMLElement) => ?HTMLElement,
  element?: HTMLElement | null,
};
```

如果 `exportDOM` 的返回值中的 `element` 屬性為 `null`，則該節點不會在序列化輸出中表示。

### HTML -> Lexical

```js
import {$generateNodesFromDOM} from '@lexical/html';

editor.update(() => {
  // 在瀏覽器中，您可以使用原生 DOMParser API 解析 HTML 字串。
  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlString, textHtmlMimeType);

  // 一旦擁有 DOM 實例，生成 LexicalNodes 就變得容易了。
  const nodes = $generateNodesFromDOM(editor, dom);

  // 選擇根節點
  $getRoot().select();

  // 在選擇位置插入它們。
  $insertNodes(nodes);
});
```

如果您在無頭模式下運行，可以使用 JSDOM 進行處理：

```js
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';

// 一旦從 HTML 生成了 LexicalNodes，您現在可以使用解析的節點初始化編輯器實例。
const editorNodes = []; // 您在編輯器上註冊的任何自定義節點
const editor = createHeadlessEditor({...config, nodes: editorNodes});

editor.update(() => {
  // 在無頭環境中，您可以使用如 JSDom 的套件來解析 HTML 字串。
  const dom = new JSDOM(htmlString);

  // 一旦擁有 DOM 實例，生成 LexicalNodes 就變得容易了。
  const nodes = $generateNodesFromDOM(editor, dom.window.document);

  // 選擇根節點
  $getRoot().select();

  // 在選擇位置插入它們。
  const selection = $getSelection();
  selection.insertNodes(nodes);
});
```

:::tip

請記住，狀態更新是異步的，因此緊接著執行 `editor.getEditorState()` 可能不會返回預期的內容。為了避免這種情況，請 [在 `editor.update` 方法中傳遞 `discrete: true`](https://dio.la/article/lexical-state-updates#discrete-updates)。

:::

#### `LexicalNode.importDOM()`

您可以通過向 `LexicalNode` 添加 `importDOM()` 方法來控制 `HTMLElement` 在 `Lexical` 中的表示方式。

```js
static importDOM(): DOMConversionMap | null;
```

`importDOM` 的返回值是將小寫（DOM）[Node.nodeName](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeName) 屬性映射到一個對象的映射，該對象指定了轉換函數和該轉換的優先級。這使得 `LexicalNodes` 可以指定它們可以轉換哪種類型的 DOM 節點以及它們轉換的相對優先級。在需要將具有特定屬性的 DOM 節點解釋為一種類型的 `LexicalNode`，而其他情況下應表示為另一種類型的 `LexicalNode` 時，這是有用的。

```ts
type DOMConversionMap = Record<
  string,
  (node: HTMLElement) => DOMConversion | null
>;

type DOMConversion = {
  conversion: DOMConversionFn;
  priority: 0 | 1 | 2 | 3 | 4;
};

type DOMConversionFn = (element: HTMLElement) => DOMConversionOutput | null;

type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: null | LexicalNode | Array<LexicalNode>;
};

type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined;
```

`@lexical/code` 提供了這種設計有用性的良好示例。GitHub 使用 HTML `<table>` 元素來表示複製代碼的結構。如果我們將所有 HTML `<table>` 元素解釋為字面上的表格，那麼從 GitHub 粘貼的代碼會在 Lexical 中顯示為 Lexical TableNode。相反，CodeNode 指定它也可以處理 `<table>` 元素：

```js
class CodeNode extends ElementNode {
...
static importDOM(): DOMConversionMap | null {
  return {
    ...
    table: (node: Node) => {
      if (isGitHubCodeTable(node as HTMLTableElement)) {
        return {
          conversion: convertTableElement,
          priority: 3,
        };
      }
      return null;
    },
    ...
  };
}
...
}
```

如果導入的 `<table>` 與預期的 GitHub 代碼 HTML 不匹配，那麼我們返回 `null` 並允許該節點由低優先級的轉換處理。

與 `exportDOM` 類似，`importDOM` 提供了 API 以便於對轉換後的節點進行後處理。轉換函數返回 `DOMConversionOutput`，它可以指定在每個轉換後的子節點上運行的函數（`forChild`）或在所有子節點轉換完成後運行的函數（`after`）。主要區別在於，`forChild` 對當前節點的每個深層嵌套子節點運行，而 `after` 只會在節點及其所有子節點的轉換完成後運行一次。

## JSON

### Lexical -> JSON

要從 `EditorState` 生成 JSON 快照，可以調用 `EditorState` 對象上的 `toJSON()` 方法。

```js
const editorState = editor.getEditorState();
const json = editorState.toJSON();
```

或者，如果您嘗試生成 `EditorState` 的字串版本，則可以直接使用 `JSON.stringify`：

```js
const editorState = editor.getEditorState();
const jsonString = JSON.stringify(editorState);
```

#### `LexicalNode.exportJSON()`

您可以通過添加 `exportJSON()` 方法來控制 `LexicalNode` 如何以 JSON 表示。確保您的序列化 JSON 節點具有 `type` 欄位和 `children` 欄位（如果是 `ElementNode`）。

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

exportJSON(): SerializedLexicalNode
```

在將編輯器狀態轉換為 JSON 時

，我們會遍歷當前的編輯器狀態，並對每個節點調用 `exportJSON` 方法，以將其轉換為 `SerializedLexicalNode` 對象，該對象表示給定節點的 JSON 對象。Lexical 的內建節點已經定義了 JSON 表示，但您需要為自定義節點定義 JSON 表示。

以下是 `HeadingNode` 的 `exportJSON` 示例：

```js
export type SerializedHeadingNode = Spread<
  {
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  },
  SerializedElementNode
>;

exportJSON(): SerializedHeadingNode {
  return {
    ...super.exportJSON(),
    tag: this.getTag(),
    type: 'heading',
    version: 1,
  };
}
```

#### `LexicalNode.importJSON()`

您可以通過添加 `importJSON()` 方法來控制如何將 JSON 反序列化為 `LexicalNode`。

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

importJSON(jsonNode: SerializedLexicalNode): LexicalNode
```

這個方法的工作方式與 `exportJSON` 相反。Lexical 使用 JSON 對象上的 `type` 欄位來確定需要映射到的 Lexical 節點類別，因此保持 `type` 欄位與 `LexicalNode` 的 `getType()` 一致是必須的。

以下是 `HeadingNode` 的 `importJSON` 示例：

```js
static importJSON(serializedNode: SerializedHeadingNode): HeadingNode {
  const node = $createHeadingNode(serializedNode.tag);
  node.setFormat(serializedNode.format);
  node.setIndent(serializedNode.indent);
  node.setDirection(serializedNode.direction);
  return node;
}
```

### 版本控制與破壞性變更

重要的是要注意，應避免對 JSON 對象中的現有欄位進行破壞性變更，特別是當向後兼容是編輯器的重要部分時。因此，我們建議使用版本欄位來區分自定義節點的不同變更。以下是 Lexical 基本 `TextNode` 類的序列化類型定義：

```js
import type {Spread} from 'lexical';

// Spread 是一種 TypeScript 工具，允許我們將屬性展開到基本的 SerializedLexicalNode 類型上。
export type SerializedTextNode = Spread<
  {
    detail: number,
    format: number,
    mode: TextModeType,
    style: string,
    text: string,
  },
  SerializedLexicalNode,
>;
```

如果我們想對上述的 `TextNode` 進行修改，我們應確保不要刪除或更改現有的屬性，因為這可能會導致數據損壞。相反，應選擇添加新功能作為新屬性欄位，並使用版本號來確定如何處理節點之間的差異。

```js
export type SerializedTextNodeV1 = Spread<
  {
    detail: number,
    format: number,
    mode: TextModeType,
    style: string,
    text: string,
  },
  SerializedLexicalNode,
>;

export type SerializedTextNodeV2 = Spread<
  {
    detail: number,
    format: number,
    mode: TextModeType,
    style: string,
    text: string,
    // 我們新增的欄位
    newField: string,
    // 注意版本現在是 2
    version: 2,
  },
  SerializedLexicalNode,
>;

export type SerializedTextNode = SerializedTextNodeV1 | SerializedTextNodeV2;
```

### 處理擴展的 HTML 樣式

由於 `TextNode` 是所有 Lexical 套件的基礎，包括純文本用例，因此處理任何豐富文本邏輯是不理想的。這需要覆蓋 `TextNode` 以處理 HTML/CSS 樣式屬性的序列化和反序列化，以實現 JSON 與 HTML 之間的完全保真。由於這是一個非常流行的用例，下面我們提供了一個處理最常見用例的範例。

您需要覆蓋基礎 `TextNode`：

```js
const initialConfig: InitialConfigType = {
  namespace: 'editor',
  theme: editorThemeClasses,
  onError: (error: any) => console.log(error),
  nodes: [
    ExtendedTextNode,
    {
      replace: TextNode,
      with: (node: TextNode) => new ExtendedTextNode(node.__text),
    },
    ListNode,
    ListItemNode,
  ],
};
```

並創建一個新的擴展文本節點插件

```js
import {
  $isTextNode,
  DOMConversion,
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
  TextNode,
  SerializedTextNode,
  LexicalNode
} from 'lexical';

export class ExtendedTextNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  static getType(): string {
    return 'extended-text';
  }

  static clone(node: ExtendedTextNode): ExtendedTextNode {
    return new ExtendedTextNode(node.__text, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    const importers = TextNode.importDOM();
    return {
      ...importers,
      code: () => ({
        conversion: patchStyleConversion(importers?.code),
        priority: 1
      }),
      em: () => ({
        conversion: patchStyleConversion(importers?.em),
        priority: 1
      }),
      span: () => ({
        conversion: patchStyleConversion(importers?.span),
        priority: 1
      }),
      strong: () => ({
        conversion: patchStyleConversion(importers?.strong),
        priority: 1
      }),
      sub: () => ({
        conversion: patchStyleConversion(importers?.sub),
        priority: 1
      }),
      sup: () => ({
        conversion: patchStyleConversion(importers?.sup),
        priority: 1
      }),
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    return TextNode.importJSON(serializedNode);
  }

  isSimpleText() {
    return this.__type === 'extended-text' && this.__mode === 0;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'extended-text',
      version: 1,
    }
  }
}

export function $createExtendedTextNode(text: string): ExtendedTextNode {
	return new ExtendedTextNode(text);
}

export function $isExtendedTextNode(node: LexicalNode | null | undefined): node is ExtendedTextNode {
	return node instanceof ExtendedTextNode;
}

function patchStyleConversion(
  originalDOMConverter?: (node: HTMLElement) => DOMConversion | null
): (node: HTMLElement) => DOMConversionOutput | null {
  return (node) => {
    const original = originalDOMConverter?.(node);
    if (!original) {
      return null;
    }
    const originalOutput = original.conversion(node);

    if (!originalOutput) {
      return originalOutput;
    }

    const backgroundColor = node.style.backgroundColor;
    const color = node.style.color;
    const fontFamily = node.style.fontFamily;
    const fontWeight = node.style.fontWeight;
    const fontSize = node.style.fontSize;
    const textDecoration = node.style.textDecoration;

    return {
      ...originalOutput,
      forChild: (lexicalNode, parent) => {
        const originalForChild = originalOutput?.forChild ?? ((x) => x);
        const result = originalForChild(lexicalNode, parent);
        if ($isTextNode(result)) {
          const style = [
            backgroundColor ? `background-color: ${backgroundColor}` : null,
            color ? `color: ${color}` : null,
            fontFamily ? `font-family: ${fontFamily}` : null,
            fontWeight ? `font-weight: ${fontWeight}` : null,
            fontSize ? `font-size: ${fontSize}` : null,
            textDecoration ? `text-decoration: ${textDecoration}` : null,
          ]
            .filter((value) => value != null)
            .join('; ');
          if (style.length) {
            return result.setStyle(style);
          }
        }
        return result;
      }
    };
  };
}
```
