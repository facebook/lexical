---
sidebar_position: 1
---

# 介紹

Lexical 是一個可擴展的 JavaScript 網頁文本編輯框架，強調可靠性、可及性和性能。Lexical 旨在提供最佳的開發者體驗，使你可以輕鬆地原型設計和自信地構建功能。結合高度可擴展的架構，Lexical 允許開發者創建獨特的文本編輯體驗，這些體驗可以在大小和功能上擴展。

Lexical 通過將自己附加到 `contentEditable` 元素上來工作，從那裡你可以使用 Lexical 的聲明式 API 來實現功能，而無需擔心 DOM 周圍的具體邊界情況。事實上，在大多數情況下，你幾乎不需要與 DOM 互動（除非你構建自己的自定義節點）。

<figure class="text--center">
  <img src="/img/docs/modular-design.drawio.svg" alt="Modular Design"/>
  <figcaption>模組化架構允許對功能進行精細控制</figcaption>
</figure>

Lexical 的核心包只有 22KB 的文件大小（經過壓縮和 gzip），你只需為你所需的功能付費。因此，Lexical 可以隨著你的應用擴展和需求增長。此外，在支持懶加載的框架中，你可以推遲 Lexical 插件的加載，直到用戶實際與編輯器互動時再加載—這可以大大幫助提高性能。

## 可以用 Lexical 建立什麼？

Lexical 使得創建複雜的文本編輯體驗變得簡單，這些體驗如果使用內建的瀏覽器工具會非常複雜。我們構建 Lexical 是為了使開發者能夠快速移動，創建滿足特定要求的不同類型的文本體驗。以下是一些（但不是全部）你可以用 Lexical 做的事情：

- 具有比 `<textarea>` 更多需求的簡單純文本編輯器，例如需要提及、自定義表情符號、鏈接和話題標籤等功能。
- 更複雜的富文本編輯器，可用於博客、社交媒體、消息應用程序中的內容發布。
- 一個完整的 WYSIWYG 編輯器，可用於 CMS 或富內容編輯器。
- 實時協作文本編輯體驗，結合了以上許多點。

你可以將 Lexical 視為一個文本編輯 UI 框架。雖然 Lexical 目前僅可用於網頁，但團隊也在嘗試為其他平台構建本地版本。在 Meta，Lexical 驅動了 Facebook、Workplace、Messenger、WhatsApp 和 Instagram 上數億用戶的網頁文本編輯體驗。

## Lexical 的設計

<figure class="text--center">
  <img src="/img/docs/core-conceptual-view.drawio.svg" alt="Conceptual View"/>
</figure>

Lexical 的核心是一個無依賴的文本編輯器框架，允許開發者構建強大、簡單和複雜的編輯器界面。Lexical 有幾個值得探索的概念：

### 編輯器實例

編輯器實例是將所有功能連接在一起的核心。你可以將 `contenteditable` DOM 元素附加到編輯器實例上，並註冊監聽器和命令。最重要的是，編輯器允許對其 `EditorState` 進行更新。你可以使用 `createEditor()` API 創建編輯器實例，但在使用像 `@lexical/react` 這樣的框架綁定時，你通常不需要擔心這些問題，因為這些都會為你處理。

### 編輯器狀態

編輯器狀態是表示你想在 DOM 上顯示的內容的底層數據模型。編輯器狀態包含兩個部分：

- Lexical 節點樹
- Lexical 選擇對象

編輯器狀態一旦創建就是不可變的，要更新它，你必須通過 `editor.update(() => {...})` 來進行。然而，你也可以通過節點轉換或命令處理器“掛鉤”到現有的更新中—這些處理器作為現有更新工作流的一部分被調用，以防止更新的級聯/流水效應。你可以使用 `editor.getEditorState()` 獲取當前的編輯器狀態。

編輯器狀態也可以完全序列化為 JSON，並可以輕鬆地使用 `editor.parseEditorState()` 反序列化回編輯器中。

### 讀取和更新編輯器狀態

當你想讀取和/或更新 Lexical 節點樹時，你必須通過 `editor.update(() => {...})` 來進行。你也可以通過 `editor.read(() => {...})` 或 `editor.getEditorState().read(() => {...})` 進行只讀操作。傳遞給更新或讀取調用的閉包是重要的，必須是同步的。這是唯一一個你擁有完整“lexical”上下文的地方，並提供對編輯器狀態節點樹的訪問。我們鼓勵使用 `$` 前綴函數（例如 `$getRoot()`）來表達這些函數必須在此上下文中調用。嘗試在讀取或更新之外使用它們會觸發運行時錯誤。

對於熟悉 React Hooks 的人，你可以將這些 $functions 視為具有類似功能：
| *特徵* | React Hooks | Lexical $functions |
| -- | -- | -- |
| 命名規則 | `useFunction` | `$function` |
| 上下文要求 | 只能在渲染時調用 | 只能在更新或讀取時調用 |
| 可組合 | Hooks 可以調用其他 hooks | $functions 可以調用其他 $functions |
| 必須是同步的 | ✅ | ✅ |
| 其他規則 | ❌ 必須在相同順序中無條件調用 | ✅ 無 |

節點轉換和命令監聽器在隱式 `editor.update(() => {...})` 上下文中調用。

可以進行嵌套更新或嵌套讀取，但不應該將更新嵌套在讀取中或反之亦然。例如，`editor.update(() => editor.update(() => {...}))` 是被允許的。在 `editor.update` 結束時嵌套 `editor.read` 是被允許的，但這將立即刷新更新，並且在該回調中的任何額外更新將拋出錯誤。

所有 Lexical 節點都依賴於相關的編輯器狀態。除了少數例外情況外，你應該僅在讀取或更新調用中調用 Lexical 節點的方法和訪問屬性（就像 `$` 函數一樣）。Lexical 節點上的方法將首先嘗試從活動編輯器狀態中使用節點的唯一鍵查找最新的（可能是可寫的）版本。邏輯節點的所有版本都具有相同的鍵。這些鍵由編輯器管理，僅在運行時存在（而不是序列化），應該被認為是隨機和不透明的（不要編寫假定鍵的硬編碼值的測試）。

這樣做是因為編輯器狀態的節點樹在協調後會遞歸地凍結，以支持高效的時間旅行（撤銷/重做及類似用例）。更新節點的方法會首先調用 `node.getWritable()`，這會創建一個可寫的節點副本。這通常意味著任何現有的引用（例如局部變量）將引用節點的過時版本，但讓 Lexical 節點始終引用編輯器狀態可以實現更簡單且更不易出錯的數據模型。

:::tip

如果你使用 `editor.read(() => { /* callback */ })`，它會首先刷新任何待處理的更新，因此你將始終看到一致的狀態。當你處於 `editor.update` 中時，你將始終處於待處理狀態，其中節點轉換和 DOM 協調可能尚未運行。
`editor.getEditorState().read()` 將使用最新的協調後的 `EditorState`（在節點轉換、DOM 協調等已經運行後），任何待處理的 `editor.update` 變更將尚未顯示。

:::

### DOM 協調器

Lexical 擁有

自己的 DOM 協調器，它接受一組編輯器狀態（始終是「當前」和「待處理」），並對其進行「差異」比較。然後，它使用這個差異來僅更新需要更改的 DOM 部分。你可以將這視為一種虛擬 DOM，除了 Lexical 能夠跳過大量的差異比較工作，因為它知道在給定的更新中發生了什麼變更。DOM 協調器採用了對內容可編輯的典型啟發式算法有利的性能優化，並能夠自動確保 LTR 和 RTL 語言的一致性。

### 監聽器、節點轉換和命令

除了調用更新之外，Lexical 的大部分工作都是通過監聽器、節點轉換和命令來完成的。這些都是從編輯器派生的，並以 `register` 為前綴。另一個重要的特徵是，所有註冊方法都返回一個函數，以方便取消訂閱。例如，以下是如何監聽 Lexical 編輯器的更新：

```js
const unregisterListener = editor.registerUpdateListener(({editorState}) => {
  // 發生了更新！
  console.log(editorState);
});

// 確保稍後移除監聽器！
unregisterListener();
```

命令是用來將一切連接在一起的通信系統。可以使用 `createCommand()` 創建自定義命令，並通過 `editor.dispatchCommand(command, payload)` 發送到編輯器。Lexical 內部會在按鍵事件觸發和其他重要信號發生時調度命令。命令也可以通過 `editor.registerCommand(command, handler, priority)` 來處理，傳入的命令會按照優先級傳播到所有處理程序，直到一個處理程序停止傳播（類似於瀏覽器中的事件傳播）。
