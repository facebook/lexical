---
id: 'lexical_react_LexicalEditorRefPlugin'
title: '模組：@lexical/react/LexicalEditorRefPlugin'
custom_edit_url: null
---

## 函式

### EditorRefPlugin

▸ **EditorRefPlugin**(`«destructured»`): `null`

使用此插件可以在 `LexicalComposer` 之外訪問編輯器實例。這對於需要更新或讀取 `EditorState` 但必須位於 `LexicalComposer` 之外的按鈕或其他 UI 元件來說非常有用。

#### 參數

| 名稱             | 類型                                                                                                                                                                                              |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `«destructured»` | `Object`                                                                                                                                                                                          |
| › `editorRef`    | (`instance`: `null` \| [`LexicalEditor`](../classes/lexical.LexicalEditor.md)) => `void` \| `MutableRefObject`\<`undefined` \| `null` \| [`LexicalEditor`](../classes/lexical.LexicalEditor.md)\> |

#### 回傳

`null`

#### 定義於

[packages/lexical-react/src/LexicalEditorRefPlugin.tsx:21](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalEditorRefPlugin.tsx#L21)
