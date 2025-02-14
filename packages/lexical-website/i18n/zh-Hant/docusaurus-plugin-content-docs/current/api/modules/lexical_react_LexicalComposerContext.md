---
id: 'lexical_react_LexicalComposerContext'
title: '模組：@lexical/react/LexicalComposerContext'
custom_edit_url: null
---

## 類型別名

### LexicalComposerContextType

Ƭ **LexicalComposerContextType**: `Object`

#### 類型宣告

| 名稱       | 類型                                                                                 |
| :--------- | :----------------------------------------------------------------------------------- |
| `getTheme` | () => [`EditorThemeClasses`](lexical.md#editorthemeclasses) \| `null` \| `undefined` |

#### 定義於

[packages/lexical-react/src/LexicalComposerContext.ts:14](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposerContext.ts#L14)

---

### LexicalComposerContextWithEditor

Ƭ **LexicalComposerContextWithEditor**: [[`LexicalEditor`](../classes/lexical.LexicalEditor.md), [`LexicalComposerContextType`](lexical_react_LexicalComposerContext.md#lexicalcomposercontexttype)]

#### 定義於

[packages/lexical-react/src/LexicalComposerContext.ts:18](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposerContext.ts#L18)

## 變數

### LexicalComposerContext

• `Const` **LexicalComposerContext**: `React.Context`\<[`LexicalComposerContextWithEditor`](lexical_react_LexicalComposerContext.md#lexicalcomposercontextwitheditor) \| `null` \| `undefined`\>

#### 定義於

[packages/lexical-react/src/LexicalComposerContext.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposerContext.ts#L23)

## 函式

### createLexicalComposerContext

▸ **createLexicalComposerContext**(`parent`, `theme`): [`LexicalComposerContextType`](lexical_react_LexicalComposerContext.md#lexicalcomposercontexttype)

#### 參數

| 名稱     | 類型                                                                                                                                    |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `parent` | `undefined` \| `null` \| [`LexicalComposerContextWithEditor`](lexical_react_LexicalComposerContext.md#lexicalcomposercontextwitheditor) |
| `theme`  | `undefined` \| `null` \| [`EditorThemeClasses`](lexical.md#editorthemeclasses)                                                          |

#### 回傳

[`LexicalComposerContextType`](lexical_react_LexicalComposerContext.md#lexicalcomposercontexttype)

#### 定義於

[packages/lexical-react/src/LexicalComposerContext.ts:29](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposerContext.ts#L29)

---

### useLexicalComposerContext

▸ **useLexicalComposerContext**(): [`LexicalComposerContextWithEditor`](lexical_react_LexicalComposerContext.md#lexicalcomposercontextwitheditor)

#### 回傳

[`LexicalComposerContextWithEditor`](lexical_react_LexicalComposerContext.md#lexicalcomposercontextwitheditor)

#### 定義於

[packages/lexical-react/src/LexicalComposerContext.ts:52](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposerContext.ts#L52)
