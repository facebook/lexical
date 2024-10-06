---
id: 'lexical.LexicalEditor'
title: 'Class: LexicalEditor'
custom_edit_url: null
---

[lexical](../modules/lexical.md).LexicalEditor

## 屬性

### constructor

• **constructor**: [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`LexicalEditor`](lexical.LexicalEditor.md)\>

#### 定義於

[packages/lexical/src/LexicalEditor.ts:563](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L563)

---

### version

▪ `Static` **version**: `undefined` \| `string`

此編輯器的版本（自 0.17.1 起）

#### 定義於

[packages/lexical/src/LexicalEditor.ts:566](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L566)

## 函式

### blur

▸ **blur**(): `void`

移除編輯器的焦點。

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1244](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1244)

---

### dispatchCommand

▸ **dispatchCommand**\<`TCommand`\>(`type`, `payload`): `boolean`

派發指定類型的命令，並附帶指定的有效載荷。
這將觸發所有的命令監聽器（由 [LexicalEditor.registerCommand](lexical.LexicalEditor.md#registercommand) 設置）
並將提供的有效載荷傳遞給它們。

#### 類型參數

| 名稱       | 類型                                                                       |
| :--------- | :------------------------------------------------------------------------- |
| `TCommand` | 擴展 [`LexicalCommand`](../modules/lexical.md#lexicalcommand)\<`unknown`\> |

#### 參數

| 名稱      | 類型                                                                           | 描述                     |
| :-------- | :----------------------------------------------------------------------------- | :----------------------- |
| `type`    | `TCommand`                                                                     | 觸發的命令類型。         |
| `payload` | [`CommandPayloadType`](../modules/lexical.md#commandpayloadtype)\<`TCommand`\> | 傳遞給命令監聽器的數據。 |

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:998](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L998)

---

### focus

▸ **focus**(`callbackFn?`, `options?`): `void`

聚焦編輯器。

#### 參數

| 名稱          | 類型                 | 描述                         |
| :------------ | :------------------- | :--------------------------- |
| `callbackFn?` | () => `void`         | 編輯器獲得焦點後執行的函式。 |
| `options`     | `EditorFocusOptions` | 一組選項                     |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1200](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1200)

---

### getDecorators

▸ **getDecorators**\<`T`\>(): `Record`\<`string`, `T`\>

獲取編輯器中所有裝飾器的映射。

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 回傳值

`Record`\<`string`, `T`\>

裝飾器鍵到其裝飾內容的映射

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1009](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1009)

---

### getEditorState

▸ **getEditorState**(): [`EditorState`](lexical.EditorState.md)

獲取當前的編輯器狀態。

#### 回傳值

[`EditorState`](lexical.EditorState.md)

編輯器狀態

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1101](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1101)

---

### getElementByKey

▸ **getElementByKey**(`key`): `null` \| `HTMLElement`

獲取與指定鍵關聯的 LexicalNode 所對應的底層 HTMLElement。

#### 參數

| 名稱  | 類型     | 描述               |
| :---- | :------- | :----------------- |
| `key` | `string` | LexicalNode 的鍵。 |

#### 回傳值

`null` \| `HTMLElement`

由指定鍵關聯的 LexicalNode 渲染的 HTMLElement。

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1093](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1093)

---

### getKey

▸ **getKey**(): `string`

獲取編輯器的鍵。

#### 回傳值

`string`

編輯器鍵

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1027](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1027)

---

### getRootElement

▸ **getRootElement**(): `null` \| `HTMLElement`

#### 回傳值

`null` \| `HTMLElement`

當前的編輯器根元素。如果你想註冊事件監聽器，請通過 [LexicalEditor.registerRootListener](lexical.LexicalEditor.md#registerrootlistener) 進行，因為此引用可能不穩定。

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1019](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1019)

---

### hasNode

▸ **hasNode**\<`T`\>(`node`): `boolean`

用於確認特定節點是否已註冊，通常由插件用來確保它們依賴的節點已被註冊。

#### 類型參數

| 名稱 | 類型                                                                                                                |
| :--- | :------------------------------------------------------------------------------------------------------------------ |
| `T`  | 擴展 [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`LexicalNode`](lexical.LexicalNode.md)\> |

#### 參數

| 名稱   | 類型 |
| :----- | :--- |
| `node` | `T`  |

#### 回傳值

`boolean`

如果編輯器已註冊提供的節點類型，則返回 `true`，否則返回 `false`。

#### 定義於

[packages/lexical/src/LexicalEditor.ts:978](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L978)

---

### hasNodes

▸ **hasNodes**\<`T`\>(`nodes`): `boolean`

用於確認某些節點是否已註冊，通常由插件用來確保它們依賴的節點已被註冊。

#### 類型參數

| 名稱 | 類型                                                                                                                |
| :--- | :------------------------------------------------------------------------------------------------------------------ |
| `T`  | 擴展 [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`LexicalNode`](lexical.LexicalNode.md)\> |

#### 參數

| 名稱    | 類型  |
| :------ | :---- |
| `nodes` | `T`[] |

#### 回傳值

`boolean`

如果編輯器已註冊所有提供的節點類型，則返回 `true`，否則返回 `false`。

#### 定義於

[packages/lexical/src/LexicalEditor.ts:987](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L987)

---

### isComposing

▸ **isComposing**(): `boolean`

#### 回傳值

`boolean`

如果編輯器目前因接受來自 IME 或第三方擴展等輸入而處於「組成」模式，則返回 `true`，否則返回 `false`。

#### 定義於

[packages/lexical/src/LexicalEditor.ts:694](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L694)

---

### isEditable

▸ **isEditable**(): `boolean`

返回 `true` 如果編輯器是可編輯的，否則返回 `false`。

#### 回傳值

`boolean`

如果編輯器是可編輯的，則返回 `true`，否則返回 `false`。

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1261](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1261)

---

### parseEditorState

▸ **parseEditorState**(`maybeStringifiedEditorState`, `updateFn?`): [`EditorState`](lexical.EditorState.md)

解析一個 SerializedEditorState（通常由 [EditorState.toJSON](lexical.EditorState.md#tojson) 產生），並返回一個 EditorState 對象，例如，可以將其傳遞給 [LexicalEditor.setEditorState](lexical.LexicalEditor.md#seteditorstate)。通常，用於從存儲在數據庫中的 JSON 進行反序列化。

#### 參數

| 名稱                          | 類型                                                                                                                                                            |
| :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maybeStringifiedEditorState` | `string` \| [`SerializedEditorState`](../interfaces/lexical.SerializedEditorState.md)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\> |
| `updateFn?`                   | () => `void`                                                                                                                                                    |

#### 回傳值

[`EditorState`](lexical.EditorState.md)

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1151](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1151)

---

### read

▸ **read**\<`T`\>(`callbackFn`): `T`

執行讀取編輯器狀態的操作，編輯器上下文可用（對於導出和唯讀 DOM 操作非常有用）。與 update 類似，但防止任何編輯器狀態的變更。任何待處理的更新將在讀取之前立即被刷新。

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱         | 類型      | 描述                                 |
| :----------- | :-------- | :----------------------------------- |
| `callbackFn` | () => `T` | 一個有權限讀取唯讀編輯器狀態的函式。 |

#### 回傳值

`T`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1170](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1170)

---

### registerCommand

▸ **registerCommand**\<`P`\>(`command`, `listener`, `priority`): () => `void`

註冊一個監聽器，當提供的命令被派發時，該監聽器將會被觸發，受優先級控制。運行在更高優先級的監聽器可以「攔截」命令並通過返回 `true` 防止其傳播到其他處理程序。

註冊在相同優先級級別的監聽器將按註冊順序確定性地運行。

#### 類型參數

| 名稱 |
| :--- |
| `P`  |

#### 參數

| 名稱       | 類型                                                                       | 描述                                       |
| :--------- | :------------------------------------------------------------------------- | :----------------------------------------- |
| `command`  | [`LexicalCommand`](../modules/lexical.md#lexicalcommand)\<`P`\>            | 將觸發回調的命令。                         |
| `listener` | [`CommandListener`](../modules/lexical.md#commandlistener)\<`P`\>          | 當命令被派發時執行的函式。                 |
| `priority` | [`CommandListenerPriority`](../modules/lexical.md#commandlistenerpriority) | 監聽器的相對優先級。 0 \| 1 \| 2 \| 3 \| 4 |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:790](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L790)

---

### registerDecoratorListener

▸ **registerDecoratorListener**\<`T`\>(`listener`): () => `void`

註冊一個監聽器，以便在編輯器的裝飾器對象變更時觸發。裝飾器對象包含所有 DecoratorNode 鍵 -> 其裝飾值。這主要用於外部 UI 框架。

每次編輯器在這些狀態之間轉換時，都會觸發提供的回調，直到調用拆卸函式。

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱       | 類型                       |
| :--------- | :------------------------- |
| `listener` | `DecoratorListener`\<`T`\> |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:734](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L734)

---

### registerEditableListener

▸ **registerEditableListener**(`listener`): () => `void`

註冊一個監聽器，以便在編輯器在可編輯和不可編輯狀態之間變化時觸發。每次編輯器在這些狀態之間轉換時，都會觸發提供的回調，直到調用拆卸函式。

#### 參數

| 名稱       | 類型                                                         |
| :--------- | :----------------------------------------------------------- |
| `listener` | [`EditableListener`](../modules/lexical.md#editablelistener) |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:718](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L718)

---

### registerMutationListener

▸ **registerMutationListener**(`klass`, `listener`, `options?`): () => `void`

註冊一個監聽器，當提供類別的 Lexical 節點發生變更時，該監聽器將會執行。監聽器將接收一個節點列表以及對每個節點進行的變更類型：創建、銷毀或更新。

這的一個常見用例是，當 Lexical 節點被創建時，將 DOM 事件監聽器附加到底層 DOM 節點。[LexicalEditor.getElementByKey](lexical.LexicalEditor.md#getelementbykey) 可以用於此目的。

如果任何現有節點在 DOM 中，且 `skipInitialization` 為 `false`，則監聽器將立即被調用，並以 'registerMutationListener' 的更新標籤，其中所有節點都有 'created' NodeMutation。這可以通過 `skipInitialization` 選項控制（默認目前為 `true`，以便與 0.16.x 版本兼容，但在 0.17.0 版本中將變更為 `false`）。

#### 參數

| 名稱       | 類型                                                                                                           | 描述                       |
| :--------- | :------------------------------------------------------------------------------------------------------------- | :------------------------- |
| `klass`    | [`KlassConstructor`](../modules/lexical.md#klassconstructor)\<typeof [`LexicalNode`](lexical.LexicalNode.md)\> | 你希望監聽變更的節點類別。 |
| `listener` | [`MutationListener`](../modules/lexical.md#mutationlistener)                                                   | 當節點                     |

發生變更時，你希望執行的邏輯。 |
| `options?` | `MutationListenerOptions` | 請參見 MutationListenerOptions |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:854](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L854)

### registerNodeTransform

▸ **registerNodeTransform**\<`T`\>(`klass`, `listener`): () => `void`

註冊一個監聽器，當指定類別的 Lexical 節點在更新過程中被標記為「髒」時，該監聽器將會執行。只要節點被標記為「髒」，監聽器將繼續執行。轉換執行的順序沒有保證！

請注意避免無限循環。參見 [Node Transforms](https://lexical.dev/docs/concepts/transforms)

#### 類型參數

| 名稱 | 類型                                         |
| :--- | :------------------------------------------- |
| `T`  | 擴展 [`LexicalNode`](lexical.LexicalNode.md) |

#### 參數

| 名稱       | 類型                                                  | 描述                               |
| :--------- | :---------------------------------------------------- | :--------------------------------- |
| `klass`    | [`Klass`](../modules/lexical.md#klass)\<`T`\>         | 你希望對其執行轉換的節點類別。     |
| `listener` | [`Transform`](../modules/lexical.md#transform)\<`T`\> | 當節點被更新時，你希望執行的邏輯。 |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:949](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L949)

---

### registerRootListener

▸ **registerRootListener**(`listener`): () => `void`

註冊一個監聽器，以便在編輯器的根 DOM 元素（Lexical 附加到的可編輯內容）發生變更時觸發。這主要用於將事件監聽器附加到根元素。根監聽器函式在註冊時直接執行，然後在任何後續更新時執行。

每次編輯器在這些狀態之間轉換時，都會觸發提供的回調，直到調用拆卸函式。

#### 參數

| 名稱       | 類型           |
| :--------- | :------------- |
| `listener` | `RootListener` |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:769](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L769)

---

### registerTextContentListener

▸ **registerTextContentListener**(`listener`): () => `void`

註冊一個監聽器，以便在 Lexical 將更新提交到 DOM 且編輯器的文本內容從先前狀態變更時觸發。如果文本內容在更新之間相同，則不會通知監聽器。

每次編輯器在這些狀態之間轉換時，都會觸發提供的回調，直到調用拆卸函式。

#### 參數

| 名稱       | 類型                  |
| :--------- | :-------------------- |
| `listener` | `TextContentListener` |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:751](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L751)

---

### registerUpdateListener

▸ **registerUpdateListener**(`listener`): () => `void`

註冊一個監聽器，以便在編輯器更新事件發生時觸發。每次編輯器經過更新（通過 [LexicalEditor.update](lexical.LexicalEditor.md#update)）時，都會觸發提供的回調，直到調用拆卸函式。

#### 參數

| 名稱       | 類型             |
| :--------- | :--------------- |
| `listener` | `UpdateListener` |

#### 回傳值

`fn`

一個可用於清理監聽器的拆卸函式。

▸ (): `void`

##### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:704](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L704)

---

### setEditable

▸ **setEditable**(`editable`): `void`

設置編輯器的可編輯屬性。如果設為 `false`，編輯器將不會在底層的 contenteditable 上監聽用戶事件。

#### 參數

| 名稱       | 類型      | 描述                 |
| :--------- | :-------- | :------------------- |
| `editable` | `boolean` | 設置可編輯模式的值。 |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1269](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1269)

---

### setEditorState

▸ **setEditorState**(`editorState`, `options?`): `void`

以命令式方式設置 EditorState。觸發類似更新的重新調整。

#### 參數

| 名稱          | 類型                                                         | 描述             |
| :------------ | :----------------------------------------------------------- | :--------------- |
| `editorState` | [`EditorState`](lexical.EditorState.md)                      | 設置編輯器的狀態 |
| `options?`    | [`EditorSetOptions`](../modules/lexical.md#editorsetoptions) | 更新的選項。     |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1110](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1110)

---

### setRootElement

▸ **setRootElement**(`nextRootElement`): `void`

以命令式方式設置 Lexical 監聽事件的根 contenteditable 元素。

#### 參數

| 名稱              | 類型                    |
| :---------------- | :---------------------- |
| `nextRootElement` | `null` \| `HTMLElement` |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1035](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1035)

---

### toJSON

▸ **toJSON**(): [`SerializedEditor`](../modules/lexical.md#serializededitor)

返回一個可 JSON 序列化的 JavaScript 對象，而不是 JSON 字符串。你仍然需要調用 JSON.stringify（或其他函式）將狀態轉換為可以傳輸和存儲在數據庫中的字符串。

參見 [LexicalNode.exportJSON](lexical.LexicalNode.md#exportjson)

#### 回傳值

[`SerializedEditor`](../modules/lexical.md#serializededitor)

一個可 JSON 序列化的 JavaScript 對象

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1284](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1284)

---

### update

▸ **update**(`updateFn`, `options?`): `void`

執行對編輯器狀態的更新。`updateFn` 回調是唯一可以安全變更 Lexical 編輯器狀態的地方。

#### 參數

| 名稱       | 類型                                                               | 描述                               |
| :--------- | :----------------------------------------------------------------- | :--------------------------------- |
| `updateFn` | () => `void`                                                       | 一個可以訪問可寫編輯器狀態的函式。 |
| `options?` | [`EditorUpdateOptions`](../modules/lexical.md#editorupdateoptions) | 控制更新行為的選項。               |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalEditor.ts:1189](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalEditor.ts#L1189)
