---
id: 'lexical_file.SerializedDocument'
title: '介面: SerializedDocument'
custom_edit_url: null
---

[@lexical/file](../modules/lexical_file.md).SerializedDocument

## 屬性

### editorState

• **editorState**: [`SerializedEditorState`](lexical.SerializedEditorState.md)\<[`SerializedLexicalNode`](../modules/lexical.md#serializedlexicalnode)\>

由 `editorState.toJSON()` 產生的序列化 `editorState`

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:17](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L17)

---

### lastSaved

• **lastSaved**: `number`

文檔創建的時間，以毫秒為單位的 Unix 時間戳（`Date.now()`）

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:19](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L19)

---

### source

• **source**: `string`

文檔的來源，默認為 Lexical

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:21](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L21)

---

### version

• **version**: `string`

產生此文檔的 Lexical 版本

#### 定義於

[packages/lexical-file/src/fileImportExport.ts:23](https://github.com/facebook/lexical/tree/main/packages/lexical-file/src/fileImportExport.ts#L23)
