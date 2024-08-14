---
id: 'lexical_react_LexicalAutoEmbedPlugin.AutoEmbedOption'
title: '類別: AutoEmbedOption'
custom_edit_url: null
---

[@lexical/react/LexicalAutoEmbedPlugin](../modules/lexical_react_LexicalAutoEmbedPlugin.md).AutoEmbedOption

## 層次結構

- [`MenuOption`](lexical_react_LexicalContextMenuPlugin.MenuOption.md)

  ↳ **`AutoEmbedOption`**

## 建構函式

### 建構函式

• **new AutoEmbedOption**(`title`, `options`): [`AutoEmbedOption`](lexical_react_LexicalAutoEmbedPlugin.AutoEmbedOption.md)

#### 參數

| 名稱               | 類型                                                                        |
| :----------------- | :-------------------------------------------------------------------------- |
| `title`            | `string`                                                                    |
| `options`          | `Object`                                                                    |
| `options.onSelect` | (`targetNode`: `null` \| [`LexicalNode`](lexical.LexicalNode.md)) => `void` |

#### 返回

[`AutoEmbedOption`](lexical_react_LexicalAutoEmbedPlugin.AutoEmbedOption.md)

#### 覆寫

[MenuOption](lexical_react_LexicalContextMenuPlugin.MenuOption.md).[constructor](lexical_react_LexicalContextMenuPlugin.MenuOption.md#constructor)

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:65](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L65)

## 屬性

### key

• **key**: `string`

#### 繼承自

[MenuOption](lexical_react_LexicalContextMenuPlugin.MenuOption.md).[key](lexical_react_LexicalContextMenuPlugin.MenuOption.md#key)

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:52](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L52)

---

### onSelect

• **onSelect**: (`targetNode`: `null` \| [`LexicalNode`](lexical.LexicalNode.md)) => `void`

#### 類型宣告

▸ (`targetNode`): `void`

##### 參數

| 名稱         | 類型                                              |
| :----------- | :------------------------------------------------ |
| `targetNode` | `null` \| [`LexicalNode`](lexical.LexicalNode.md) |

##### 返回

`void`

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:64](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L64)

---

### ref

• `選擇性` **ref**: `MutableRefObject`\<`null` \| `HTMLElement`\>

#### 繼承自

[MenuOption](lexical_react_LexicalContextMenuPlugin.MenuOption.md).[ref](lexical_react_LexicalContextMenuPlugin.MenuOption.md#ref)

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:53](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L53)

---

### title

• **title**: `string`

#### 定義於

[packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx:63](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx#L63)

## 方法

### setRefElement

▸ **setRefElement**(`element`): `void`

#### 參數

| 名稱      | 類型                    |
| :-------- | :---------------------- |
| `element` | `null` \| `HTMLElement` |

#### 返回

`void`

#### 繼承自

[MenuOption](lexical_react_LexicalContextMenuPlugin.MenuOption.md).[setRefElement](lexical_react_LexicalContextMenuPlugin.MenuOption.md#setrefelement)

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:61](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L61)
