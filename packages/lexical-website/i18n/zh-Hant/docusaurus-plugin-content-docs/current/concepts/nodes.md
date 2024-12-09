# 節點 (Nodes)

## 基本節點 (Base Nodes)

節點是 Lexical 中的核心概念。它們不僅構成了視覺編輯器視圖，作為 `EditorState` 的一部分，也代表了在編輯器中隨時存儲的底層數據模型。Lexical 有一個單一的核心基礎節點，稱為 `LexicalNode`，在內部擴展後創建了 Lexical 的五個基本節點：

- `RootNode`
- `LineBreakNode`
- `ElementNode`
- `TextNode`
- `DecoratorNode`

這些節點中，有三個從 `lexical` 套件中暴露出來，非常適合進行擴展：

- `ElementNode`
- `TextNode`
- `DecoratorNode`

### [`RootNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalRootNode.ts)

在 `EditorState` 中只會存在一個 `RootNode`，它總是位於頂部，代表 `contenteditable` 本身。這意味著 `RootNode` 沒有父節點或兄弟節點。

- 要獲取整個編輯器的文本內容，您應該使用 `rootNode.getTextContent()`。
- 為避免選擇問題，Lexical 禁止直接將文本節點插入 `RootNode`。

### [`LineBreakNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts)

您的文本節點中不應該有 `'\n'`，相反，您應該使用代表 `'\n'` 的 `LineBreakNode`，更重要的是，它可以在瀏覽器和操作系統之間一致地工作。

### [`ElementNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalElementNode.ts)

作為其他節點的父節點，可以是塊級節點（如 `ParagraphNode`、`HeadingNode`）或行內節點（如 `LinkNode`）。具有多種定義其行為的方法，這些方法可以在擴展過程中覆寫（如 `isInline`、`canBeEmpty`、`canInsertTextBefore` 等）。

### [`TextNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalTextNode.ts)

包含文本的葉子節點。它還包含一些特定於文本的屬性：

- `format` 可以是 `bold`、`italic`、`underline`、`strikethrough`、`code`、`subscript` 和 `superscript` 的任意組合
- `mode`
  - `token` - 作為不可變節點，無法更改其內容並且一次性刪除
  - `segmented` - 其內容按段刪除（一次一個單詞），可編輯，但節點一旦更新內容就會變為非分段
- `style` 可用於將內聯 CSS 樣式應用於文本

### [`DecoratorNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts)

包裝節點，用於在編輯器中插入任意視圖（組件）。裝飾節點的渲染與框架無關，可以輸出來自 React、原生 JS 或其他框架的組件。

## 節點屬性 (Node Properties)

Lexical 節點可以具有屬性。這些屬性也需要是 JSON 可序列化的，因此您永遠不應該為節點分配函數、Symbol、Map、Set 或具有與內建原型不同的對象作為屬性。`null`、`undefined`、`number`、`string`、`boolean`、`{}` 和 `[]` 都是可以分配給節點的屬性類型。

按照慣例，我們將屬性前綴 `__`（雙下劃線），以明確這些屬性是私有的，應避免直接訪問。我們選擇 `__` 而不是 `_`，是因為一些構建工具會混淆和最小化單個 `_` 前綴的屬性以改善代碼大小。然而，如果您希望在構建之外擴展節點，這樣的做法會失效。

如果您正在添加一個預期可修改或可訪問的屬性，那麼您應該為這個屬性創建一組 `get*()` 和 `set*()` 方法。在這些方法內，您需要調用一些非常重要的方法，以確保與 Lexical 的內部不可變系統保持一致。這些方法是 `getWritable()` 和 `getLatest()`。

```js
import type {NodeKey} from 'lexical';

class MyCustomNode extends SomeOtherNode {
  __foo: string;

  constructor(foo: string, key?: NodeKey) {
    super(key);
    this.__foo = foo;
  }

  setFoo(foo: string) {
    // getWritable() 在需要時創建節點的克隆，以確保我們不會嘗試更改這個節點的過期版本。
    const self = this.getWritable();
    self.__foo = foo;
  }

  getFoo(): string {
    // getLatest() 確保我們獲取到的是來自 EditorState 的最新值。
    const self = this.getLatest();
    return self.__foo;
  }
}
```

最後，所有節點都應該有一個 `static getType()` 方法和一個 `static clone()` 方法。Lexical 使用這種類型來在反序列化期間（對於複製和粘貼很重要）能夠將節點重新構造回其相關的類原型。Lexical 使用克隆來確保創建新 `EditorState` 快照的一致性。

擴展上面示例中的這些方法：

```js
class MyCustomNode extends SomeOtherNode {
  __foo: string;

  static getType(): string {
    return 'custom-node';
  }

  static clone(node: MyCustomNode): MyCustomNode {
    // 如果需要在構造後設置任何狀態，應通過覆蓋 `afterCloneFrom` 實例方法來完成。
    return new MyCustomNode(node.__foo, node.__key);
  }

  constructor(foo: string, key?: NodeKey) {
    super(key);
    this.__foo = foo;
  }

  setFoo(foo: string) {
    // getWritable() 在需要時創建節點的克隆，以確保我們不會嘗試更改這個節點的過期版本。
    const self = this.getWritable();
    self.__foo = foo;
  }

  getFoo(): string {
    // getLatest() 確保我們獲取到的是來自 EditorState 的最新值。
    const self = this.getLatest();
    return self.__foo;
  }
}
```

## 創建自定義節點 (Creating Custom Nodes)

如上所述，Lexical 暴露了三個可以擴展的基本節點。

> 您知道嗎？像 `ElementNode` 這樣的節點已經在 Lexical 核心中擴展，如 `ParagraphNode` 和 `RootNode`！

### 擴展 `ElementNode`

以下是擴展 `ElementNode` 的示例：

```js
import {ElementNode, LexicalNode} from 'lexical';

export class CustomParagraph extends ElementNode {
  static getType(): string {
    return 'custom-paragraph';
  }

  static clone(node: CustomParagraph): CustomParagraph {
    return new CustomParagraph(node.__key);
  }

  createDOM(): HTMLElement {
    // 在這裡定義 DOM 元素
    const dom = document.createElement('p');
    return dom;
  }

  updateDOM(prevNode: CustomParagraph, dom: HTMLElement): boolean {
    // 返回 false 告訴 Lexical 這個節點不需要用來自 createDOM 的新副本替換其 DOM 元素。
    return false;
  }
}
```

為了讓其他人能夠輕鬆使用和驗證您的自定義節點，提供一些 `$` 前綴的實用程序函數也是一個好的做法。以下是您可能為上述示例執行此操作的方法：

```js
export function $createCustomParagraphNode(): CustomParagraph {
  return new CustomParagraph();
}

export function $isCustomParagraphNode(node: LexicalNode | null | undefined): node is CustomParagraph  {
  return node instanceof CustomParagraph;
}
```

### 擴展 `TextNode`

```js
export class ColoredNode extends TextNode {
  __color: string;

  constructor(text: string, color: string, key?: NodeKey): void {
    super(text, key);
    this.__color = color;
  }

  static getType(): string {
    return 'colored';
  }

  static clone(node: ColoredNode): ColoredNode {
    return new ColoredNode(node.__text,

 node.__color, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.color = this.__color;
    return element;
  }

  updateDOM(
    prevNode: ColoredNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__color !== this.__color) {
      dom.style.color = this.__color;
    }
    return isUpdated;
  }
}

export function $createColoredNode(text: string, color: string): ColoredNode {
  return new ColoredNode(text, color);
}

export function $isColoredNode(node: LexicalNode | null | undefined): node is ColoredNode {
  return node instanceof ColoredNode;
}
```

### 擴展 `DecoratorNode`

```ts
export class VideoNode extends DecoratorNode<ReactNode> {
  __id: string;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(node.__id, node.__key);
  }

  constructor(id: string, key?: NodeKey) {
    super(key);
    this.__id = id;
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactNode {
    return <VideoPlayer videoID={this.__id} />;
  }
}

export function $createVideoNode(id: string): VideoNode {
  return new VideoNode(id);
}

export function $isVideoNode(
  node: LexicalNode | null | undefined,
): node is VideoNode {
  return node instanceof VideoNode;
}
```

使用 `useDecorators`、`PlainTextPlugin` 和 `RichTextPlugin` 為每個 `DecoratorNode` 執行 `React.createPortal(reactDecorator, element)`，其中 `reactDecorator` 是 `DecoratorNode.prototype.decorate` 返回的內容，而 `element` 是 `DecoratorNode.prototype.createDOM` 返回的 `HTMLElement`。
