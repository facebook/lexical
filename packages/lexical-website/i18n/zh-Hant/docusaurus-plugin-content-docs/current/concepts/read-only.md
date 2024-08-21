# 閱讀模式 / 編輯模式

Lexical 支援兩種模式：

- 閱讀模式
- 編輯模式

Lexical 的預設行為是編輯模式，或更準確地說，是非唯讀模式。在內部，主要的實現細節是根據模式將 `contentEditable` 設置為 `"false"` 或 `"true"`。特定的插件也可以監聽模式變更，允許它們根據模式自訂 UI 的某些部分。

## 設置模式

要設置模式，可以在創建編輯器時進行設置：

```js
const editor = createEditor({
  editable: true,
  ...
})
```

如果您使用 `@lexical/react`，則可以在傳遞給 `<LexicalComposer>` 的 `initialConfig` 中進行設置：

```jsx
<LexicalComposer initialConfig={{editable: true}}>...</LexicalComposer>
```

在編輯器創建後，可以以命令方式更改模式：

```js
editor.setEditable(true);
```

## 讀取模式

要查找編輯器的當前模式，您可以使用：

```js
const isEditable = editor.isEditable(); // 返回 true 或 false
```

您還可以在編輯器的唯讀模式變更時獲得通知：

```js
const removeEditableListener = editor.registerEditableListener((isEditable) => {
  // 編輯器的模式會被傳遞過來！
  console.log(isEditable);
});

// 當不再需要時，請不要忘記取消註冊監聽器！
removeEditableListener();
```
