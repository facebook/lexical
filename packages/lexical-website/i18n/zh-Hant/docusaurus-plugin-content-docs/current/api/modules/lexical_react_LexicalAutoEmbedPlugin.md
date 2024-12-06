---
id: 'lexical_react_LexicalAutoEmbedPlugin'
title: '模組：@lexical/react/LexicalAutoEmbedPlugin'
custom_edit_url: null
---

## 類別

- [AutoEmbedOption](../classes/lexical_react_LexicalAutoEmbedPlugin.AutoEmbedOption.md)

## 介面

- [EmbedConfig](../interfaces/lexical_react_LexicalAutoEmbedPlugin.EmbedConfig.md)

## 類型別名

### EmbedMatchResult

Ƭ **EmbedMatchResult**\<`TEmbedMatchResult`\>: `Object`

#### 類型參數

| 名稱                | 類型      |
| :------------------ | :-------- |
| `TEmbedMatchResult` | `unknown` |

#### 類型聲明

| 名稱    | 類型                |
| :------ | :------------------ |
| `data?` | `TEmbedMatchResult` |
| `id`    | `string`            |
| `url`   | `string`            |

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:36](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L36)

## 變數

### INSERT_EMBED_COMMAND

• `Const` **INSERT_EMBED_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<[`EmbedConfig`](../interfaces/lexical_react_LexicalAutoEmbedPlugin.EmbedConfig.md)[``"type"``]\>

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:59](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L59)

---

### URL_MATCHER

• `Const` **URL_MATCHER**: `RegExp`

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:56](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L56)

## 函式

### LexicalAutoEmbedPlugin

▸ **LexicalAutoEmbedPlugin**\<`TEmbedConfig`\>(`«destructured»`): `JSX.Element` \| `null`

#### 類型參數

| 名稱           | 類型                                                                                                                                                                                                |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEmbedConfig` | 擴展自 [`EmbedConfig`](../interfaces/lexical_react_LexicalAutoEmbedPlugin.EmbedConfig.md)\<`unknown`, [`EmbedMatchResult`](lexical_react_LexicalAutoEmbedPlugin.md#embedmatchresult)\<`unknown`\>\> |

#### 參數

| 名稱             | 類型                                            |
| :--------------- | :---------------------------------------------- |
| `«destructured»` | `LexicalAutoEmbedPluginProps`\<`TEmbedConfig`\> |

#### 回傳

`JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:89](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L89)
