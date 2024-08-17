---
id: 'lexical_file'
title: '模組: @lexical/file'
custom_edit_url: null
---

## 介面

- [SerializedDocument](../interfaces/lexical_file.SerializedDocument.md)

## 函數

### editorStateFromSerializedDocument

▸ **editorStateFromSerializedDocument**(`editor`, `maybeStringifiedDocument`): [`EditorState`](../classes/lexical.EditorState.md)

從給定的編輯器和文檔中解析出 EditorState。

#### 參數

| 名稱                       | 類型                                                                                 | 描述                                                |
| :------------------------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `editor`                   | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)                               | Lexical 編輯器                                      |
| `maybeStringifiedDocument` | `string` \| [`SerializedDocument`](../interfaces/lexical_file.SerializedDocument.md) | .lexical 文件的內容（作為 JSON 字串，或已經解析過） |

#### 返回

[`EditorState`](../classes/lexical.EditorState.md)

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:54](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L54)

---

### exportFile

▸ **exportFile**(`editor`, `config?`): `void`

生成一個 .lexical 文件以供瀏覽器下載，包含當前的編輯器狀態。

#### 參數

| 名稱     | 類型                                                           | 描述                                                                                                  |
| :------- | :------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md)         | Lexical 編輯器                                                                                        |
| `config` | `Readonly`\<\{ `fileName?`: `string` ; `source?`: `string` }\> | 一個可選的對象，包含 fileName 和 source。fileName 默認為當前日期（作為字串），source 默認為 Lexical。 |

#### 返回

`void`

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:105](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L105)

---

### importFile

▸ **importFile**(`editor`): `void`

接受一個文件並將其內容輸入到編輯器狀態作為輸入字段。

#### 參數

| 名稱     | 類型                                                   | 描述           |
| :------- | :----------------------------------------------------- | :------------- |
| `editor` | [`LexicalEditor`](../classes/lexical.LexicalEditor.md) | Lexical 編輯器 |

#### 返回

`void`

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:69](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L69)

---

### serializedDocumentFromEditorState

▸ **serializedDocumentFromEditorState**(`editorState`, `config?`): [`SerializedDocument`](../interfaces/lexical_file.SerializedDocument.md)

從給定的 EditorState 生成 SerializedDocument。

#### 參數

| 名稱          | 類型                                                            | 描述                                                                                                        |
| :------------ | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `editorState` | [`EditorState`](../classes/lexical.EditorState.md)              | 要序列化的 EditorState                                                                                      |
| `config`      | `Readonly`\<\{ `lastSaved?`: `number` ; `source?`: `string` }\> | 一個可選的對象，包含 source 和 lastSaved。source 默認為 Lexical，lastSaved 默認為當前的時間（以毫秒表示）。 |

#### 返回

[`SerializedDocument`](../interfaces/lexical_file.SerializedDocument.md)

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:33](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L33)
