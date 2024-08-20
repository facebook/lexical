---
id: 'lexical'
title: '模組: lexical'
custom_edit_url: null
---

## 類別

- [ArtificialNode\_\_DO_NOT_USE](../classes/lexical.ArtificialNode__DO_NOT_USE.md)
- [DecoratorNode](../classes/lexical.DecoratorNode.md)
- [EditorState](../classes/lexical.EditorState.md)
- [ElementNode](../classes/lexical.ElementNode.md)
- [LexicalEditor](../classes/lexical.LexicalEditor.md)
- [LexicalNode](../classes/lexical.LexicalNode.md)
- [LineBreakNode](../classes/lexical.LineBreakNode.md)
- [NodeSelection](../classes/lexical.NodeSelection.md)
- [ParagraphNode](../classes/lexical.ParagraphNode.md)
- [Point](../classes/lexical.Point.md)
- [RangeSelection](../classes/lexical.RangeSelection.md)
- [RootNode](../classes/lexical.RootNode.md)
- [TabNode](../classes/lexical.TabNode.md)
- [TextNode](../classes/lexical.TextNode.md)

## 介面

- [BaseSelection](../interfaces/lexical.BaseSelection.md)
- [EditorStateReadOptions](../interfaces/lexical.EditorStateReadOptions.md)
- [SerializedEditorState](../interfaces/lexical.SerializedEditorState.md)

## 型別別名

### CommandListener

Ƭ **CommandListener**\<`P`\>: (`payload`: `P`, `editor`: [`LexicalEditor`](../classes/lexical.LexicalEditor.md)) => `boolean`

#### 型別參數

| 名稱 |
| :--- |
| `P`  |

#### 型別宣告

▸ (`payload`, `editor`): `boolean`

##### 參數

| 名稱      | 型別                                                   |
| :-------- | :----------------------------------------------------- |
| `payload` | `P`                                                    |
| `editor`  | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |

##### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:256](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L256)

---

### CommandListenerPriority

Ƭ **CommandListenerPriority**: `0` \| `1` \| `2` \| `3` \| `4`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:260](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L260)

---

### CommandPayloadType

Ƭ **CommandPayloadType**\<`TCommand`\>: `TCommand` extends [`LexicalCommand`](lexical.md#lexicalcommand)\<infer TPayload\> ? `TPayload` : `never`

型別助手，用於從命令中提取有效負載型別。

**`範例`**

```ts
const MY_COMMAND = createCommand<SomeType>();

// ...

editor.registerCommand(MY_COMMAND, (payload) => {
  // `payload` 的型別在這裡被推斷出來。但假設我們想提取一個函數來委派給
  handleMyCommand(editor, payload);
  return true;
});

function handleMyCommand(
  editor: LexicalEditor,
  payload: CommandPayloadType<typeof MY_COMMAND>,
) {
  // `payload` 是從命令中提取的 `SomeType` 型別。
}
```

#### 型別參數

| 名稱       | 型別                                                               |
| :--------- | :----------------------------------------------------------------- |
| `TCommand` | extends [`LexicalCommand`](lexical.md#lexicalcommand)\<`unknown`\> |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:293](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L293)

---

### CreateEditorArgs

Ƭ **CreateEditorArgs**: `Object`

#### 型別宣告

| 名稱             | 型別                                                                                                                                                                  |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disableEvents?` | `boolean`                                                                                                                                                             |
| `editable?`      | `boolean`                                                                                                                                                             |
| `editorState?`   | [`EditorState`](../classes/lexical.EditorState.md)                                                                                                                    |
| `html?`          | [`HTMLConfig`](lexical.md#htmlconfig)                                                                                                                                 |
| `namespace?`     | `string`                                                                                                                                                              |
| `nodes?`         | `ReadonlyArray`\<[`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\> \| [`LexicalNodeReplacement`](lexical.md#lexicalnodereplacement)\> |
| `onError?`       | `ErrorHandler`                                                                                                                                                        |
| `parentEditor?`  | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)                                                                                                                |
| `theme?`         | [`EditorThemeClasses`](lexical.md#editorthemeclasses)                                                                                                                 |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:180](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L180)

---

### DOMChildConversion

Ƭ **DOMChildConversion**: (`lexicalNode`: [`LexicalNode`](../classes/lexical.LexicalNode.md), `parentLexicalNode`: [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null` \| `undefined`) => [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null` \| `undefined`

#### 型別宣告

▸ (`lexicalNode`, `parentLexicalNode`): [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null` \| `undefined`

##### 參數

| 名稱                | 型別                                                                        |
| :------------------ | :-------------------------------------------------------------------------- |
| `lexicalNode`       | [`LexicalNode`](../classes/lexical.LexicalNode.md)                          |
| `parentLexicalNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null` \| `undefined` |

##### 回傳值

[`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null` \| `undefined`

#### 定義於

[packages/lexical/src/LexicalNode.ts:134](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L134)

---

### DOMConversion

Ƭ **DOMConversion**\<`T`\>: `Object`

#### 型別參數

| 名稱 | 型別                                  |
| :--- | :------------------------------------ |
| `T`  | extends `HTMLElement` = `HTMLElement` |

#### 型別宣告

| 名稱         | 型別                                                   |
| :----------- | :----------------------------------------------------- |
| `conversion` | [`DOMConversionFn`](lexical.md#domconversionfn)\<`T`\> |
| `priority?`  | `0` \| `1` \| `2` \| `3` \| `4`                        |

#### 定義於

[packages/lexical/src/LexicalNode.ts:125](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L125)

---

### DOMConversionFn

Ƭ **DOMConversionFn**\<`T`\>: (`element`: `T`) => [`DOMConversionOutput`](lexical.md#domconversionoutput) \| `null`

#### 型別參數

| 名稱 | 型別                                  |
| :--- | :------------------------------------ |
| `T`  | extends `HTMLElement` = `HTMLElement` |

#### 型別宣告

▸ (`element`): [`DOMConversionOutput`](lexical.md#domconversionoutput) \| `null`

##### 參數

| 名稱      | 型別 |
| :-------- | :--- |
| `element` | `T`  |

##### 回傳值

[`DOMConversionOutput`](lexical.md#domconversionoutput) \| `null`

#### 定義於

[packages/lexical/src/LexicalNode.ts:130](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L130)

---

### DOMConversionMap

Ƭ **DOMConversionMap**\<`T`\>: `Record`\<`NodeName`, (`node`: `T`) => [`DOMConversion`](lexical.md#domconversion)\<`T`\> \| `null`\>

#### 型別參數

| 名稱 | 型別                                  |
| :--- | :------------------------------------ |
| `T`  | extends `HTMLElement` = `HTMLElement` |

#### 定義於

[packages/lexical/src/LexicalNode.ts:139](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L139)

---

### DOMConversionOutput

Ƭ **DOMConversionOutput**: `Object`

#### 型別宣告

| 名稱        | 型別                                                                                                                                |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `after?`    | (`childLexicalNodes`: [`LexicalNode`](../classes/lexical.LexicalNode.md)[]) => [`LexicalNode`](../classes/lexical.LexicalNode.md)[] |
| `forChild?` | [`DOMChildConversion`](lexical.md#domchildconversion)                                                                               |
| `node`      | `null` \| [`LexicalNode`](../classes/lex                                                                                            |

ical.LexicalNode.md) \| [`LexicalNode`](../classes/lexical.LexicalNode.md)[] |

#### 定義於

[packages/lexical/src/LexicalNode.ts:145](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L145)

---

### DOMExportOutput

Ƭ **DOMExportOutput**: `Object`

#### 型別宣告

| 名稱      | 型別                                                                                                                       |
| :-------- | :------------------------------------------------------------------------------------------------------------------------- |
| `after?`  | (`generatedElement`: `HTMLElement` \| `Text` \| `null` \| `undefined`) => `HTMLElement` \| `Text` \| `null` \| `undefined` |
| `element` | `HTMLElement` \| `Text` \| `null`                                                                                          |

#### 定義於

[packages/lexical/src/LexicalNode.ts:151](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L151)

---

### EditableListener

Ƭ **EditableListener**: (`editable`: `boolean`) => `void`

#### 型別宣告

▸ (`editable`): `void`

##### 參數

| 名稱       | 型別      |
| :--------- | :-------- |
| `editable` | `boolean` |

##### 回傳

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:258](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L258)

---

### EditorConfig

Ƭ **EditorConfig**: `Object`

#### 型別宣告

| 名稱             | 型別                                                  |
| :--------------- | :---------------------------------------------------- |
| `disableEvents?` | `boolean`                                             |
| `namespace`      | `string`                                              |
| `theme`          | [`EditorThemeClasses`](lexical.md#editorthemeclasses) |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:157](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L157)

---

### EditorSetOptions

Ƭ **EditorSetOptions**: `Object`

#### 型別宣告

| 名稱   | 型別     |
| :----- | :------- |
| `tag?` | `string` |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L86)

---

### EditorThemeClassName

Ƭ **EditorThemeClassName**: `string`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:63](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L63)

---

### EditorThemeClasses

Ƭ **EditorThemeClasses**: `Object`

#### 索引特徵

▪ [key: `string`]: `any`

#### 型別宣告

| 名稱                              | 型別                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `blockCursor?`                    | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `characterLimit?`                 | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `code?`                           | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `codeHighlight?`                  | `Record`\<`string`, [`EditorThemeClassName`](lexical.md#editorthemeclassname)\>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `embedBlock?`                     | \{ `base?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `focus?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `embedBlock.base?`                | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `embedBlock.focus?`               | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `hashtag?`                        | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `heading?`                        | \{ `h1?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `h2?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `h3?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `h4?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `h5?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `h6?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) }                                                                                                                                                                                                                                                                                                                                                            |
| `heading.h1?`                     | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `heading.h2?`                     | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `heading.h3?`                     | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `heading.h4?`                     | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `heading.h5?`                     | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `heading.h6?`                     | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `hr?`                             | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `image?`                          | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `indent?`                         | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `link?`                           | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list?`                           | \{ `checklist?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `listitem?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `listitemChecked?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `listitemUnchecked?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `nested?`: \{ `list?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `listitem?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) } ; `ol?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `olDepth?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname)[] ; `ul?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `ulDepth?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname)[] } |
| `list.checklist?`                 | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.listitem?`                  | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.listitemChecked?`           | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.listitemUnchecked?`         | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.nested?`                    | \{ `list?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `listitem?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `list.nested.list?`               | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.nested.listitem?`           | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.ol?`                        | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.olDepth?`                   | [`EditorThemeClassName`](lexical.md#editorthemeclassname)[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `list.ul?`                        | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `list.ulDepth?`                   | [`EditorThemeClassName`](lexical.md#editorthemeclassname)[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ltr?`                            | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `mark?`                           | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `markOverlap?`                    | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `paragraph?`                      | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `quote?`                          | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `root?`                           | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `rtl?`                            | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `table?`                          | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableAddColumns?`                | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableAddRows?`                   | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableCell?`                      | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableCellActionButton?`          | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableCellActionButtonContainer?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableCellEditing?`               | [`EditorThemeClassName`](lexical.md#editorthemeclassname)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `tableCellHeader?`                | [`EditorThemeClassName`](lexical                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

.md#editorthemeclassname) |
| `tableCellPrimarySelected?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `tableCellResizer?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `tableCellSelected?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `tableResizeRuler?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `tableSelected?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text?` | \{ `bold?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `code?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `italic?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `strikethrough?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `subscript?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `superscript?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) ; `underline?`: [`EditorThemeClassName`](lexical.md#editorthemeclassname) } |
| `text.bold?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text.code?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text.italic?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text.strikethrough?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text.subscript?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text.superscript?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |
| `text.underline?` | [`EditorThemeClassName`](lexical.md#editorthemeclassname) |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:65](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L65)

---

### EditorUpdateOptions

Ƭ **EditorUpdateOptions**: `Object`

#### 型別宣告

| 名稱       | 型別                    |
| :--------- | :---------------------- |
| `onUpdate` | (`node`: `T`) => `void` |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:135](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L135)

---

### InsertHTMLConfig

Ƭ **InsertHTMLConfig**: `Object`

#### 型別宣告

| 名稱      | 型別                                                                                       |
| :-------- | :----------------------------------------------------------------------------------------- |
| `parse?`  | (`html`: `string`, `editor`: [`LexicalEditor`](lexical.md#lexicaleditor)) => `HTMLElement` |
| `replace` | `boolean`                                                                                  |

#### 定義於

[packages/lexical/src/LexicalNode.ts:153](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L153)

### Klass

Ƭ **Klass**\<`T`\>: `InstanceType`\<`T`[``"constructor"``]\> extends `T` ? `T`[``"constructor"``] : `GenericConstructor`\<`T`\> & `T`[``"constructor"``]

#### 型別參數

| 名稱 | 型別                                                       |
| :--- | :--------------------------------------------------------- |
| `T`  | extends [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L57)

---

### KlassConstructor

Ƭ **KlassConstructor**\<`Cls`\>: `GenericConstructor`\<`InstanceType`\<`Cls`\>\> & \{ [k in keyof Cls]: Cls[k] }

#### 型別參數

| 名稱  | 型別                                  |
| :---- | :------------------------------------ |
| `Cls` | extends `GenericConstructor`\<`any`\> |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:52](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L52)

---

### LexicalCommand

Ƭ **LexicalCommand**\<`TPayload`\>: `Object`

#### 型別參數

| 名稱       |
| :--------- |
| `TPayload` |

#### 型別聲明

| 名稱    | 型別     |
| :------ | :------- |
| `type?` | `string` |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:269](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L269)

---

### LexicalNodeReplacement

Ƭ **LexicalNodeReplacement**: `Object`

#### 型別聲明

| 名稱         | 型別                                                                                       |
| :----------- | :----------------------------------------------------------------------------------------- |
| `replace`    | [`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\>          |
| `with`       | \<T\>(`node`: `InstanceType`\<`T`\>) => [`LexicalNode`](../classes/lexical.LexicalNode.md) |
| `withKlass?` | [`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\>          |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:163](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L163)

---

### MutationListener

Ƭ **MutationListener**: (`nodes`: `Map`\<[`NodeKey`](lexical.md#nodekey), [`NodeMutation`](lexical.md#nodemutation)\>, `payload`: \{ `dirtyLeaves`: `Set`\<`string`\> ; `prevEditorState`: [`EditorState`](../classes/lexical.EditorState.md) ; `updateTags`: `Set`\<`string`\> }) => `void`

#### 型別聲明

▸ (`nodes`, `payload`): `void`

##### 參數

| 名稱                      | 型別                                                                                |
| :------------------------ | :---------------------------------------------------------------------------------- |
| `nodes`                   | `Map`\<[`NodeKey`](lexical.md#nodekey), [`NodeMutation`](lexical.md#nodemutation)\> |
| `payload`                 | `Object`                                                                            |
| `payload.dirtyLeaves`     | `Set`\<`string`\>                                                                   |
| `payload.prevEditorState` | [`EditorState`](../classes/lexical.EditorState.md)                                  |
| `payload.updateTags`      | `Set`\<`string`\>                                                                   |

##### 回傳

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:247](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L247)

---

### NodeKey

Ƭ **NodeKey**: `string`

#### 定義於

[packages/lexical/src/LexicalNode.ts:158](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L158)

---

### NodeMap

Ƭ **NodeMap**: `Map`\<[`NodeKey`](lexical.md#nodekey), [`LexicalNode`](../classes/lexical.LexicalNode.md)\>

#### 定義於

[packages/lexical/src/LexicalNode.ts:52](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L52)

---

### NodeMutation

Ƭ **NodeMutation**: `"created"` \| `"updated"` \| `"destroyed"`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:213](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L213)

---

### PasteCommandType

Ƭ **PasteCommandType**: `ClipboardEvent` \| `InputEvent` \| `KeyboardEvent`

#### 定義於

[packages/lexical/src/LexicalCommands.ts:17](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L17)

---

### PointType

Ƭ **PointType**: [`TextPoint`](lexical.md#textpoint) \| [`ElementPoint`](lexical.md#elementpoint)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:89](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L89)

### SerializedEditor

Ƭ **SerializedEditor**: `Object`

#### 型別說明

| 名稱          | 型別                                                                      |
| :------------ | :------------------------------------------------------------------------ |
| `editorState` | [`SerializedEditorState`](../interfaces/lexical.SerializedEditorState.md) |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:334](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L334)

---

### SerializedElementNode

Ƭ **SerializedElementNode**\<`T`\>: [`Spread`](lexical.md#spread)\<\{ `children`: `T`[] ; `direction`: `"ltr"` \| `"rtl"` \| `null` ; `format`: [`ElementFormatType`](lexical.md#elementformattype) ; `indent`: `number` }, [`SerializedLexicalNode`](lexical.md#serializedlexicalnode)\>

#### 型別參數

| 名稱 | 型別                                                                                                                                              |
| :--- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `T`  | 必須為 [`SerializedLexicalNode`](lexical.md#serializedlexicalnode) 的子類別，預設值為 [`SerializedLexicalNode`](lexical.md#serializedlexicalnode) |

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L39)

---

### SerializedLexicalNode

Ƭ **SerializedLexicalNode**: `Object`

#### 型別說明

| 名稱      | 型別     |
| :-------- | :------- |
| `type`    | `string` |
| `version` | `number` |

#### 定義於

[packages/lexical/src/LexicalNode.ts:54](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNode.ts#L54)

---

### SerializedLineBreakNode

Ƭ **SerializedLineBreakNode**: [`SerializedLexicalNode`](lexical.md#serializedlexicalnode)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:21](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L21)

---

### SerializedParagraphNode

Ƭ **SerializedParagraphNode**: [`Spread`](lexical.md#spread)\<\{ `textFormat`: `number` ; `textStyle`: `string` }, [`SerializedElementNode`](lexical.md#serializedelementnode)\>

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L37)

---

### SerializedRootNode

Ƭ **SerializedRootNode**\<`T`\>: [`SerializedElementNode`](lexical.md#serializedelementnode)\<`T`\>

#### 型別參數

| 名稱 | 型別                                                                                                                                              |
| :--- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `T`  | 必須為 [`SerializedLexicalNode`](lexical.md#serializedlexicalnode) 的子類別，預設值為 [`SerializedLexicalNode`](lexical.md#serializedlexicalnode) |

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:20](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L20)

---

### SerializedTabNode

Ƭ **SerializedTabNode**: [`SerializedTextNode`](lexical.md#serializedtextnode)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L23)

---

### SerializedTextNode

Ƭ **SerializedTextNode**: [`Spread`](lexical.md#spread)\<\{ `detail`: `number` ; `format`: `number` ; `mode`: [`TextModeType`](lexical.md#textmodetype) ; `style`: `string` ; `text`: `string` }, [`SerializedLexicalNode`](lexical.md#serializedlexicalnode)\>

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L72)

---

### Spread

Ƭ **Spread**\<`T1`, `T2`\>: `Omit`\<`T2`, keyof `T1`\> & `T1`

#### 型別參數

| 名稱 |
| :--- |
| `T1` |
| `T2` |

#### 定義於

[packages/lexical/src/LexicalEditor.ts:48](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L48)

---

### TextFormatType

Ƭ **TextFormatType**: `"bold"` \| `"underline"` \| `"strikethrough"` \| `"italic"` \| `"highlight"` \| `"code"` \| `"subscript"` \| `"superscript"`

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:85](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L85)

---

### TextModeType

Ƭ **TextModeType**: `"normal"` \| `"token"` \| `"segmented"`

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:95](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L95)

---

### TextPoint

Ƭ **TextPoint**: `Object`

#### 型別說明

| 名稱         | 型別                                                                                                    |
| :----------- | :------------------------------------------------------------------------------------------------------ |
| `_selection` | [`BaseSelection`](../interfaces/lexical.BaseSelection.md)                                               |
| `getNode`    | () => [`TextNode`](../classes/lexical.TextNode.md)                                                      |
| `is`         | (`point`: [`PointType`](lexical.md#pointtype)) => `boolean`                                             |
| `isBefore`   | (`point`: [`PointType`](lexical.md#pointtype)) => `boolean`                                             |
| `key`        | [`NodeKey`](lexical.md#nodekey)                                                                         |
| `offset`     | `number`                                                                                                |
| `set`        | (`key`: [`NodeKey`](lexical.md#nodekey), `offset`: `number`, `type`: `"text"` \| `"element"`) => `void` |
| `type`       | `"text"`                                                                                                |

#### 定義於

[packages/lexical/src/LexicalSelection.ts:67](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L67)

---

### Transform

Ƭ **Transform**\<`T`\>: (`node`: `T`) => `void`

#### 型別參數

| 名稱 | 型別                                                               |
| :--- | :----------------------------------------------------------------- |
| `T`  | 必須為 [`LexicalNode`](../classes/lexical.LexicalNode.md) 的子類別 |

#### 型別說明

▸ (`node`): `void`

##### 參數

| 名稱   | 型別 |
| :----- | :--- |
| `node` | `T`  |

##### 回傳

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:205](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L205)

## 變數

### BLUR_COMMAND

• `Const` **BLUR_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`FocusEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:122](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L122)

---

### CAN_REDO_COMMAND

• `Const` **CAN_REDO_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:116](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L116)

---

### CAN_UNDO_COMMAND

• `Const` **CAN_UNDO_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:118](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L118)

---

### CLEAR_EDITOR_COMMAND

• `Const` **CLEAR_EDITOR_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:110](https://github.com/facebook/lexical/tree

/main/packages/lexical/src/LexicalCommands.ts#L110)

---

### CLEAR_HISTORY_COMMAND

• `Const` **CLEAR_HISTORY_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:113](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L113)

---

### CLICK_COMMAND

• `Const` **CLICK_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`MouseEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:30](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L30)

### COMMAND_PRIORITY_CRITICAL

• `常數` **COMMAND_PRIORITY_CRITICAL**: `4`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:266](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L266)

---

### COMMAND_PRIORITY_EDITOR

• `常數` **COMMAND_PRIORITY_EDITOR**: `0`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:262](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L262)

---

### COMMAND_PRIORITY_HIGH

• `常數` **COMMAND_PRIORITY_HIGH**: `3`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:265](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L265)

---

### COMMAND_PRIORITY_LOW

• `常數` **COMMAND_PRIORITY_LOW**: `1`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:263](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L263)

---

### COMMAND_PRIORITY_NORMAL

• `常數` **COMMAND_PRIORITY_NORMAL**: `2`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:264](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L264)

---

### CONTROLLED_TEXT_INSERTION_COMMAND

• `常數` **CONTROLLED_TEXT_INSERTION_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`InputEvent` \| `string`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L41)

---

### COPY_COMMAND

• `常數` **COPY_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`ClipboardEvent` \| `KeyboardEvent` \| `null`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:102](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L102)

---

### CUT_COMMAND

• `常數` **CUT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`ClipboardEvent` \| `KeyboardEvent` \| `null`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:105](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L105)

---

### DELETE_CHARACTER_COMMAND

• `常數` **DELETE_CHARACTER_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:32](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L32)

---

### DELETE_LINE_COMMAND

• `常數` **DELETE_LINE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:51](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L51)

---

### DELETE_WORD_COMMAND

• `常數` **DELETE_WORD_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:48](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L48)

---

### DRAGEND_COMMAND

• `常數` **DRAGEND_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`DragEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:100](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L100)

---

### DRAGOVER_COMMAND

• `常數` **DRAGOVER_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`DragEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:98](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L98)

---

### DRAGSTART_COMMAND

• `常數` **DRAGSTART_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`DragEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:96](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L96)

---

### DROP_COMMAND

• `常數` **DROP_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`DragEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:92](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L92)

---

### FOCUS_COMMAND

• `常數` **FOCUS_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`FocusEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:120](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L120)

---

### FORMAT_ELEMENT_COMMAND

• `常數` **FORMAT_ELEMENT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<[`ElementFormatType`](lexical.md#elementformattype)\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:94](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L94)

---

### FORMAT_TEXT_COMMAND

• `常數` **FORMAT_TEXT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<[`TextFormatType`](lexical.md#textformattype)\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:54](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L54)

---

### INDENT_CONTENT_COMMAND

• `常數` **INDENT_CONTENT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L86)

---

### INSERT_LINE_BREAK_COMMAND

• `常數` **INSERT_LINE_BREAK_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:35](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L35)

---

### INSERT_PARAGRAPH_COMMAND

• `常數` **INSERT_PARAGRAPH_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:38](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L38)

---

### INSERT_TAB_COMMAND

• `常數` **INSERT_TAB_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:84](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L84)

---

### IS_ALL_FORMATTING

• `常數` **IS_ALL_FORMATTING**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:48](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L48)

---

### IS_BOLD

• `常數` **IS_BOLD**: `1`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:39](https://github.com/facebook/lex

ical/tree/main/packages/lexical/src/LexicalConstants.ts#L39)

---

### IS_CODE

• `常數` **IS_CODE**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L43)

### IS_HIGHLIGHT

• `常數` **IS_HIGHLIGHT**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L46)

---

### IS_ITALIC

• `常數` **IS_ITALIC**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L40)

---

### IS_STRIKETHROUGH

• `常數` **IS_STRIKETHROUGH**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L41)

---

### IS_SUBSCRIPT

• `常數` **IS_SUBSCRIPT**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L44)

---

### IS_SUPERSCRIPT

• `常數` **IS_SUPERSCRIPT**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L45)

---

### IS_UNDERLINE

• `常數` **IS_UNDERLINE**: `number`

#### 定義於

[packages/lexical/src/LexicalConstants.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L42)

---

### KEY_ARROW_DOWN_COMMAND

• `常數` **KEY_ARROW_DOWN_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:70](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L70)

---

### KEY_ARROW_LEFT_COMMAND

• `常數` **KEY_ARROW_LEFT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:64](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L64)

---

### KEY_ARROW_RIGHT_COMMAND

• `常數` **KEY_ARROW_RIGHT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:60](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L60)

---

### KEY_ARROW_UP_COMMAND

• `常數` **KEY_ARROW_UP_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:68](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L68)

---

### KEY_BACKSPACE_COMMAND

• `常數` **KEY_BACKSPACE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:76](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L76)

---

### KEY_DELETE_COMMAND

• `常數` **KEY_DELETE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:80](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L80)

---

### KEY_DOWN_COMMAND

• `常數` **KEY_DOWN_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:58](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L58)

---

### KEY_ENTER_COMMAND

• `常數` **KEY_ENTER_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent` \| `null`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L72)

---

### KEY_ESCAPE_COMMAND

• `常數` **KEY_ESCAPE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:78](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L78)

---

### KEY_MODIFIER_COMMAND

• `常數` **KEY_MODIFIER_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:124](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L124)

---

### KEY_SPACE_COMMAND

• `常數` **KEY_SPACE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:74](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L74)

---

### KEY_TAB_COMMAND

• `常數` **KEY_TAB_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:82](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L82)

---

### MOVE_TO_END

• `常數` **MOVE_TO_END**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L62)

---

### MOVE_TO_START

• `常數` **MOVE_TO_START**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L66)

---

### OUTDENT_CONTENT_COMMAND

• `常數` **OUTDENT_CONTENT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:89](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L89)

---

### PASTE_COMMAND

• `常數` **PASTE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<[`PasteCommandType`](lexical.md#pastecommandtype)\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L44)

---

### REDO_COMMAND

• `常數` **REDO_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L57)

---

### REMOVE_TEXT_COMMAND

• `常數` **REMOVE_TEXT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`InputEvent` \| `null`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts

#L46)

---

### SELECTION_CHANGE_COMMAND

• `常數` **SELECTION_CHANGE_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L23)

### SELECTION_INSERT_CLIPBOARD_NODES_COMMAND

• `常數` **SELECTION_INSERT_CLIPBOARD_NODES_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<\{ `nodes`: [`LexicalNode`](../classes/lexical.LexicalNode.md)[] ; `selection`: [`BaseSelection`](../interfaces/lexical.BaseSelection.md) }\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:26](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L26)

---

### SELECT_ALL_COMMAND

• `常數` **SELECT_ALL_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`KeyboardEvent`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:108](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L108)

---

### TEXT_TYPE_TO_FORMAT

• `常數` **TEXT_TYPE_TO_FORMAT**: `Record`\<[`TextFormatType`](lexical.md#textformattype) \| `string`, `number`\>

#### 定義於

[packages/lexical/src/LexicalConstants.ts:98](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalConstants.ts#L98)

---

### UNDO_COMMAND

• `常數` **UNDO_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`void`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:56](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L56)

## 函式

### $addUpdateTag

▸ **$addUpdateTag**(`tag`): `void`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `tag` | `string` |

#### 回傳

`void`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1311](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1311)

---

### $applyNodeReplacement

▸ **$applyNodeReplacement**\<`N`\>(`node`): `N`

#### 類型參數

| 名稱 | 類型                                                    |
| :--- | :------------------------------------------------------ |
| `N`  | 擴展 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱   | 類型                                               |
| :----- | :------------------------------------------------- |
| `node` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

`N`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1408](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1408)

---

### $cloneWithProperties

▸ **$cloneWithProperties**\<`T`\>(`latestNode`): `T`

返回一個使用 `node.constructor.clone()` 生成的節點克隆，接著進行 `clone.afterCloneFrom(node)` 操作。生成的克隆必須具有相同的鍵、父節點/下一個節點/前一個節點指針，以及其他未由 `node.constructor.clone` 設置的屬性（格式、樣式等）。這主要由 [LexicalNode.getWritable](../classes/lexical.LexicalNode.md#getwritable) 用於創建現有節點的可寫版本。該克隆與原節點是相同的邏輯節點，請勿嘗試使用此函數來重複或複製現有節點。

不會修改 `EditorState`。

#### 類型參數

| 名稱 | 類型                                                    |
| :--- | :------------------------------------------------------ |
| `T`  | 擴展 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱         | 類型 |
| :----------- | :--- |
| `latestNode` | `T`  |

#### 回傳

`T`

節點的克隆。

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1767](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1767)

---

### $copyNode

▸ **$copyNode**\<`T`\>(`node`): `T`

返回具有新鍵的節點的淺層克隆。

#### 類型參數

| 名稱 | 類型                                                    |
| :--- | :------------------------------------------------------ |
| `T`  | 擴展 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱   | 類型 | 描述           |
| :----- | :--- | :------------- |
| `node` | `T`  | 要複製的節點。 |

#### 回傳

`T`

節點的副本。

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1402](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1402)

---

### $createLineBreakNode

▸ **$createLineBreakNode**(): [`LineBreakNode`](../classes/lexical.LineBreakNode.md)

#### 回傳

[`LineBreakNode`](../classes/lexical.LineBreakNode.md)

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:82](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L82)

---

### $createNodeSelection

▸ **$createNodeSelection**(): [`NodeSelection`](../classes/lexical.NodeSelection.md)

#### 回傳

[`NodeSelection`](../classes/lexical.NodeSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2222](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2222)

---

### $createParagraphNode

▸ **$createParagraphNode**(): [`ParagraphNode`](../classes/lexical.ParagraphNode.md)

#### 回傳

[`ParagraphNode`](../classes/lexical.ParagraphNode.md)

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:228](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L228)

---

### $createPoint

▸ **$createPoint**(`key`, `offset`, `type`): [`PointType`](lexical.md#pointtype)

#### 參數

| 名稱     | 類型                    |
| :------- | :---------------------- |
| `key`    | `string`                |
| `offset` | `number`                |
| `type`   | `"text"` \| `"element"` |

#### 回傳

[`PointType`](lexical.md#pointtype)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:159](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L159)

---

### $createRangeSelection

▸ **$createRangeSelection**(): [`RangeSelection`](../classes/lexical.RangeSelection.md)

#### 回傳

[`RangeSelection`](../classes/lexical.RangeSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2216](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2216)

---

### $createRangeSelectionFromDom

▸ **$createRangeSelectionFromDom**(`domSelection`, `editor`): `null` \| [`RangeSelection`](../classes/lexical.RangeSelection.md)

#### 參數

| 名稱           | 類型                                                   |
| :------------- | :----------------------------------------------------- |
| `domSelection` | `null` \| `Selection`                                  |
| `editor`       | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |

#### 回傳

`null` \| [`RangeSelection`](../classes/lexical.RangeSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2244](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2244)

### $createTabNode

▸ **$createTabNode**(): [`TabNode`](../classes/lexical.TabNode.md)

#### 回傳

[`TabNode`](../classes/lexical.TabNode.md)

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L86)

---

### $createTextNode

▸ **$createTextNode**(`text?`): [`TextNode`](../classes/lexical.TextNode.md)

#### 參數

| 名稱   | 類型     | 預設值 |
| :----- | :------- | :----- |
| `text` | `string` | `''`   |

#### 回傳

[`TextNode`](../classes/lexical.TextNode.md)

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:1305](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L1305)

---

### $getAdjacentNode

▸ **$getAdjacentNode**(`focus`, `isBackward`): `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)

#### 參數

| 名稱         | 類型                                |
| :----------- | :---------------------------------- |
| `focus`      | [`PointType`](lexical.md#pointtype) |
| `isBackward` | `boolean`                           |

#### 回傳

`null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md)

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1175](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1175)

---

### $getCharacterOffsets

▸ **$getCharacterOffsets**(`selection`): [`number`, `number`]

#### 參數

| 名稱        | 類型                                                      |
| :---------- | :-------------------------------------------------------- |
| `selection` | [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 回傳

[`number`, `number`]

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1777](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1777)

---

### $getEditor

▸ **$getEditor**(): [`LexicalEditor`](../classes/lexical.LexicalEditor.md)

用於獲取當前活動的編輯器實例的工具函數。

#### 回傳

[`LexicalEditor`](../classes/lexical.LexicalEditor.md)

當前活動的編輯器

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1713](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1713)

---

### $getNearestNodeFromDOMNode

▸ **$getNearestNodeFromDOMNode**(`startingDOM`, `editorState?`): [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null`

#### 參數

| 名稱           | 類型                                               |
| :------------- | :------------------------------------------------- |
| `startingDOM`  | `Node`                                             |
| `editorState?` | [`EditorState`](../classes/lexical.EditorState.md) |

#### 回傳

[`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:452](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L452)

---

### $getNearestRootOrShadowRoot

▸ **$getNearestRootOrShadowRoot**(`node`): [`RootNode`](../classes/lexical.RootNode.md) \| [`ElementNode`](../classes/lexical.ElementNode.md)

#### 參數

| 名稱   | 類型                                               |
| :----- | :------------------------------------------------- |
| `node` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

[`RootNode`](../classes/lexical.RootNode.md) \| [`ElementNode`](../classes/lexical.ElementNode.md)

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1370](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1370)

---

### $getNodeByKey

▸ **$getNodeByKey**\<`T`\>(`key`, `_editorState?`): `T` \| `null`

#### 類型參數

| 名稱 | 類型                                                    |
| :--- | :------------------------------------------------------ |
| `T`  | 擴展 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱            | 類型                                               |
| :-------------- | :------------------------------------------------- |
| `key`           | `string`                                           |
| `_editorState?` | [`EditorState`](../classes/lexical.EditorState.md) |

#### 回傳

`T` \| `null`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:427](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L427)

---

### $getNodeByKeyOrThrow

▸ **$getNodeByKeyOrThrow**\<`N`\>(`key`): `N`

#### 類型參數

| 名稱 | 類型                                                    |
| :--- | :------------------------------------------------------ |
| `N`  | 擴展 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `key` | `string` |

#### 回傳

`N`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1451](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1451)

---

### $getPreviousSelection

▸ **$getPreviousSelection**(): `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

#### 回傳

`null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2336](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2336)

---

### $getRoot

▸ **$getRoot**(): [`RootNode`](../classes/lexical.RootNode.md)

#### 回傳

[`RootNode`](../classes/lexical.RootNode.md)

#### 定義於

[packages/lexical/src/LexicalUtils.ts:506](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L506)

---

### $getSelection

▸ **$getSelection**(): `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

#### 回傳

`null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2331](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2331)

---

### $getTextContent

▸ **$getTextContent**(): `string`

#### 回傳

`string`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2718](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2718)

### $hasAncestor

▸ **$hasAncestor**(`child`, `targetNode`): `boolean`

#### 參數

| 名稱         | 類型                                               |
| :----------- | :------------------------------------------------- |
| `child`      | [`LexicalNode`](../classes/lexical.LexicalNode.md) |
| `targetNode` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

`boolean`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1336](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1336)

---

### $hasUpdateTag

▸ **$hasUpdateTag**(`tag`): `boolean`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `tag` | `string` |

#### 回傳

`boolean`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1306](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1306)

---

### $insertNodes

▸ **$insertNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                                 |
| :------ | :--------------------------------------------------- |
| `nodes` | [`LexicalNode`](../classes/lexical.LexicalNode.md)[] |

#### 回傳

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2709](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2709)

---

### $isBlockElementNode

▸ **$isBlockElementNode**(`node`): node 是 ElementNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

node 是 ElementNode

#### 定義於

[packages/lexical/src/LexicalSelection.ts:2186](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L2186)

---

### $isDecoratorNode

▸ **$isDecoratorNode**\<`T`\>(`node`): node 是 DecoratorNode\<T\>

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

node 是 DecoratorNode\<T\>

#### 定義於

[packages/lexical/src/nodes/LexicalDecoratorNode.ts:52](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts#L52)

---

### $isElementNode

▸ **$isElementNode**(`node`): node 是 ElementNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

node 是 ElementNode

#### 定義於

[packages/lexical/src/nodes/LexicalElementNode.ts:615](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalElementNode.ts#L615)

---

### $isInlineElementOrDecoratorNode

▸ **$isInlineElementOrDecoratorNode**(`node`): `boolean`

#### 參數

| 名稱   | 類型                                               |
| :----- | :------------------------------------------------- |
| `node` | [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

`boolean`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1363](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1363)

---

### $isLeafNode

▸ **$isLeafNode**(`node`): node 是 DecoratorNode\<unknown\> \| TextNode \| LineBreakNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

node 是 DecoratorNode\<unknown\> \| TextNode \| LineBreakNode

#### 定義於

[packages/lexical/src/LexicalUtils.ts:228](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L228)

---

### $isLineBreakNode

▸ **$isLineBreakNode**(`node`): node 是 LineBreakNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

node 是 LineBreakNode

#### 定義於

[packages/lexical/src/nodes/LexicalLineBreakNode.ts:86](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts#L86)

---

### $isNodeSelection

▸ **$isNodeSelection**(`x`): x 是 NodeSelection

#### 參數

| 名稱 | 類型      |
| :--- | :-------- |
| `x`  | `unknown` |

#### 回傳

x 是 NodeSelection

#### 定義於

[packages/lexical/src/LexicalSelection.ts:1761](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L1761)

---

### $isParagraphNode

▸ **$isParagraphNode**(`node`): node 是 ParagraphNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 回傳

node 是 ParagraphNode

#### 定義於

[packages/lexical/src/nodes/LexicalParagraphNode.ts:232](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L232)

---

### $isRangeSelection

▸ **$isRangeSelection**(`x`): x 是 RangeSelection

#### 參數

| 名稱 | 類型      |
| :--- | :-------- |
| `x`  | `unknown` |

#### 回傳

x 是 RangeSelection

#### 定義於

[packages/lexical/src/LexicalSelection.ts:393](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L393)

### $isRootNode

▸ **$isRootNode**(`node`): node 是 RootNode

#### 參數

| 名稱   | 類型                                                                                                                        |
| :----- | :-------------------------------------------------------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) \| [`RootNode`](../classes/lexical.RootNode.md) |

#### 返回

node 是 RootNode

#### 定義於

[packages/lexical/src/nodes/LexicalRootNode.ts:128](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalRootNode.ts#L128)

---

### $isRootOrShadowRoot

▸ **$isRootOrShadowRoot**(`node`): node 是 RootNode \| ShadowRootNode

#### 參數

| 名稱   | 類型                                                         |
| :----- | :----------------------------------------------------------- |
| `node` | `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node 是 RootNode \| ShadowRootNode

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1390](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1390)

---

### $isTabNode

▸ **$isTabNode**(`node`): node 是 TabNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node 是 TabNode

#### 定義於

[packages/lexical/src/nodes/LexicalTabNode.ts:90](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTabNode.ts#L90)

---

### $isTextNode

▸ **$isTextNode**(`node`): node 是 TextNode

#### 參數

| 名稱   | 類型                                                                        |
| :----- | :-------------------------------------------------------------------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 返回

node 是 TextNode

#### 定義於

[packages/lexical/src/nodes/LexicalTextNode.ts:1309](https://github.com/facebook/lexical/tree/main/packages/lexical/src/nodes/LexicalTextNode.ts#L1309)

---

### $isTokenOrSegmented

▸ **$isTokenOrSegmented**(`node`): `boolean`

#### 參數

| 名稱   | 類型                                         |
| :----- | :------------------------------------------- |
| `node` | [`TextNode`](../classes/lexical.TextNode.md) |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:188](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L188)

---

### $nodesOfType

▸ **$nodesOfType**\<`T`\>(`klass`): `T`[]

#### 類型參數

| 名稱 | 類型                                                      |
| :--- | :-------------------------------------------------------- |
| `T`  | 擴展自 [`LexicalNode`](../classes/lexical.LexicalNode.md) |

#### 參數

| 名稱    | 類型                               |
| :------ | :--------------------------------- |
| `klass` | [`Klass`](lexical.md#klass)\<`T`\> |

#### 返回

`T`[]

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1132](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1132)

---

### $normalizeSelection\_\_EXPERIMENTAL

▸ **$normalizeSelection\_\_EXPERIMENTAL**(`selection`): [`RangeSelection`](../classes/lexical.RangeSelection.md)

#### 參數

| 名稱        | 類型                                                     |
| :---------- | :------------------------------------------------------- |
| `selection` | [`RangeSelection`](../classes/lexical.RangeSelection.md) |

#### 返回

[`RangeSelection`](../classes/lexical.RangeSelection.md)

#### 定義於

[packages/lexical/src/LexicalNormalization.ts:89](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalNormalization.ts#L89)

---

### $parseSerializedNode

▸ **$parseSerializedNode**(`serializedNode`): [`LexicalNode`](../classes/lexical.LexicalNode.md)

#### 參數

| 名稱             | 類型                                                        |
| :--------------- | :---------------------------------------------------------- |
| `serializedNode` | [`SerializedLexicalNode`](lexical.md#serializedlexicalnode) |

#### 返回

[`LexicalNode`](../classes/lexical.LexicalNode.md)

#### 定義於

[packages/lexical/src/LexicalUpdates.ts:329](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUpdates.ts#L329)

---

### $selectAll

▸ **$selectAll**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1067](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1067)

---

### $setCompositionKey

▸ **$setCompositionKey**(`compositionKey`): `void`

#### 參數

| 名稱             | 類型               |
| :--------------- | :----------------- |
| `compositionKey` | `null` \| `string` |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:398](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L398)

---

### $setSelection

▸ **$setSelection**(`selection`): `void`

#### 參數

| 名稱        | 類型                                                                |
| :---------- | :------------------------------------------------------------------ |
| `selection` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:514](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L514)

---

### $splitNode

▸ **$splitNode**(`node`, `offset`): [[`ElementNode`](../classes/lexical.ElementNode.md) \| `null`, [`ElementNode`](../classes/lexical.ElementNode.md)]

#### 參數

| 名稱     | 類型                                               |
| :------- | :------------------------------------------------- |
| `node`   | [`ElementNode`](../classes/lexical.ElementNode.md) |
| `offset` | `number`                                           |

#### 返回

[[`ElementNode`](../classes/lexical.ElementNode.md) \| `null`, [`ElementNode`](../classes/lexical.ElementNode.md)]

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1566](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1566)

---

### createCommand

▸ **createCommand**\<`T`\>(`type?`): [`LexicalCommand`](lexical.md#lexicalcommand)\<`T`\>

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱    | 類型     |
| :------ | :------- |
| `type?` | `string` |

#### 返回

[`LexicalCommand`](lexical.md#lexicalcommand)\<`T`\>

#### 定義於

[packages/lexical/src/LexicalCommands.ts:19](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalCommands.ts#L19)

### createEditor

▸ **createEditor**(`editorConfig?`): [`LexicalEditor`](../classes/lexical.LexicalEditor.md)

建立一個新的 LexicalEditor 並附加到單一的 contentEditable（由配置提供）。這是 LexicalEditor 的最低層初始化 API。如果你使用的是 React 或其他框架，考慮使用適當的抽象，如 LexicalComposer。

#### 參數

| 名稱            | 類型                                              | 描述         |
| :-------------- | :------------------------------------------------ | :----------- |
| `editorConfig?` | [`CreateEditorArgs`](lexical.md#createeditorargs) | 編輯器配置。 |

#### 返回

[`LexicalEditor`](../classes/lexical.LexicalEditor.md)

一個 LexicalEditor 實例

#### 定義於

[packages/lexical/src/LexicalEditor.ts:421](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L421)

---

### getNearestEditorFromDOMNode

▸ **getNearestEditorFromDOMNode**(`node`): [`LexicalEditor`](../classes/lexical.LexicalEditor.md) \| `null`

#### 參數

| 名稱   | 類型             |
| :----- | :--------------- |
| `node` | `null` \| `Node` |

#### 返回

[`LexicalEditor`](../classes/lexical.LexicalEditor.md) \| `null`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:158](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L158)

---

### isBlockDomNode

▸ **isBlockDomNode**(`node`): `boolean`

#### 參數

| 名稱   | 類型   | 描述              |
| :----- | :----- | :---------------- |
| `node` | `Node` | 要檢查的 DOM 節點 |

#### 返回

`boolean`

如果 DOM 節點是區塊節點，則返回 `true`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1666](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1666)

---

### isCurrentlyReadOnlyMode

▸ **isCurrentlyReadOnlyMode**(): `boolean`

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalUpdates.ts:72](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUpdates.ts#L72)

---

### isHTMLAnchorElement

▸ **isHTMLAnchorElement**(`x`): x 是 HTMLAnchorElement

#### 參數

| 名稱 | 類型   | 描述         |
| :--- | :----- | :----------- |
| `x`  | `Node` | 要測試的元素 |

#### 返回

x 是 HTMLAnchorElement

如果 x 是 HTML 錨點標籤，則返回 `true`，否則返回 `false`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1635](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1635)

---

### isHTMLElement

▸ **isHTMLElement**(`x`): x 是 HTMLElement

#### 參數

| 名稱 | 類型                    | 描述         |
| :--- | :---------------------- | :----------- |
| `x`  | `EventTarget` \| `Node` | 要測試的元素 |

#### 返回

x 是 HTMLElement

如果 x 是 HTML 元素，則返回 `true`，否則返回 `false`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1643](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1643)

---

### isInlineDomNode

▸ **isInlineDomNode**(`node`): `boolean`

#### 參數

| 名稱   | 類型   | 描述              |
| :----- | :----- | :---------------- |
| `node` | `Node` | 要檢查的 DOM 節點 |

#### 返回

`boolean`

如果 DOM 節點是內聯節點，則返回 `true`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:1653](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L1653)

---

### isLexicalEditor

▸ **isLexicalEditor**(`editor`): editor 是 LexicalEditor

#### 參數

| 名稱     | 類型      |
| :------- | :-------- |
| `editor` | `unknown` |

#### 返回

editor 是 LexicalEditor

如果給定的參數是來自這個 Lexical 构建的 LexicalEditor 實例，則返回 `true`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:153](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L153)

---

### isSelectionCapturedInDecoratorInput

▸ **isSelectionCapturedInDecoratorInput**(`anchorDOM`): `boolean`

#### 參數

| 名稱        | 類型   |
| :---------- | :----- |
| `anchorDOM` | `Node` |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:112](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L112)

---

### isSelectionWithinEditor

▸ **isSelectionWithinEditor**(`editor`, `anchorDOM`, `focusDOM`): `boolean`

#### 參數

| 名稱        | 類型                                                   |
| :---------- | :----------------------------------------------------- |
| `editor`    | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `anchorDOM` | `null` \| `Node`                                       |
| `focusDOM`  | `null` \| `Node`                                       |

#### 返回

`boolean`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:129](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L129)

---

### resetRandomKey

▸ **resetRandomKey**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical/src/LexicalUtils.ts:79](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalUtils.ts#L79)
