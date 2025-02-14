---
id: 'lexical_html'
title: '模組: @lexical/html'
custom_edit_url: null
---

## 函數

### $generateHtmlFromNodes

▸ **$generateHtmlFromNodes**(`editor`, `selection?`): `string`

#### 參數

| 名稱         | 類型                                                                |
| :----------- | :------------------------------------------------------------------ |
| `editor`     | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)              |
| `selection?` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 返回

`string`

#### 定義於

[packages/lexical-html/src/index.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical-html/src/index.ts#L66)

---

### $generateNodesFromDOM

▸ **$generateNodesFromDOM**(`editor`, `dom`): [`LexicalNode`](../classes/lexical.LexicalNode.md)[]

如何解析你的 HTML 字串以獲取文檔由你自行決定。在瀏覽器中，你可以使用原生的 DOMParser API 生成文檔（參見 clipboard.ts），但在無頭環境中，你可以使用 JSDom 或等效的庫並將文檔傳入此處。

#### 參數

| 名稱     | 類型                                                   |
| :------- | :----------------------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `dom`    | `Document`                                             |

#### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)[]

#### 定義於

[packages/lexical-html/src/index.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical-html/src/index.ts#L40)
