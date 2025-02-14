---
id: 'lexical_link'
title: '模組: @lexical/link'
custom_edit_url: null
---

## 類別

- [AutoLinkNode](../classes/lexical_link.AutoLinkNode.md)
- [LinkNode](../classes/lexical_link.LinkNode.md)

## 類型別名

### AutoLinkAttributes

Ƭ **AutoLinkAttributes**: `Partial`\<[`Spread`](lexical.md#spread)\<[`LinkAttributes`](lexical_link.md#linkattributes), \{ `isUnlinked?`: `boolean` }\>\>

#### 定義於

[packages/lexical-link/src/index.ts:38](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L38)

---

### LinkAttributes

Ƭ **LinkAttributes**: `Object`

#### 類型聲明

| 名稱      | 類型               |
| :-------- | :----------------- |
| `rel?`    | `null` \| `string` |
| `target?` | `null` \| `string` |
| `title?`  | `null` \| `string` |

#### 定義於

[packages/lexical-link/src/index.ts:32](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L32)

---

### SerializedAutoLinkNode

Ƭ **SerializedAutoLinkNode**: [`Spread`](lexical.md#spread)\<\{ `isUnlinked`: `boolean` }, [`SerializedLinkNode`](lexical_link.md#serializedlinknode)\>

#### 定義於

[packages/lexical-link/src/index.ts:330](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L330)

---

### SerializedLinkNode

Ƭ **SerializedLinkNode**: [`Spread`](lexical.md#spread)\<\{ `url`: `string` }, [`Spread`](lexical.md#spread)\<[`LinkAttributes`](lexical_link.md#linkattributes), [`SerializedElementNode`](lexical.md#serializedelementnode)\>\>

#### 定義於

[packages/lexical-link/src/index.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L42)

## 變數

### TOGGLE_LINK_COMMAND

• `Const` **TOGGLE_LINK_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<`string` \| \{ `url`: `string` } & [`LinkAttributes`](lexical_link.md#linkattributes) \| `null`\>

#### 定義於

[packages/lexical-link/src/index.ts:472](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L472)

## 函數

### $createAutoLinkNode

▸ **$createAutoLinkNode**(`url`, `attributes?`): [`AutoLinkNode`](../classes/lexical_link.AutoLinkNode.md)

接受一個 URL 並創建一個 AutoLinkNode。AutoLinkNodes 通常在輸入過程中自動生成，這在生成 LinkNode 的按鈕不實用時特別有用。

#### 參數

| 名稱          | 類型                                                                                                                            | 說明                                             |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------- |
| `url`         | `string`                                                                                                                        | LinkNode 應該指向的 URL。                        |
| `attributes?` | `Partial`\<[`Spread`](lexical.md#spread)\<[`LinkAttributes`](lexical_link.md#linkattributes), \{ `isUnlinked?`: `boolean` }\>\> | 可選的 HTML a 標籤屬性。\{ target, rel, title \} |

#### 返回值

[`AutoLinkNode`](../classes/lexical_link.AutoLinkNode.md)

- LinkNode。

#### 定義於

[packages/lexical-link/src/index.ts:454](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L454)

---

### $createLinkNode

▸ **$createLinkNode**(`url`, `attributes?`): [`LinkNode`](../classes/lexical_link.LinkNode.md)

接受一個 URL 並創建一個 LinkNode。

#### 參數

| 名稱          | 類型                                               | 說明                                           |
| :------------ | :------------------------------------------------- | :--------------------------------------------- |
| `url`         | `string`                                           | LinkNode 應該指向的 URL。                      |
| `attributes?` | [`LinkAttributes`](lexical_link.md#linkattributes) | 可選的 HTML a 標籤屬性\{ target, rel, title \} |

#### 返回值

[`LinkNode`](../classes/lexical_link.LinkNode.md)

- LinkNode。

#### 定義於

[packages/lexical-link/src/index.ts:312](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L312)

---

### $isAutoLinkNode

▸ **$isAutoLinkNode**(`node`): node is AutoLinkNode

確定節點是否為 AutoLinkNode。

#### 參數

| 名稱   | 類型                                                                        | 說明           |
| :----- | :-------------------------------------------------------------------------- | :------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) | 要檢查的節點。 |

#### 返回值

node is AutoLinkNode

如果節點是 AutoLinkNode，則返回 true，否則返回 false。

#### 定義於

[packages/lexical-link/src/index.ts:466](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L466)

---

### $isLinkNode

▸ **$isLinkNode**(`node`): node is LinkNode

確定節點是否為 LinkNode。

#### 參數

| 名稱   | 類型                                                                        | 說明           |
| :----- | :-------------------------------------------------------------------------- | :------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) | 要檢查的節點。 |

#### 返回值

node is LinkNode

如果節點是 LinkNode，則返回 true，否則返回 false。

#### 定義於

[packages/lexical-link/src/index.ts:324](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L324)

---

### $toggleLink

▸ **$toggleLink**(`url`, `attributes?`): `void`

生成或更新一個 LinkNode。如果 URL 為 null，也可以刪除 LinkNode，但會保存任何子節點並將它們提升到父節點。

#### 參數

| 名稱         | 類型                                               | 說明                                             |
| :----------- | :------------------------------------------------- | :----------------------------------------------- |
| `url`        | `null` \| `string`                                 | 連結指向的 URL。                                 |
| `attributes` | [`LinkAttributes`](lexical_link.md#linkattributes) | 可選的 HTML a 標籤屬性。\{ target, rel, title \} |

#### 返回值

`void`

#### 定義於

[packages/lexical-link/src/index.ts:482](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L482)

---

### toggleLink

▸ **toggleLink**(`url`, `attributes?`): `void`

#### 參數

| 名稱         | 類型                                               |
| :----------- | :------------------------------------------------- |
| `url`        | `null` \| `string`                                 |
| `attributes` | [`LinkAttributes`](lexical_link.md#linkattributes) |

#### 返回值

`void`

**`已過時`**

被 @lexical/eslint-plugin rules-of-lexical 重命名為 [$toggleLink](lexical_link.md#$togglelink)

#### 定義於

[packages/lexical-link/src/index.ts:599](https://github.com/facebook/lexical/tree/main/packages/lexical-link/src/index.ts#L599)
