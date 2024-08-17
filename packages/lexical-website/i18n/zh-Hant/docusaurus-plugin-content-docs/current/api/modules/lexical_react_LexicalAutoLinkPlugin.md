---
id: 'lexical_react_LexicalAutoLinkPlugin'
title: '模組：@lexical/react/LexicalAutoLinkPlugin'
custom_edit_url: null
---

## 類型別名

### LinkMatcher

Ƭ **LinkMatcher**: (`text`: `string`) => `LinkMatcherResult` \| `null`

#### 類型聲明

▸ (`text`): `LinkMatcherResult` \| `null`

##### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

##### 回傳

`LinkMatcherResult` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalAutoLinkPlugin.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoLinkPlugin.ts#L45)

## 函式

### AutoLinkPlugin

▸ **AutoLinkPlugin**(`«destructured»`): `JSX.Element` \| `null`

#### 參數

| 名稱             | 類型                                                                  |
| :--------------- | :-------------------------------------------------------------------- |
| `«destructured»` | `Object`                                                              |
| › `matchers`     | [`LinkMatcher`](lexical_react_LexicalAutoLinkPlugin.md#linkmatcher)[] |
| › `onChange?`    | `ChangeHandler`                                                       |

#### 回傳

`JSX.Element` \| `null`

#### 定義於

[packages/lexical-react/src/LexicalAutoLinkPlugin.ts:512](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoLinkPlugin.ts#L512)

---

### createLinkMatcherWithRegExp

▸ **createLinkMatcherWithRegExp**(`regExp`, `urlTransformer?`): (`text`: `string`) => `null` \| \{ `index`: `number` = match.index; `length`: `number` ; `text`: `string` ; `url`: `string` }

#### 參數

| 名稱             | 類型                           |
| :--------------- | :----------------------------- |
| `regExp`         | `RegExp`                       |
| `urlTransformer` | (`text`: `string`) => `string` |

#### 回傳

`fn`

▸ (`text`): `null` \| \{ `index`: `number` = match.index; `length`: `number` ; `text`: `string` ; `url`: `string` }

##### 參數

| 名稱   | 類型     |
| :----- | :------- |
| `text` | `string` |

##### 回傳

`null` \| \{ `index`: `number` = match.index; `length`: `number` ; `text`: `string` ; `url`: `string` }

#### 定義於

[packages/lexical-react/src/LexicalAutoLinkPlugin.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/LexicalAutoLinkPlugin.ts#L47)
