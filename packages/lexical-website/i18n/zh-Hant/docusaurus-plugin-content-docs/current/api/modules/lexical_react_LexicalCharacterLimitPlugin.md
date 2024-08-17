---
id: 'lexical_react_LexicalCharacterLimitPlugin'
title: '模組：@lexical/react/LexicalCharacterLimitPlugin'
custom_edit_url: null
---

## 函式

### CharacterLimitPlugin

▸ **CharacterLimitPlugin**(`«destructured»`): `JSX.Element`

#### 參數

| 名稱             | 類型                                                                     | 預設值            |
| :--------------- | :----------------------------------------------------------------------- | :---------------- |
| `«destructured»` | `Object`                                                                 | `undefined`       |
| › `charset`      | `"UTF-8"` \| `"UTF-16"`                                                  | `'UTF-16'`        |
| › `maxLength`    | `number`                                                                 | `CHARACTER_LIMIT` |
| › `renderer?`    | (`__namedParameters`: \{ `remainingCharacters`: `number` }) => `Element` | `DefaultRenderer` |

#### 回傳

`JSX.Element`

#### 定義於

[packages/lexical-react/src/LexicalCharacterLimitPlugin.tsx:53](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalCharacterLimitPlugin.tsx#L53)
