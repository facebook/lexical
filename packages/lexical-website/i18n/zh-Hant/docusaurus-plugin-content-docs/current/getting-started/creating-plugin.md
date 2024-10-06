---
sidebar_position: 15
---

# 創建插件

本頁面介紹如何創建 Lexical 插件，與任何框架或庫無關。對於那些尚未熟悉 Lexical 的人，建議先查看 [快速開始 (Vanilla JS) 頁面](/docs/getting-started/quick-start)。

Lexical 與許多其他框架不同，並未為其插件定義任何特定的介面。插件在最簡單的形式下是一個接受 `LexicalEditor` 實例並返回清理函數的函數。通過訪問 `LexicalEditor`，插件可以通過 [Commands](/docs/concepts/commands)、[Transforms](/docs/concepts/transforms)、[Nodes](/docs/concepts/nodes) 或其他 API 擴展編輯器。

在本指南中，我們將創建一個插件，將表情符號（`:)`、`:P` 等）替換為實際的表情符號（使用 [Node Transforms](/docs/concepts/transforms)），並使用自己的圖形來渲染表情符號，通過創建我們自己的自定義節點來擴展 [TextNode](/docs/concepts/nodes#textnode)。

<figure class="text--center">
 <img src="/img/docs/lexical-emoji-plugin-design.drawio.svg" alt="概念視圖"/>
</figure>

## 前提條件

我們假設你已經實現了（參見提供的代碼中的 `findEmoji.ts`）一個函數，該函數允許你在文本中找到表情符號短碼（表情符號）並返回它們的位置以及其他一些信息：

```typescript
// findEmoji.ts
export type EmojiMatch = Readonly<{
  position: number;
  shortcode: string;
  unifiedID: string;
}>;

export default function findEmoji(text: string): EmojiMatch | null;
```

## 創建自己的 `LexicalNode`

Lexical 作為一個框架提供了兩種方式來自定義其內容的外觀：

- 通過擴展基本節點之一：
  - [`ElementNode`](/docs/concepts/nodes#elementnode) – 用作其他節點的父節點，可以是區塊級或內聯級。
  - [`TextNode`](/docs/concepts/nodes#textnode) - 節點的葉子類型（_因此它不能有子元素_）包含文本。
  - [`DecoratorNode`](/docs/concepts/nodes#decoratornode) - 用於在編輯器內插入任意視圖（組件）。
- 通過 [Node Overrides](/docs/concepts/node-replacement) – 如果你想增強內建節點的行為（如 `ParagraphNode`），這非常有用。

由於我們的情況不預期 `EmojiNode` 會有任何子節點，也不打算插入任意組件，因此最適合我們的是使用 [`TextNode`](/docs/concepts/nodes#textnode) 擴展。

```typescript
export class EmojiNode extends TextNode {
  __unifiedID: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__unifiedID, node.__key);
  }

  constructor(unifiedID: string, key?: NodeKey) {
    const unicodeEmoji = /*...*/;
    super(unicodeEmoji, key);

    this.__unifiedID = unifiedID.toLowerCase();
  }

  /**
  * DOM 將由瀏覽器在 contenteditable 中渲染
  * 這是 Lexical 渲染的內容
  */
  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'emoji-node';
    dom.style.backgroundImage = `url('${BASE_EMOJI_URI}/${this.__unifiedID}.png')`;
    dom.innerText = this.__text;

    return dom;
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    return $createEmojiNode(serializedNode.unifiedID);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      type: 'emoji',
      unifiedID: this.__unifiedID,
    };
  }
}
```

上面的例子表示了擴展 [`TextNode`](/docs/concepts/nodes#textnode) 的自定義節點的絕對最小設置。讓我們來看看這裡的關鍵元素：

- `constructor(...)` + 類屬性 – 允許我們在運行時在節點中存儲自定義數據以及接受自定義參數。
- `getType()` 和 `clone(...)` – 這些方法允許 Lexical 正確識別節點類型以及正確克隆它，因為我們可能希望自定義克隆行為。
- `importJSON(...)` 和 `exportJSON()` – 定義了我們的數據如何被序列化/反序列化到 Lexical 狀態中。在這裡你定義了節點在狀態中的表示。
- `createDOM(...)` – 定義了將由 Lexical 渲染的 DOM。

## 創建節點變換

[Transforms](/docs/concepts/transforms) 允許有效地響應對 `EditorState` 的變化，以及用戶輸入。它們的效率來自於變換在 DOM 和解操作之前執行（這是 Lexical 生命週期中最昂貴的操作）。

此外，需要提到的是，[Lexical Node Transforms](/docs/concepts/transforms) 足夠智能，讓你不必考慮變換中所做的修改的任何副作用或與其他變換監聽器的相互依賴。經驗法則是，在特定變換中對節點所做的更改將觸發其他變換的重新運行，直到對 `EditorState` 沒有更多的更改。詳細了解請參見 [Transform heuristic](/docs/concepts/transforms#transform-heuristic)。

在我們的例子中，我們有一個簡單的變換，它執行以下業務邏輯：

1. 嘗試變換 `TextNode`。它將在 `TextNode` 的任何更改上運行。
2. 檢查 `TextNode` 中的文本是否包含表情符號短碼（表情符號）。如果沒有則跳過。
3. 根據短碼在文本中的位置，將 `TextNode` 分割成 2 或 3 部分，以便目標表情符號短碼有自己的專用 `TextNode`。
4. 用 `EmojiNode` 替換表情符號短碼 `TextNode`。

```typescript
import {LexicalEditor, TextNode} from 'lexical';

import {$createEmojiNode} from './EmojiNode';
import findEmoji from './findEmoji';

function textNodeTransform(node: TextNode): void {
  if (!node.isSimpleText() || node.hasFormat('code')) {
    return;
  }

  const text = node.getTextContent();

  // 只找第一個出現的短碼，因為變換將重新運行其餘部分
  // 因為新插入的節點被認為是髒的
  const emojiMatch = findEmoji(text);
  if (emojiMatch === null) {
    return;
  }

  let targetNode;
  if (emojiMatch.position === 0) {
    // 字符串中的第一個文本塊，分割成 2 部分
    [targetNode] = node.splitText(
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  } else {
    // 字符串中的中間部分
    [, targetNode] = node.splitText(
      emojiMatch.position,
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  }

  const emojiNode = $createEmojiNode(emojiMatch.unifiedID);
  targetNode.replace(emojiNode);
}

export function registerEmoji(editor: LexicalEditor): () => void {
  // 我們不在這裡使用 editor.registerUpdateListener，因為依賴於更新監聽器的替代方法是高度不建議的，因為它會觸發額外的渲染（最昂貴的生命週期操作）。
  return editor.registerNodeTransform(TextNode, textNodeTransform);
}
```

## 將所有內容組合在一起

最後，我們通過在編輯器配置中註冊 `EmojiNode` 並執行 `registerEmoji(editor)` 插件引導函數來配置 Lexical 實例。為了簡化起見，我們假設插件自行處理 CSS 和靜態資源的分發（如果有的話），Lexical 不會強制執行任何規則。

參考 [快速開始 (Vanilla JS) 範例](/docs/getting-started/quick-start#putting-it-together) 來填補這段偽代碼中的空白。

```typescript
import {createEditor} from 'lexical';
import {mergeRegister} from '@lexical/utils';
/* ... */

import {EmojiNode} from './emoji-plugin/EmojiNode';
import {registerEmoji} from './emoji-plugin/EmojiPlugin';

const initialConfig = {
  /* ... */
  // 註冊我們新創建的節點
  nodes: [EmojiNode /* ... */],
};

const editor = createEditor(config);

const editorRef = document.getElementById('lexical-editor');
editor.setRootElement(editorRef);

// 註冊插件
mergeRegister(
  /* ... */
  registerEmoji(editor), // 我們的插件
);
```

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js-plugin?embed=1&file=src%2Femoji-plugin%2FEmojiPlugin.ts&terminalHeight=1&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>
