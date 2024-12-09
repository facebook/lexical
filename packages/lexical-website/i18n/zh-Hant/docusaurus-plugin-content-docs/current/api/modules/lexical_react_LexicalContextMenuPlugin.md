---
id: 'lexical_react_LexicalContextMenuPlugin'
title: '模組：@lexical/react/LexicalContextMenuPlugin'
custom_edit_url: null
---

## 類別

- [MenuOption](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md)

## 類型別名

### ContextMenuRenderFn

Ƭ **ContextMenuRenderFn**\<`TOption`\>: (`anchorElementRef`: `MutableRefObject`\<`HTMLElement` \| `null`\>, `itemProps`: \{ `options`: `TOption`[] ; `selectOptionAndCleanUp`: (`option`: `TOption`) => `void` ; `selectedIndex`: `number` \| `null` ; `setHighlightedIndex`: (`index`: `number`) => `void` }, `menuProps`: \{ `setMenuRef`: (`element`: `HTMLElement` \| `null`) => `void` }) => `ReactPortal` \| `JSX.Element` \| `null`

#### 類型參數

| 名稱      | 類型                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `TOption` | 擴展自 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 類型宣告

▸ (`anchorElementRef`, `itemProps`, `menuProps`): `ReactPortal` \| `JSX.Element` \| `null`

##### 參數

| 名稱                               | 類型                                           |
| :--------------------------------- | :--------------------------------------------- |
| `anchorElementRef`                 | `MutableRefObject`\<`HTMLElement` \| `null`\>  |
| `itemProps`                        | `Object`                                       |
| `itemProps.options`                | `TOption`[]                                    |
| `itemProps.selectOptionAndCleanUp` | (`option`: `TOption`) => `void`                |
| `itemProps.selectedIndex`          | `number` \| `null`                             |
| `itemProps.setHighlightedIndex`    | (`index`: `number`) => `void`                  |
| `menuProps`                        | `Object`                                       |
| `menuProps.setMenuRef`             | (`element`: `HTMLElement` \| `null`) => `void` |

##### 回傳

`ReactPortal` \| `JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalContextMenuPlugin.tsx:28](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalContextMenuPlugin.tsx#L28)

---

### LexicalContextMenuPluginProps

Ƭ **LexicalContextMenuPluginProps**\<`TOption`\>: `Object`

#### 類型參數

| 名稱      | 類型                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `TOption` | 擴展自 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 類型宣告

| 名稱               | 類型                                                                                                                                                                            |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `anchorClassName?` | `string`                                                                                                                                                                        |
| `commandPriority?` | [`CommandListenerPriority`](lexical.md#commandlistenerpriority)                                                                                                                 |
| `menuRenderFn`     | [`ContextMenuRenderFn`](lexical_react_LexicalContextMenuPlugin.md#contextmenurenderfn)\<`TOption`\>                                                                             |
| `onClose?`         | () => `void`                                                                                                                                                                    |
| `onOpen?`          | (`resolution`: [`MenuResolution`](lexical_react_LexicalContextMenuPlugin.md#menuresolution)) => `void`                                                                          |
| `onSelectOption`   | (`option`: `TOption`, `textNodeContainingQuery`: [`LexicalNode`](../classes/lexical.LexicalNode.md) \| `null`, `closeMenu`: () => `void`, `matchingString`: `string`) => `void` |
| `onWillOpen?`      | (`event`: `MouseEvent`) => `void`                                                                                                                                               |
| `options`          | `TOption`[]                                                                                                                                                                     |
| `parent?`          | `HTMLElement`                                                                                                                                                                   |

#### 定義於

[packages/lexical-react/src/LexicalContextMenuPlugin.tsx:41](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalContextMenuPlugin.tsx#L41)

---

### MenuRenderFn

Ƭ **MenuRenderFn**\<`TOption`\>: (`anchorElementRef`: `MutableRefObject`\<`HTMLElement` \| `null`\>, `itemProps`: \{ `options`: `TOption`[] ; `selectOptionAndCleanUp`: (`option`: `TOption`) => `void` ; `selectedIndex`: `number` \| `null` ; `setHighlightedIndex`: (`index`: `number`) => `void` }, `matchingString`: `string` \| `null`) => `ReactPortal` \| `JSX.Element` \| `null`

#### 類型參數

| 名稱      | 類型                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `TOption` | 擴展自 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 類型宣告

▸ (`anchorElementRef`, `itemProps`, `matchingString`): `ReactPortal` \| `JSX.Element` \| `null`

##### 參數

| 名稱                               | 類型                                          |
| :--------------------------------- | :-------------------------------------------- |
| `anchorElementRef`                 | `MutableRefObject`\<`HTMLElement` \| `null`\> |
| `itemProps`                        | `Object`                                      |
| `itemProps.options`                | `TOption`[]                                   |
| `itemProps.selectOptionAndCleanUp` | (`option`: `TOption`) => `void`               |
| `itemProps.selectedIndex`          | `number` \| `null`                            |
| `itemProps.setHighlightedIndex`    | (`index`: `number`) => `void`                 |
| `matchingString`                   | `string` \| `null`                            |

##### 回傳

`ReactPortal` \| `JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:66](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L66)

---

### MenuResolution

Ƭ **MenuResolution**: `Object`

#### 類型宣告

| 名稱      | 類型                                                                         |
| :-------- | :--------------------------------------------------------------------------- |
| `getRect` | () => `DOMRect`                                                              |
| `match?`  | [`MenuTextMatch`](lexical_react_LexicalTypeaheadMenuPlugin.md#menutextmatch) |

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L43)

## 函式

### LexicalContextMenuPlugin

▸ **LexicalContextMenuPlugin**\<`TOption`\>(`«destructured»`): `JSX.Element` \| `null`

#### 類型參數

| 名稱      | 類型                                                                                   |
| :-------- | :------------------------------------------------------------------------------------- |
| `TOption` | 擴展自 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 參數

| 名稱             | 類型                                                                                                                    |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `«destructured»` | [`LexicalContextMenuPluginProps`](lexical_react_LexicalContextMenuPlugin.md#lexicalcontextmenupluginprops)\<`TOption`\> |

#### 回傳

`JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalContextMenuPlugin.tsx:60](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalContextMenuPlugin.tsx#L60)
