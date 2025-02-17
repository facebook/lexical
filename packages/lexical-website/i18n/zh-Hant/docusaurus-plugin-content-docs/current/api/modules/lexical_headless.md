---
id: 'lexical_headless'
title: '模組: @lexical/headless'
custom_edit_url: null
---

## 函數

### createHeadlessEditor

▸ **createHeadlessEditor**(`editorConfig?`): [`LexicalEditor`](../classes/lexical.LexicalEditor.md)

生成一個無頭編輯器，允許在沒有 DOM 的情況下使用 Lexical，例如在 Node.js 環境中。當使用不支援的方法時會拋出錯誤。

#### 參數

| 名稱            | 類型                                              | 描述                        |
| :-------------- | :------------------------------------------------ | :-------------------------- |
| `editorConfig?` | [`CreateEditorArgs`](lexical.md#createeditorargs) | 可選的 Lexical 編輯器配置。 |

#### 返回

[`LexicalEditor`](../classes/lexical.LexicalEditor.md)

- 配置好的無頭編輯器。

#### 定義於

[packages/lexical-headless/src/index.ts:19](https://github.com/facebook/lexical/tree/main/packages/lexical-headless/src/index.ts#L19)
