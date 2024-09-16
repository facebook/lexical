---
id: 'lexical_react_useLexicalTextEntity'
title: '模組: @lexical/react/useLexicalTextEntity'
custom_edit_url: null
---

## 函數

### useLexicalTextEntity

▸ **useLexicalTextEntity**\<`T`\>(`getMatch`, `targetNode`, `createNode`): `void`

#### 類型參數

| 名稱 | 類型                                              |
| :--- | :------------------------------------------------ |
| `T`  | 擴展 [`TextNode`](../classes/lexical.TextNode.md) |

#### 參數

| 名稱         | 類型                                                                         |
| :----------- | :--------------------------------------------------------------------------- |
| `getMatch`   | (`text`: `string`) => `null` \| [`EntityMatch`](lexical_text.md#entitymatch) |
| `targetNode` | [`Klass`](lexical.md#klass)\<`T`\>                                           |
| `createNode` | (`textNode`: [`TextNode`](../classes/lexical.TextNode.md)) => `T`            |

#### 返回

`void`

#### 定義於

[packages/lexical-react/src/useLexicalTextEntity.ts:17](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/useLexicalTextEntity.ts#L17)
