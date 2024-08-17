---
id: 'lexical_react_LexicalAutoEmbedPlugin.EmbedConfig'
title: '介面: EmbedConfig<TEmbedMatchResultData, TEmbedMatchResult>'
custom_edit_url: null
---

[@lexical/react/LexicalAutoEmbedPlugin](../modules/lexical_react_LexicalAutoEmbedPlugin.md).EmbedConfig

## 類型參數

| 名稱                    | 類型                                                                                                                 |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `TEmbedMatchResultData` | `unknown`                                                                                                            |
| `TEmbedMatchResult`     | [`EmbedMatchResult`](../modules/lexical_react_LexicalAutoEmbedPlugin.md#embedmatchresult)\<`TEmbedMatchResultData`\> |

## 屬性

### insertNode

• **insertNode**: (`editor`: [`LexicalEditor`](../classes/lexical.LexicalEditor.md), `result`: `TEmbedMatchResult`) => `void`

#### 類型聲明

▸ (`editor`, `result`): `void`

##### 參數

| 名稱     | 類型                                                   |
| :------- | :----------------------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |
| `result` | `TEmbedMatchResult`                                    |

##### 返回

`void`

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:53](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L53)

---

### parseUrl

• **parseUrl**: (`text`: `string`) => `null` \| `TEmbedMatchResult` \| `Promise`\<`null` \| `TEmbedMatchResult`\>

#### 類型聲明

▸ (`text`): `null` \| `TEmbedMatchResult` \| `Promise`\<`null` \| `TEmbedMatchResult`\>

##### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

##### 返回

`null` \| `TEmbedMatchResult` \| `Promise`\<`null` \| `TEmbedMatchResult`\>

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:49](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L49)

---

### type

• **type**: `string`

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:47](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L47)
