---
id: 'lexical.NodeSelection'
title: 'Class: NodeSelection'
custom_edit_url: null
---

[lexical](../modules/lexical.md).NodeSelection

## 實作

- [`BaseSelection`](../interfaces/lexical.BaseSelection.md)

## 建構函式

### constructor

• **new NodeSelection**(`objects`): [`NodeSelection`](lexical.NodeSelection.md)

#### 參數

| 名稱      | 類型              |
| :-------- | :---------------- |
| `objects` | `Set`\<`string`\> |

#### 回傳值

[`NodeSelection`](lexical.NodeSelection.md)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:272](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L272)

## 屬性

### \_cachedNodes

• **\_cachedNodes**: `null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[\_cachedNodes](../interfaces/lexical.BaseSelection.md#_cachednodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:269](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L269)

---

### \_nodes

• **\_nodes**: `Set`\<`string`\>

#### 定義於

[packages/lexical/src/LexicalSelection.ts:268](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L268)

---

### dirty

• **dirty**: `boolean`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[dirty](../interfaces/lexical.BaseSelection.md#dirty)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:270](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L270)

## 函式

### add

▸ **add**(`key`): `void`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `key` | `string` |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:307](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L307)

---

### clear

▸ **clear**(): `void`

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:319](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L319)

---

### clone

▸ **clone**(): [`NodeSelection`](lexical.NodeSelection.md)

#### 回傳值

[`NodeSelection`](lexical.NodeSelection.md)

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[clone](../interfaces/lexical.BaseSelection.md#clone)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:329](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L329)

---

### delete

▸ **delete**(`key`): `void`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `key` | `string` |

#### 回傳值

`void`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:313](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L313)

---

### extract

▸ **extract**(): [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[extract](../interfaces/lexical.BaseSelection.md#extract)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:333](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L333)

---

### getCachedNodes

▸ **getCachedNodes**(): `null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

`null` \| [`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getCachedNodes](../interfaces/lexical.BaseSelection.md#getcachednodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:278](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L278)

---

### getNodes

▸ **getNodes**(): [`LexicalNode`](lexical.LexicalNode.md)[]

#### 回傳值

[`LexicalNode`](lexical.LexicalNode.md)[]

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getNodes](../interfaces/lexical.BaseSelection.md#getnodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:364](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L364)

---

### getStartEndPoints

▸ **getStartEndPoints**(): `null`

#### 回傳值

`null`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getStartEndPoints](../interfaces/lexical.BaseSelection.md#getstartendpoints)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:303](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L303)

---

### getTextContent

▸ **getTextContent**(): `string`

#### 回傳值

`string`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[getTextContent](../interfaces/lexical.BaseSelection.md#gettextcontent)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:383](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L383)

---

### has

▸ **has**(`key`): `boolean`

#### 參數

| 名稱  | 類型     |
| :---- | :------- |
| `key` | `string` |

#### 回傳值

`boolean`

#### 定義於

[packages/lexical/src/LexicalSelection.ts:325](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L325)

---

### insertNodes

▸ **insertNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                      |
| :------ | :---------------------------------------- |
| `nodes` | [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertNodes](../interfaces/lexical.BaseSelection.md#insertnodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:345](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L345)

---

### insertRawText

▸ **insertRawText**(`text`): `void`

#### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertRawText](../interfaces/lexical.BaseSelection.md#insertrawtext)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:337](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L337)

---

### insertText

▸ **insertText**(): `void`

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[insertText](../interfaces/lexical.BaseSelection.md#inserttext)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:341](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L341)

---

### is

▸ **is**(`selection`): `boolean`

#### 參數

| 名稱        | 類型                                                                |
| :---------- | :------------------------------------------------------------------ |
| `selection` | `null` \| [`BaseSelection`](../interfaces/lexical.BaseSelection.md) |

#### 回傳值

`boolean`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[is](../interfaces/lexical.BaseSelection.md#is)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:286](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L286)

---

### isBackward

▸ **isBackward**(): `boolean`

#### 回傳值

`boolean`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[isBackward](../interfaces/lexical.BaseSelection.md#isbackward)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:299](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L299)

---

### isCollapsed

▸ **isCollapsed**(): `boolean`

#### 回傳值

`boolean`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[isCollapsed](../interfaces/lexical.BaseSelection.md#iscollapsed)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:295](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L295)

---

### setCachedNodes

▸ **setCachedNodes**(`nodes`): `void`

#### 參數

| 名稱    | 類型                                                |
| :------ | :-------------------------------------------------- |
| `nodes` | `null` \| [`LexicalNode`](lexical.LexicalNode.md)[] |

#### 回傳值

`void`

#### 實作自

[BaseSelection](../interfaces/lexical.BaseSelection.md).[setCachedNodes](../interfaces/lexical.BaseSelection.md#setcachednodes)

#### 定義於

[packages/lexical/src/LexicalSelection.ts:282](https://github.com/facebook/lexical/tree/main/packages/lexical/src/LexicalSelection.ts#L282)
