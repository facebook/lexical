---
---

# React 常見問題解答

## 我的應用程式在使用 StrictMode 時無法正常工作，該怎麼辦？

當 hooks 正確使用時，React StrictMode 和 Lexical 通常不會有已知的問題。首先，你應該查看 React 的文檔，以確保你對 `useEffect` 和其他 hooks 的使用符合 React 的規範和指導方針。這是一個很好的起點：[當組件掛載時，我的 effect 為什麼執行了兩次？](https://react.dev/reference/react/useEffect#my-effect-runs-twice-when-the-component-mounts)

一些 Lexical 特有的問題（這些問題是 React 的並發和 StrictMode 語義的結果，而不是 Lexical 的異常）包括：

- 在 React 19 中，`useMemo` 調用會在 StrictMode 重新渲染時被緩存，因此兩次渲染將使用同一個編輯器。如果你有帶有副作用的 `useEffect` 調用（例如，當插件初始化時更新文檔），你應該首先檢查確保這個副作用還沒有發生（例如，通過檢查文檔的狀態或作為 effect 返回的清理函數來撤銷更改）
- `LexicalComposer` 的 `initialConfig` prop 在第一次渲染時只會考慮一次（`useMemo` 用來創建包含編輯器和主題的 `LexicalComposerContext`）
- 如果你在創建編輯器時使用了 `editorState` 參數，它只會在編輯器創建時被調用一次。
- 一般來說，你應該偏好使用返回狀態的 hooks，例如 `useLexicalEditable`（`useLexicalSubscription` 是這種風格的泛化），而不是手動註冊監聽器並期待特定的觸發序列，特別是當其來源是 effect 時。監聽器僅在狀態變更時被調用，在 StrictMode 中狀態可能在初次渲染時已經變更。如果變更是由第一次渲染觸發的，那麼從第二次渲染中註冊的監聽器將不會被調用，你可能會發現第一次渲染時監聽器沒有被觸發，因為那些 effects 在變更 effect 發生之前已經被立即清理了。

## LexicalComposerContext.useLexicalComposerContext: 找不到 LexicalComposerContext

這個錯誤發生的原因只有一個：`useLexicalComposerContext()` hook 被調用在一個不是 `LexicalComposer`、`LexicalNestedComposer` 或 `LexicalComposerContext.Provider` 的子組件中，而這些組件必須來自相同的 Lexical 構建版本。

這個問題最常見的根本原因包括：

- 你嘗試在一個不是 `LexicalComposer` 的子組件中使用 `useLexicalComposerContext()`。如果需要這麼做，你需要通過像 `EditorRefPlugin` 這樣的方式將 context 或編輯器傳遞到樹的上層。
- 你的專案中有多個版本的 Lexical。這可能是因為你有一個依賴項直接依賴於其他版本的 Lexical（這些包應該將 Lexical 作為 `peerDependencies`，但並非所有都如此），或者因為你的專案混合使用了 import 和 require 語句來導入 Lexical（包括相同版本的 esm 和 cjs 構建）。解決這個問題通常需要覆蓋 `package.json` 中的內容，和/或在你的框架或打包工具的配置文件中進行調整。生態系統中有很多工具組合（npm、pnpm、yarn、webpack、vite、next.js 等），所以這種變通方法的語法依賴於你的專案使用的具體工具（甚至是這些工具的版本）。

## 使用開發模式與快速刷新（即熱模塊替換）時的其他問題

根據你使用的快速刷新實現的具體方式，你可能需要標記創建編輯器或實現 LexicalNode 子類的文件為需要完整刷新。當在開發模式下修改文件後，似乎出現問題時，先嘗試刷新頁面。如果這樣解決了問題，那麼標記你正在編輯的文件為需要完整刷新。例如，[Next.js 的快速刷新](https://nextjs.org/docs/architecture/fast-refresh#tips) 有一個 `// @refresh reset` 註釋可以使用。
