---
id: 'lexical_react_LexicalContentEditable'
title: '模組: @lexical/react/LexicalContentEditable'
custom_edit_url: null
---

## 類型別名

### Props

Ƭ **Props**: `Omit`\<`ElementProps`, `"editor"`\> & \{ `aria-placeholder?`: `void` ; `placeholder?`: `null` } \| \{ `aria-placeholder`: `string` ; `placeholder`: (`isEditable`: `boolean`) => `null` \| `JSX.Element` \| `JSX.Element` }

#### 定義於

[packages/lexical-react/src/LexicalContentEditable.tsx:18](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalContentEditable.tsx#L18)

## 函數

### ContentEditable

▸ **ContentEditable**(`props`): `ReactNode`

#### 參數

| 名稱    | 類型                                                                                           |
| :------ | :--------------------------------------------------------------------------------------------- |
| `props` | [`Props`](lexical_react_LexicalContentEditable.md#props) & `RefAttributes`\<`HTMLDivElement`\> |

#### 返回

`ReactNode`

#### 定義於

[packages/lexical-react/src/LexicalContentEditable.tsx:32](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalContentEditable.tsx#L32)
