# 處理 DOM 事件

在使用 Lexical 時，有時可能需要或有用的是，將 DOM 事件監聽器附加到 Lexical 控制的底層 DOM 節點上。例如，你可能希望在用戶將鼠標懸停在特定節點上時顯示彈出框，或在用戶點擊某個節點時打開模態窗口。這些使用情境（以及其他許多情況）可以通過原生的 DOM 事件監聽器來實現。你可以通過以下三種主要方式來監聽由 Lexical 控制的節點上的 DOM 事件：

## 1. 事件委託

處理編輯器內部的事件的一種方法是對編輯器的根元素（Lexical 附加到的 `contentEditable` 元素）設置監聽器。你可以使用 [Root Listener](https://lexical.dev/docs/concepts/listeners) 來做到這一點。

```js
function myListener(event) {
  // 你可能想根據事件目標進行過濾
  // 以僅包含對特定類型的 DOM 節點的點擊。
  alert('Nice!');
}

const removeRootListener = editor.registerRootListener(
  (rootElement, prevRootElement) => {
    // 為當前根元素添加監聽器
    rootElement.addEventListener('click', myListener);
    // 從舊根元素中移除監聽器 - 確保對 myListener 的引用
    // 是穩定的，以便移除工作並避免內存泄漏。
    prevRootElement.removeEventListener('click', myListener);
  },
);

// 拆除監聽器 - 如果你在使用 React，請從你的 useEffect 回調中返回這個。
removeRootListener();
```

這是一種簡單而高效的方法來處理一些使用情境，因為不需要單獨為每個 DOM 節點附加監聽器。

## 2. 直接附加處理器

在某些情況下，將事件處理器直接附加到每個特定節點的底層 DOM 節點上可能會更好。使用這種方法，你通常不需要在處理器中過濾事件目標，這可以使它更簡單。它還能保證你的處理器不會對你不關心的事件進行處理。這種方法是通過 [Mutation Listener](https://lexical.dev/docs/concepts/listeners) 實現的。

```js
const registeredElements: WeakSet<HTMLElement> = new WeakSet();
const removeMutationListener = editor.registerMutationListener(
  nodeType,
  (mutations) => {
    editor.getEditorState().read(() => {
      for (const [key, mutation] of mutations) {
        const element: null | HTMLElement = editor.getElementByKey(key);
        if (
          // 更新可能是移動，這意味著可能會創建新的 DOM 元素。
          // 在這種情況下，我們也需要添加事件監聽器。
          (mutation === 'created' || mutation === 'updated') &&
          element !== null &&
          !registeredElements.has(element)
        ) {
          registeredElements.add(element);
          element.addEventListener('click', (event: Event) => {
            alert('Nice!');
          });
        }
      }
    });
  },
);

// 拆除監聽器 - 如果你在使用 React，請從你的 useEffect 回調中返回這個。
removeMutationListener();
```

請注意，在這裡我們不需要擔心清理，因為 Lexical 會取消對底層 DOM 節點的引用，並允許 JavaScript 運行時垃圾回收器清理它們的監聽器。

## 3. 使用 NodeEventPlugin

如果你在使用 React，我們已將方法 #2 包裝成一個簡單的 LexicalComposer 插件，你可以用來達到相同的效果，而不必擔心細節：

```jsx
<LexicalComposer>
  <NodeEventPlugin
    nodeType={LinkNode}
    eventType={'click'}
    eventListener={(e: Event) => {
      alert('Nice!');
    }}
  />
</LexicalComposer>
```
