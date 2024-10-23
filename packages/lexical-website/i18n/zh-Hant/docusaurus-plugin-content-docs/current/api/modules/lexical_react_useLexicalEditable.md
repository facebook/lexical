---
id: 'lexical_react_useLexicalEditable'
title: '模組: @lexical/react/useLexicalEditable'
custom_edit_url: null
---

## 參考

### useLexicalEditable

重新匯出 [useLexicalEditable](lexical_react_useLexicalEditable.md#uselexicaleditable-1)

## 函數

### useLexicalEditable

▸ **useLexicalEditable**(): `boolean`

使用 [useLexicalSubscription](lexical_react_useLexicalSubscription.md#uselexicalsubscription-1) 獲取 [LexicalEditor.isEditable](../classes/lexical.LexicalEditor.md#iseditable) 的當前值。
建議使用這個方法來觀察值，而不是手動使用 [LexicalEditor.registerEditableListener](../classes/lexical.LexicalEditor.md#registereditablelistener)，因為手動觀察值在使用 React StrictMode（開發的預設模式）或並發時可能會有點複雜。

#### 返回

`boolean`

#### 定義於

[packages/lexical-react/src/useLexicalEditable.ts:31](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/useLexicalEditable.ts#L31)
