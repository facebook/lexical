---
id: 'lexical_react_LexicalTypeaheadMenuPlugin'
title: '模組: @lexical/react/LexicalTypeaheadMenuPlugin'
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

### MenuTextMatch

Ƭ **MenuTextMatch**: `Object`

#### 類型聲明

| 名稱                | 類型     |
| :------------------ | :------- |
| `leadOffset`        | `number` |
| `matchingString`    | `string` |
| `replaceableString` | `string` |

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L37)

---

### TriggerFn

Ƭ **TriggerFn**: (`text`: `string`, `editor`: [`LexicalEditor`](../classes/lexical.LexicalEditor.md)) => [`MenuTextMatch`](lexical_react_LexicalTypeaheadMenuPlugin.md#menutextmatch) \| `null`

#### 類型聲明

▸ (`text`, `editor`): [`MenuTextMatch`](lexical_react_LexicalTypeaheadMenuPlugin.md#menutextmatch) \| `null`

##### 參數

| 名稱     | 類型                                                   |
| :------- | :----------------------------------------------------- |
| `text`   | `string`                                               |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) |

##### 返回

[`MenuTextMatch`](lexical_react_LexicalTypeaheadMenuPlugin.md#menutextmatch) \| `null`

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:581](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L581)

---

### TypeaheadMenuPluginProps

Ƭ **TypeaheadMenuPluginProps**\<`TOption`\>: `Object`

#### 類型參數

| 名稱      | 類型                                                                                 |
| :-------- | :----------------------------------------------------------------------------------- |
| `TOption` | 擴展 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 類型聲明

| 名稱               | 類型                                                                                                                                                                      |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `anchorClassName?` | `string`                                                                                                                                                                  |
| `commandPriority?` | [`CommandListenerPriority`](lexical.md#commandlistenerpriority)                                                                                                           |
| `menuRenderFn`     | [`MenuRenderFn`](lexical_react_LexicalContextMenuPlugin.md#menurenderfn)\<`TOption`\>                                                                                     |
| `onClose?`         | () => `void`                                                                                                                                                              |
| `onOpen?`          | (`resolution`: [`MenuResolution`](lexical_react_LexicalContextMenuPlugin.md#menuresolution)) => `void`                                                                    |
| `onQueryChange`    | (`matchingString`: `string` \| `null`) => `void`                                                                                                                          |
| `onSelectOption`   | (`option`: `TOption`, `textNodeContainingQuery`: [`TextNode`](../classes/lexical.TextNode.md) \| `null`, `closeMenu`: () => `void`, `matchingString`: `string`) => `void` |
| `options`          | `TOption`[]                                                                                                                                                               |
| `parent?`          | `HTMLElement`                                                                                                                                                             |
| `triggerFn`        | [`TriggerFn`](lexical_react_LexicalTypeaheadMenuPlugin.md#triggerfn)                                                                                                      |

#### 定義於

[packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx:191](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx#L191)

## 變數

### PUNCTUATION

• `Const` **PUNCTUATION**: `"\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;"`

#### 定義於

[packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx:34](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx#L34)

---

### SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND

• `Const` **SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND**: [`LexicalCommand`](lexical.md#lexicalcommand)\<\{ `index`: `number` ; `option`: [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) }\>

#### 定義於

[packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx:149](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx#L149)

## 函數

### LexicalTypeaheadMenuPlugin

▸ **LexicalTypeaheadMenuPlugin**\<`TOption`\>(`«destructured»`): `JSX.Element` \| `null`

#### 類型參數

| 名稱      | 類型                                                                                 |
| :-------- | :----------------------------------------------------------------------------------- |
| `TOption` | 擴展 [`MenuOption`](../classes/lexical_react_LexicalContextMenuPlugin.MenuOption.md) |

#### 參數

| 名稱             | 類型                                                                                                            |
| :--------------- | :-------------------------------------------------------------------------------------------------------------- |
| `«destructured»` | [`TypeaheadMenuPluginProps`](lexical_react_LexicalTypeaheadMenuPlugin.md#typeaheadmenupluginprops)\<`TOption`\> |

#### 返回

`JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx:209](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx#L209)

---

### getScrollParent

▸ **getScrollParent**(`element`, `includeHidden`): `HTMLElement` \| `HTMLBodyElement`

#### 參數

| 名稱            | 類型          |
| :-------------- | :------------ |
| `element`       | `HTMLElement` |
| `includeHidden` | `boolean`     |

#### 返回

`HTMLElement` \| `HTMLBodyElement`

#### 定義於

[packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx:117](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx#L117)

---

### useBasicTypeaheadTriggerMatch

▸ **useBasicTypeaheadTriggerMatch**(`trigger`, `«destructured»`): [`TriggerFn`](lexical_react_LexicalTypeaheadMenuPlugin.md#triggerfn)

#### 參數

| 名稱             | 類型     | 預設值      |
| :--------------- | :------- | :---------- |
| `trigger`        | `string` | `undefined` |
| `«destructured»` | `Object` | `undefined` |
| › `maxLength?`   | `number` | `75`        |
| › `minLength?`   | `number` | `1`         |

#### 返回

[`TriggerFn`](lexical_react_LexicalTypeaheadMenuPlugin.md#triggerfn)

#### 定義於

[packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx:154](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx#L154)

---

### useDynamicPositioning

▸ **useDynamicPositioning**(`resolution`, `targetElement`, `onReposition`, `onVisibilityChange?`): `void`

#### 參數

| 名稱                  | 類型                                                                                   |
| :-------------------- | :------------------------------------------------------------------------------------- |
| `resolution`          | `null` \| [`MenuResolution`](lexical_react_LexicalContextMenuPlugin.md#menuresolution) |
| `targetElement`       | `null` \| `HTMLElement`                                                                |
| `onReposition`        | () => `void`                                                                           |
| `onVisibilityChange?` | (`isInView`: `boolean`) => `void`                                                      |

#### 返回

`void`

#### 定義於

[packages/lexical-react/src/shared/LexicalMenu.ts:198](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/shared/LexicalMenu.ts#L198)
