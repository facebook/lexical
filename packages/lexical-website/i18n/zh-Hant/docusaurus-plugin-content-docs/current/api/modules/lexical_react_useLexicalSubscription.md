---
id: 'lexical_react_useLexicalSubscription'
title: '模組: @lexical/react/useLexicalSubscription'
custom_edit_url: null
---

## 參考

### useLexicalSubscription

重新匯出 [useLexicalSubscription](lexical_react_useLexicalSubscription.md#uselexicalsubscription-1)

## 類型別名

### LexicalSubscription

Ƭ **LexicalSubscription**\<`T`\>: `Object`

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 類型聲明

| 名稱             | 類型                                                   |
| :--------------- | :----------------------------------------------------- |
| `initialValueFn` | () => `T`                                              |
| `subscribe`      | (`callback`: (`value`: `T`) => `void`) => () => `void` |

#### 定義於

[packages/lexical-react/src/useLexicalSubscription.tsx:15](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/useLexicalSubscription.tsx#L15)

## 函數

### useLexicalSubscription

▸ **useLexicalSubscription**\<`T`\>(`subscription`): `T`

當值用於渲染時，提供 Lexical 訂閱的捷徑。

#### 類型參數

| 名稱 |
| :--- |
| `T`  |

#### 參數

| 名稱           | 類型                                                                                                                                                              | 描述                                                                                                                                                                   |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription` | (`editor`: [`LexicalEditor`](../classes/lexical.LexicalEditor.md)) => [`LexicalSubscription`](lexical_react_useLexicalSubscription.md#lexicalsubscription)\<`T`\> | 創建 [LexicalSubscription](lexical_react_useLexicalSubscription.md#lexicalsubscription) 的函數。該函數的身份必須是穩定的（例如，定義在模組範圍內或使用 useCallback）。 |

#### 返回

`T`

#### 定義於

[packages/lexical-react/src/useLexicalSubscription.tsx:24](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src/useLexicalSubscription.tsx#L24)
