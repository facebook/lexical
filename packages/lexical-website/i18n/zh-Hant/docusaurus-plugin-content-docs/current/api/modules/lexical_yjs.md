---
id: 'lexical_yjs'
title: '模組: @lexical/yjs'
custom_edit_url: null
---

## 介面

- [Provider](../interfaces/lexical_yjs.Provider.md)

## 類型別名

### Binding

Ƭ **Binding**: `Object`

#### 類型聲明

| 名稱                 | 類型                                                                                                                                |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `clientID`           | `number`                                                                                                                            |
| `collabNodeMap`      | `Map`\<[`NodeKey`](lexical.md#nodekey), `CollabElementNode` \| `CollabTextNode` \| `CollabDecoratorNode` \| `CollabLineBreakNode`\> |
| `cursors`            | `Map`\<[`ClientID`](lexical_yjs.md#clientid), `Cursor`\>                                                                            |
| `cursorsContainer`   | `null` \| `HTMLElement`                                                                                                             |
| `doc`                | `Doc`                                                                                                                               |
| `docMap`             | `Map`\<`string`, `Doc`\>                                                                                                            |
| `editor`             | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)                                                                              |
| `excludedProperties` | [`ExcludedProperties`](lexical_yjs.md#excludedproperties)                                                                           |
| `id`                 | `string`                                                                                                                            |
| `nodeProperties`     | `Map`\<`string`, `string`[]\>                                                                                                       |
| `root`               | `CollabElementNode`                                                                                                                 |

#### 定義於

[packages/lexical-yjs/src/Bindings.ts:25](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/Bindings.ts#L25)

---

### ClientID

Ƭ **ClientID**: `number`

#### 定義於

[packages/lexical-yjs/src/Bindings.ts:24](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/Bindings.ts#L24)

---

### Delta

Ƭ **Delta**: [`Operation`](lexical_yjs.md#operation)[]

#### 定義於

[packages/lexical-yjs/src/index.ts:55](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L55)

---

### ExcludedProperties

Ƭ **ExcludedProperties**: `Map`\<[`Klass`](lexical.md#klass)\<[`LexicalNode`](../classes/lexical.LexicalNode.md)\>, `Set`\<`string`\>\>

#### 定義於

[packages/lexical-yjs/src/Bindings.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/Bindings.ts#L44)

---

### Operation

Ƭ **Operation**: `Object`

#### 類型聲明

| 名稱                | 類型                                        |
| :------------------ | :------------------------------------------ |
| `attributes`        | \{ `__type`: `string` }                     |
| `attributes.__type` | `string`                                    |
| `insert`            | `string` \| `Record`\<`string`, `unknown`\> |

#### 定義於

[packages/lexical-yjs/src/index.ts:49](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L49)

---

### ProviderAwareness

Ƭ **ProviderAwareness**: `Object`

#### 類型聲明

| 名稱            | 類型                                                             |
| :-------------- | :--------------------------------------------------------------- |
| `getLocalState` | () => [`UserState`](lexical_yjs.md#userstate) \| `null`          |
| `getStates`     | () => `Map`\<`number`, [`UserState`](lexical_yjs.md#userstate)\> |
| `off`           | (`type`: `"update"`, `cb`: () => `void`) => `void`               |
| `on`            | (`type`: `"update"`, `cb`: () => `void`) => `void`               |
| `setLocalState` | (`arg0`: [`UserState`](lexical_yjs.md#userstate)) => `void`      |

#### 定義於

[packages/lexical-yjs/src/index.ts:29](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L29)

---

### UserState

Ƭ **UserState**: `Object`

#### 類型聲明

| 名稱            | 類型                         |
| :-------------- | :--------------------------- |
| `anchorPos`     | `null` \| `RelativePosition` |
| `awarenessData` | `object`                     |
| `color`         | `string`                     |
| `focusPos`      | `null` \| `RelativePosition` |
| `focusing`      | `boolean`                    |
| `name`          | `string`                     |

#### 定義於

[packages/lexical-yjs/src/index.ts:16](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L16)

---

### YjsEvent

Ƭ **YjsEvent**: `Record`\<`string`, `unknown`\>

#### 定義於

[packages/lexical-yjs/src/index.ts:57](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L57)

---

### YjsNode

Ƭ **YjsNode**: `Record`\<`string`, `unknown`\>

#### 定義於

[packages/lexical-yjs/src/index.ts:56](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L56)

## 變數

### CONNECTED_COMMAND

• `Const` **CONNECTED_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical-yjs/src/index.ts:24](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L24)

---

### TOGGLE_CONNECT_COMMAND

• `Const` **TOGGLE_CONNECT_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`boolean`\>

#### 定義於

[packages/lexical-yjs/src/index.ts:26](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L26)

## 函式

### createBinding

▸ **createBinding**(`editor`, `provider`, `id`, `doc`, `docMap`, `excludedProperties?`): [`Binding`](lexical_yjs.md#binding)

#### 參數

| 名稱                  | 類型                                                      |
| :-------------------- | :-------------------------------------------------------- |
| `editor`              | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)    |
| `provider`            | [`Provider`](../interfaces/lexical_yjs.Provider.md)       |
| `id`                  | `string`                                                  |
| `doc`                 | `undefined` \| `null` \| `Doc`                            |
| `docMap`              | `Map`\<`string`, `Doc`\>                                  |
| `excludedProperties?` | [`ExcludedProperties`](lexical_yjs.md#excludedproperties) |

#### 回傳

[`Binding`](lexical_yjs.md#binding)

#### 定義於

[packages/lexical-yjs/src/Bindings.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/Bindings.ts#L46)

---

### createUndoManager

▸ **createUndoManager**(`binding`, `root`): `UndoManager`

#### 參數

| 名稱      | 類型                                |
| :-------- | :---------------------------------- |
| `binding` | [`Binding`](lexical_yjs.md#binding) |
| `root`    | `YXmlText`                          |

#### 回傳

`UndoManager`

#### 定義於

[packages/lexical-yjs/src/index.ts:62](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L62)

---

### initLocalState

▸ **initLocalState**(`provider`, `name`, `color`, `focusing`, `awarenessData`): `void`

#### 參數

| 名稱            | 類型                                                |
| :-------------- | :-------------------------------------------------- |
| `provider`      | [`Provider`](../interfaces/lexical_yjs.Provider.md) |
| `name`          | `string`                                            |
| `color`         | `string`                                            |
| `focusing`      | `boolean`                                           |
| `awarenessData` | `object`                                            |

#### 回傳

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:71](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L71)

---

### setLocalStateFocus

▸ **setLocalStateFocus**(`provider`, `name`, `color`, `focusing`, `awarenessData`): `void`

#### 參數

| 名稱            | 類型                                                |
| :-------------- | :-------------------------------------------------- |
| `provider`      | [`Provider`](../interfaces/lexical_yjs.Provider.md) |
| `name`          | `string`                                            |
| `color`         | `string`                                            |
| `focusing`      | `boolean`                                           |
| `awarenessData` | `object`                                            |

#### 回傳

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:88](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L88)

---

### syncCursorPositions

▸ **syncCursorPositions**(`binding`, `provider`): `void`

#### 參數

| 名稱       | 類型                                                |
| :--------- | :-------------------------------------------------- |
| `binding`  | [`Binding`](lexical_yjs.md#binding)                 |
| `provider` | [`Provider`](../interfaces/lexical_yjs.Provider.md) |

#### 回傳

`void`

#### 定義於

[packages/lexical-yjs/src/SyncCursors.ts:399](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/SyncCursors.ts#L399)

---

### syncLexicalUpdateToYjs

▸ **syncLexicalUpdateToYjs**(`binding`, `provider`, `prevEditorState`, `currEditorState`, `dirtyElements`, `dirtyLeaves`, `normalizedNodes`, `tags`): `void`

#### 參數

| 名稱              | 類型                                                |
| :---------------- | :-------------------------------------------------- |
| `binding`         | [`Binding`](lexical_yjs.md#binding)                 |
| `provider`        | [`Provider`](../interfaces/lexical_yjs.Provider.md) |
| `prevEditorState` | [`EditorState`](../classes/lexical.EditorState.md)  |
| `currEditorState` | [`EditorState`](../classes/lexical.EditorState.md)  |
| `dirtyElements`   | `Map`\<`string`, `boolean`\>                        |
| `dirtyLeaves`     | `Set`\<`string`\>                                   |
| `normalizedNodes` | `Set`\<`string`\>                                   |
| `tags`            | `Set`\<`string`\>                                   |

#### 回傳

`void`

#### 定義於

[packages/lexical-yjs/src/SyncEditorStates.ts:194](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/SyncEditorStates.ts#L194)

---

### syncYjsChangesToLexical

▸ **syncYjsChangesToLexical**(`binding`, `provider`, `events`, `isFromUndoManger`): `void`

#### 參數

| 名稱               | 類型                                                |
| :----------------- | :-------------------------------------------------- |
| `binding`          | [`Binding`](lexical_yjs.md#binding)                 |
| `provider`         | [`Provider`](../interfaces/lexical_yjs.Provider.md) |
| `events`           | `YEvent`\<`YText`\>[]                               |
| `isFromUndoManger` | `boolean`                                           |

#### 回傳

`void`

#### 定義於

[packages/lexical-yjs/src/SyncEditorStates.ts:81](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/SyncEditorStates.ts#L81)
