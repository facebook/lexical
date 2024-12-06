---
id: 'lexical_hashtag'
title: '模組: @lexical/hashtag'
custom_edit_url: null
---

## 類別

- [HashtagNode](../classes/lexical_hashtag.HashtagNode.md)

## 函數

### $createHashtagNode

▸ **$createHashtagNode**(`text?`): [`HashtagNode`](../classes/lexical_hashtag.HashtagNode.md)

生成一個 HashtagNode，這是一個符合 # 後跟一些文本格式的字串，例如 #lexical。

#### 參數

| 名稱   | 類型     | 預設值 | 說明                          |
| :----- | :------- | :----- | :---------------------------- |
| `text` | `string` | `''`   | 用於 HashtagNode 內部的文本。 |

#### 返回值

[`HashtagNode`](../classes/lexical_hashtag.HashtagNode.md)

- 包含嵌入文本的 HashtagNode。

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L69)

---

### $isHashtagNode

▸ **$isHashtagNode**(`node`): node is HashtagNode

確定節點是否為 HashtagNode。

#### 參數

| 名稱   | 類型                                                                        | 說明           |
| :----- | :-------------------------------------------------------------------------- | :------------- |
| `node` | `undefined` \| `null` \| [`LexicalNode`](../classes/lexical.LexicalNode.md) | 要檢查的節點。 |

#### 返回值

node is HashtagNode

如果節點是 HashtagNode，則返回 true，否則返回 false。

#### 定義於

[packages/lexical-hashtag/src/LexicalHashtagNode.ts:78](https://github.com/facebook/lexical/tree/main/packages/lexical-hashtag/src/LexicalHashtagNode.ts#L78)
