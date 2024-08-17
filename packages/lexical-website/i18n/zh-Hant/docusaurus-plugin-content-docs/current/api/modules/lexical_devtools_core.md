---
id: 'lexical_devtools_core'
title: '模組: @lexical/devtools-core'
custom_edit_url: null
---

## 類型別名

### CustomPrintNodeFn

Ƭ **CustomPrintNodeFn**: (`node`: [`LexicalNode`](../classes/lexical.LexicalNode.md), `obfuscateText?`: `boolean`) => `string`

#### 類型宣告

▸ (`node`, `obfuscateText?`): `string`

##### 參數

| 名稱             | 類型                                               |
| :--------------- | :------------------------------------------------- |
| `node`           | [`LexicalNode`](../classes/lexical.LexicalNode.md) |
| `obfuscateText?` | `boolean`                                          |

##### 回傳

`string`

#### 定義於

[packages/lexical-devtools-core/src/generateContent.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical-devtools-core/src/generateContent.ts#L35)

---

### LexicalCommandLog

Ƭ **LexicalCommandLog**: `ReadonlyArray`\<\{ `index`: `number` } & [`LexicalCommand`](lexical.md#lexicalcommand)\<`unknown`\> & \{ `payload`: `unknown` }\>

#### 定義於

[packages/lexical-devtools-core/src/useLexicalCommandsLog.ts:14](https://github.com/facebook/lexical/tree/main/packages/lexical-devtools-core/src/useLexicalCommandsLog.ts#L14)

## 函數

### TreeView

▸ **TreeView**(`props`): `ReactNode`

#### 參數

| 名稱    | 類型                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `props` | \{ `editorState`: [`EditorState`](../classes/lexical.EditorState.md) ; `generateContent`: (`exportDOM`: `boolean`) => `Promise`\<`string`\> ; `setEditorReadOnly`: (`isReadonly`: `boolean`) => `void` ; `setEditorState`: (`state`: [`EditorState`](../classes/lexical.EditorState.md), `options?`: [`EditorSetOptions`](lexical.md#editorsetoptions)) => `void` ; `timeTravelButtonClassName`: `string` ; `timeTravelPanelButtonClassName`: `string` ; `timeTravelPanelClassName`: `string` ; `timeTravelPanelSliderClassName`: `string` ; `treeTypeButtonClassName`: `string` ; `viewClassName`: `string` } & `RefAttributes`\<`HTMLPreElement`\> |

#### 回傳

`ReactNode`

#### 定義於

[packages/lexical-devtools-core/src/TreeView.tsx:16](https://github.com/facebook/lexical/tree/main/packages/lexical-devtools-core/src/TreeView.tsx#L16)

---

### generateContent

▸ **generateContent**(`editor`, `commandsLog`, `exportDOM`, `customPrintNode?`, `obfuscateText?`): `string`

#### 參數

| 名稱               | 類型                                                              | 預設值      |
| :----------------- | :---------------------------------------------------------------- | :---------- |
| `editor`           | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)            | `undefined` |
| `commandsLog`      | [`LexicalCommandLog`](lexical_devtools_core.md#lexicalcommandlog) | `undefined` |
| `exportDOM`        | `boolean`                                                         | `undefined` |
| `customPrintNode?` | [`CustomPrintNodeFn`](lexical_devtools_core.md#customprintnodefn) | `undefined` |
| `obfuscateText`    | `boolean`                                                         | `false`     |

#### 回傳

`string`

#### 定義於

[packages/lexical-devtools-core/src/generateContent.ts:93](https://github.com/facebook/lexical/tree/main/packages/lexical-devtools-core/src/generateContent.ts#L93)

---

### registerLexicalCommandLogger

▸ **registerLexicalCommandLogger**(`editor`, `setLoggedCommands`): () => `void`

#### 參數

| 名稱                | 類型                                                                                                                                                                  |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor`            | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)                                                                                                                |
| `setLoggedCommands` | (`v`: (`oldValue`: [`LexicalCommandLog`](lexical_devtools_core.md#lexicalcommandlog)) => [`LexicalCommandLog`](lexical_devtools_core.md#lexicalcommandlog)) => `void` |

#### 回傳

`fn`

▸ (): `void`

##### 回傳

`void`

#### 定義於

[packages/lexical-devtools-core/src/useLexicalCommandsLog.ts:18](https://github.com/facebook/lexical/tree/main/packages/lexical-devtools-core/src/useLexicalCommandsLog.ts#L18)

---

### useLexicalCommandsLog

▸ **useLexicalCommandsLog**(`editor`): [`LexicalCommandLog`](lexical_devtools_core.md#lexicalcommandlog)

#### 參數

| 名稱     | 類型                                                   |
| :------- | :----------------------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |

#### 回傳

[`LexicalCommandLog`](lexical_devtools_core.md#lexicalcommandlog)

#### 定義於

[packages/lexical-devtools-core/src/useLexicalCommandsLog.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical-devtools-core/src/useLexicalCommandsLog.ts#L57)
