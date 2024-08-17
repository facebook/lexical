# 測試

Lexical 依賴於測試來確保更改不會破壞任何功能，使用單元測試和端對端測試的混合方法。

## 單元測試

我們使用 Jest 來運行核心（`lexical` 包）中的單元測試。目標是擁有一個經過充分測試的 API，使我們能夠在不破壞它的情況下添加或修改功能。

要運行測試，使用以下命令：

```
npm run test-unit
```

單元測試可以在 [這個目錄](https://github.com/facebook/lexical/tree/main/packages/lexical/src/__tests__) 找到。

## 端對端 (E2E) 測試

我們使用 [Playwright](https://playwright.dev/) 來在 Chromium、Firefox 和 WebKit 中運行 E2E 測試。在運行這些測試之前，請使用以下命令安裝必要的瀏覽器：

```
npx playwright install
```

這些測試運行在 `lexical-playground` 包中，並且被劃分為主動測試和反應測試（`e2e` 和 `regression` 目錄）。

這種類型的測試目標是在瀏覽器中驗證 Lexical 的行為，而不必了解其內部工作原理。

要運行 E2E 測試，使用以下命令：

```
npm run start &
npm run test-e2e-chromium # 或 -firefox, -webkit
```

E2E 測試可以在 [這個目錄](https://github.com/facebook/lexical/tree/main/packages/lexical-playground/__tests__) 找到。

## 一般指南

編寫測試時，請遵循以下實踐：

- 新功能必須包含測試。
- 沒有測試是太小或太大的。如果可能會出錯，請添加測試。
- 不要合併包含失敗測試的拉取請求，這可能會阻塞其他人和發佈。
- 注意你的抽象：有時創建抽象/工具來使測試文件更小、更少重複是方便的。請確保它們簡單易懂。
