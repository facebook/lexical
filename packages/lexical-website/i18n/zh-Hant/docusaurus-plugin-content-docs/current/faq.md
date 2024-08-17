---
sidebar_position: 7
---

# 常見問題

## 為什麼 Lexical 在許多函數的名稱中使用 `$` 前綴？

最初，Lexical 並沒有 `$` 函數，而是通過回調參數提供這些函數：

```js
// 2020 年中期的 API
editor.update((viewState) => {
  const getRoot = viewState.getRoot();
  ..
});
editor.addTextTransform((viewState) => {
  const getRoot = viewState.getRoot();
  ..
});
```

在內部，這種方法引起了一些負面反饋：

- `viewState` 的術語令人困惑。它實際上並不是 `viewState`，更像是一個操作 `EditorState` 的工具包。
- 對於複雜的更新和轉換，開發者必須在多個層次上傳遞參數。

因此，我們決定利用 "lexical" 範圍來進行 `EditorState` 操作，`$` 代表的就是這一點。

```js
editor.update(() => ...);
editor.registerNodeTransform(FooNode, () => ...);
editor.getEditorState().read(...);
```

如果你之前使用過 React Hooks，可以將 `$` 函數視為遵循類似模式的東西。這些函數顯示了它們的意圖，即它們可以或不能在哪裡使用。這使得開發者可以創建自己的函數，只需將函數前綴為 `$` 即可發出相同的信號。

在內部，我們發現這種做法非常有效，開發者幾乎能夠迅速掌握它。

## 何時發生協調？

協調是通過 [queueMicrotask](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask) 排程的，這意味著它將會非常快地發生，但仍是異步的。這類似於 `setTimeout(reconcile, 0)`，但更立即，或 `Promise.resolve().then(reconcile)`，但開銷更少。這樣做是為了將由單個邏輯事件引起的所有更新批量處理為一次協調。

你可以使用 `editor.update` 的 `discrete` 選項強制同步發生協調（如下所示）。

## 為什麼測試使用 `await editor.update(...)`？

你可能會注意到許多測試是這樣寫的：

```js
await editor.update(updateA);
await editor.update(updateB);
```

一個敏銳的觀察者會注意到這似乎很奇怪，因為 `editor.update()` 返回 `void` 而不是 `Promise<void>`。然而，它確實能如預期般工作，因為 Promise 的實現使用了相同的微任務隊列。

不建議在瀏覽器代碼中依賴這一點，因為它可能依賴於編譯器、打包器和虛擬機的實現細節。最好使用 `discrete` 或 `onUpdate` 回調選項來確保協調已經發生。

忽略其他地方排定的微任務，它大致等同於這段同步代碼：

```js
editor.update(updateA, {discrete: true});
editor.update(updateB, {discrete: true});
```

從高層次來看，操作的順序大致如下：

1. 調用 `editor.update()`
2. 調用 `updateA()` 並更新編輯器狀態
3. `editor.update()` 排程一個協調微任務並返回
4. `await` 排程一個恢復微任務並將控制權交給任務執行者
5. 協調微任務運行，將編輯器狀態與 DOM 進行協調
6. 恢復微任務運行

## 如何監聽用戶文本插入？

在內容可編輯區域中監聽文本插入事件是有問題的。這是由於不同的瀏覽器和第三方擴展與 DOM 互動的方式，常常是錯誤的源頭。雖然可以使用像 `input` 和 `beforeinput` 這樣的 DOM 事件來了解用戶插入文本的一些可能情況，但這些事件並不可靠，且未考慮邊界情況。因此，Lexical 傾向於將任何變更視為可能的用戶輸入，並且不區分這些情況。這對於拼寫檢查、瀏覽器擴展、IME、語音轉文字、螢幕閱讀器和其他外部工具非常重要，因為這些工具常常無法可靠地觸發事件序列（有些甚至不會觸發任何事件！）。

對於想要對文本變更作出反應並可能阻止/修改意圖的情況，建議使用節點轉換。這也與其他可能也希望做相同事情的子系統兼容。

對於只想知道變更的情況，可以使用文本內容監聽器或編輯器更新監聽器來實現。

## 如何清除編輯器的內容？

你可以通過在更新回調中調用 `clear()` 來清除 RootNode 的內容：

```js
editor.update(() => {
  $getRoot().clear();
});
```

## 如何監聽特定的鍵盤按下事件？

你可以利用 Lexical 的命令監聽系統。Lexical 為許多常見的鍵盤操作提供了特定的命令，例如：

- `KEY_ARROW_LEFT_COMMAND`
- `KEY_ARROW_RIGHT_COMMAND`
- `KEY_ARROW_UP_COMMAND`
- `KEY_ARROW_DOWN_COMMAND`
- `KEY_SPACE_COMMAND`
- `KEY_ENTER_COMMAND`
- `KEY_BACKSPACE_COMMAND`
- `KEY_DELETE_COMMAND`
- `KEY_TAB_COMMAND`
- `KEY_ESCAPE_COMMAND`

```js
import {KEY_ENTER_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';

editor.registerCommand(
  KEY_ENTER_COMMAND,
  (event: KeyboardEvent) => {
    // 在這裡處理 Enter 鍵按下事件
    return false;
  },
  COMMAND_PRIORITY_LOW,
);
```

你也可以使用通用的 `KEY_DOWN_COMMAND` 命令來監聽所有鍵盤按下事件。請注意，返回 `true` 會阻止任何其他基於鍵盤的命令觸發，因此在大多數情況下，你會希望從命令監聽器中返回 `false`。

```js
import {KEY_DOWN_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';

editor.registerCommand(
  KEY_DOWN_COMMAND,
  (event: KeyboardEvent) => {
    // 在這裡處理事件
    return false;
  },
  COMMAND_PRIORITY_LOW,
);
```
