---
id: 'lexical_react_LexicalComposer'
title: '模組：@lexical/react/LexicalComposer'
custom_edit_url: null
---

## 類型別名

### InitialConfigType

Ƭ **InitialConfigType**: `Readonly`\<\{ `editable?`: `boolean` ; `editorState?`: [`InitialEditorStateType`](lexical_react_LexicalComposer.md#initialeditorstatetype) ; `html?`: [`HTMLConfig`](lexical.md#htmlconfig) ; `namespace`: `string` ; `nodes?`: `ReadonlyArray`\<[`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\> \| [`LexicalNodeReplacement`](lexical.md#lexicalnodereplacement)\> ; `onError`: (`error`: `Error`, `editor`: [`LexicalEditor`](../classes/lexical.LexicalEditor.md)) => `void` ; `theme?`: [`EditorThemeClasses`](lexical.md#editorthemeclasses) }\>

#### 定義於

[packages/lexical-react/src/LexicalComposer.tsx:41](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposer.tsx#L41)

---

### InitialEditorStateType

Ƭ **InitialEditorStateType**: `null` \| `string` \| [`EditorState`](../classes/lexical.EditorState.md) \| (`editor`: [`LexicalEditor`](../classes/lexical.LexicalEditor.md)) => `void`

#### 定義於

[packages/lexical-react/src/LexicalComposer.tsx:35](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposer.tsx#L35)

## 函式

### LexicalComposer

▸ **LexicalComposer**(`«destructured»`): `JSX.Element`

#### 參數

| 名稱             | 類型    |
| :--------------- | :------ |
| `«destructured»` | `Props` |

#### 回傳

`JSX.Element`

#### 定義於

[packages/lexical-react/src/LexicalComposer.tsx:55](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalComposer.tsx#L55)
