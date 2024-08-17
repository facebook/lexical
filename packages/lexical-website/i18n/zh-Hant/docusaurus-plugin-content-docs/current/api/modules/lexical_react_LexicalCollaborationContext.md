---
id: 'lexical_react_LexicalCollaborationContext'
title: '模組：@lexical/react/LexicalCollaborationContext'
custom_edit_url: null
---

## 類型別名

### CollaborationContextType

Ƭ **CollaborationContextType**: `Object`

#### 類型聲明

| 名稱             | 類型                     |
| :--------------- | :----------------------- |
| `clientID`       | `number`                 |
| `color`          | `string`                 |
| `isCollabActive` | `boolean`                |
| `name`           | `string`                 |
| `yjsDocMap`      | `Map`\<`string`, `Doc`\> |

#### 定義於

[packages/lexical-react/src/LexicalCollaborationContext.ts:13](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalCollaborationContext.ts#L13)

## 變數

### CollaborationContext

• `Const` **CollaborationContext**: `Context`\<[`CollaborationContextType`](lexical_react_LexicalCollaborationContext.md#collaborationcontexttype)\>

#### 定義於

[packages/lexical-react/src/LexicalCollaborationContext.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalCollaborationContext.ts#L41)

## 函式

### useCollaborationContext

▸ **useCollaborationContext**(`username?`, `color?`): [`CollaborationContextType`](lexical_react_LexicalCollaborationContext.md#collaborationcontexttype)

#### 參數

| 名稱        | 類型     |
| :---------- | :------- |
| `username?` | `string` |
| `color?`    | `string` |

#### 回傳

[`CollaborationContextType`](lexical_react_LexicalCollaborationContext.md#collaborationcontexttype)

#### 定義於

[packages/lexical-react/src/LexicalCollaborationContext.ts:49](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalCollaborationContext.ts#L49)
