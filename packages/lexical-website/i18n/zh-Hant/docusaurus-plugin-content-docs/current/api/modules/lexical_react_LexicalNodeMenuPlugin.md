---
id: 'lexical_react_LexicalNodeMenuPlugin'
title: '模組：@lexical/react/LexicalNodeMenuPlugin'
custom_edit_url: null
---

## 參考

### MenuOption

重新匯出 [MenuOption](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md)

---

### MenuRenderFn

重新匯出 [MenuRenderFn](lexical_react_LexicalContextMenuPlugin.md#menurenderfn)

---

### MenuResolution

重新匯出 [MenuResolution](lexical_react_LexicalContextMenuPlugin.md#menuresolution)

## 類型別名

### NodeMenuPluginProps

Ƭ **NodeMenuPluginProps**\<`TOption`\>: `Object`

#### 類型參數

| 名稱      | 類型                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `TOption` | 擴展自 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 類型聲明

| 名稱               | 類型                                                                                                                                                                      |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `anchorClassName?` | `string`                                                                                                                                                                  |
| `commandPriority?` | [`CommandListenerPriority`](lexical.md#commandlistenerpriority)                                                                                                           |
| `menuRenderFn`     | [`MenuRenderFn`](lexical_react_LexicalContextMenuPlugin.md#menurenderfn)\<`TOption`\>                                                                                     |
| `nodeKey`          | [`NodeKey`](lexical.md#nodekey) \| `null`                                                                                                                                 |
| `onClose?`         | () => `void`                                                                                                                                                              |
| `onOpen?`          | (`resolution`: [`MenuResolution`](lexical_react_LexicalContextMenuPlugin.md#menuresolution)) => `void`                                                                    |
| `onSelectOption`   | (`option`: `TOption`, `textNodeContainingQuery`: [`TextNode`](../classes/lexical.TextNode.md) \| `null`, `closeMenu`: () => `void`, `matchingString`: `string`) => `void` |
| `options`          | `TOption`[]                                                                                                                                                               |
| `parent?`          | `HTMLElement`                                                                                                                                                             |

#### 定義於

[packages/lexical-react/src/LexicalNodeMenuPlugin.tsx:32](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalNodeMenuPlugin.tsx#L32)

## 函式

### LexicalNodeMenuPlugin

▸ **LexicalNodeMenuPlugin**\<`TOption`\>(`«destructured»`): `JSX.Element` \| `null`

#### 類型參數

| 名稱      | 類型                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `TOption` | 擴展自 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 參數

| 名稱             | 類型                                                                                             |
| :--------------- | :----------------------------------------------------------------------------------------------- |
| `«destructured»` | [`NodeMenuPluginProps`](lexical_react_LexicalNodeMenuPlugin.md#nodemenupluginprops)\<`TOption`\> |

#### 回傳

`JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalNodeMenuPlugin.tsx:49](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalNodeMenuPlugin.tsx#L49)
