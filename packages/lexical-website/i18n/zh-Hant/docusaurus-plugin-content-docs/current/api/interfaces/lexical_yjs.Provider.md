---
id: 'lexical_yjs.Provider'
title: '介面: Provider'
custom_edit_url: null
---

[@lexical/yjs](../modules/lexical_yjs.md).Provider

## 屬性

### awareness

• **awareness**: [`ProviderAwareness`](../modules/lexical_yjs.md#providerawareness)

#### 定義於

[packages/lexical-yjs/src/index.ts:37](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L37)

## 方法

### connect

▸ **connect**(): `void` \| `Promise`\<`void`\>

#### 返回

`void` \| `Promise`\<`void`\>

#### 定義於

[packages/lexical-yjs/src/index.ts:38](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L38)

---

### disconnect

▸ **disconnect**(): `void`

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:39](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L39)

---

### off

▸ **off**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                              |
| :----- | :-------------------------------- |
| `type` | `"sync"`                          |
| `cb`   | (`isSynced`: `boolean`) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:40](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L40)

▸ **off**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                          |
| :----- | :---------------------------- |
| `type` | `"update"`                    |
| `cb`   | (`arg0`: `unknown`) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:41](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L41)

▸ **off**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                                        |
| :----- | :------------------------------------------ |
| `type` | `"status"`                                  |
| `cb`   | (`arg0`: \{ `status`: `string` }) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:42](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L42)

▸ **off**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                     |
| :----- | :----------------------- |
| `type` | `"reload"`               |
| `cb`   | (`doc`: `Doc`) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:43](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L43)

---

### on

▸ **on**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                              |
| :----- | :-------------------------------- |
| `type` | `"sync"`                          |
| `cb`   | (`isSynced`: `boolean`) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:44](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L44)

▸ **on**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                                        |
| :----- | :------------------------------------------ |
| `type` | `"status"`                                  |
| `cb`   | (`arg0`: \{ `status`: `string` }) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:45](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L45)

▸ **on**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                          |
| :----- | :---------------------------- |
| `type` | `"update"`                    |
| `cb`   | (`arg0`: `unknown`) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:46](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L46)

▸ **on**(`type`, `cb`): `void`

#### 參數

| 名稱   | 類型                     |
| :----- | :----------------------- |
| `type` | `"reload"`               |
| `cb`   | (`doc`: `Doc`) => `void` |

#### 返回

`void`

#### 定義於

[packages/lexical-yjs/src/index.ts:47](https://github.com/facebook/lexical/tree/main/packages/lexical-yjs/src/index.ts#L47)
