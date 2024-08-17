# 維護者指南

這是涵蓋 Lexical monorepo 整體組織的神秘知識手冊，包括其約定、特性和配置。

## Monorepo 組織

### 工作區

頂層的 `package.json` 使用 [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) 來配置 monorepo。這意味著所有的套件共享一個頂層的 `package-lock.json`，並且經常使用 `npm run {command} -w {package}` 來執行來自嵌套套件的 `package.json` 中的命令。

### 私有套件

Monorepo 中的某些套件不會發佈到 npm，例如：

- `packages/lexical-devtools` - 用於處理 Lexical 網站的瀏覽器擴展
- `packages/lexical-playground` - [playground.lexical.dev](https://playground.lexical.dev/) 演示網站
- `packages/lexical-website` - [lexical.dev](https://lexical.dev/) docusaurus 網站，您可能正在閱讀的網站
- `packages/shared` - 用於多個庫但不應公開的內部代碼

這些套件，以及任何其他不應發佈到 npm 的套件，都必須在其 `package.json` 中具有 `"private": true` 屬性。如果您有一個正在開發中的套件，最終會公開，但尚未準備好，仍應設置為 `"private": true`，否則工具將會找到並發佈它。

## 套件命名約定

### 整體

| 用途                             | 約定                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| 目錄名稱                         | `packages/lexical-package-name`                                                     |
| 入口點                           | `packages/lexical-package-name/src/index.{ts,tsx}`                                  |
| Flow 類型                        | `packages/lexical-package/flow/LexicalPackageName.js.flow`                          |
| package.json 名稱                | `@lexical/package-name`                                                             |
| 文檔                             | `packages/lexical-package-name/README.md`                                           |
| 單元測試                         | `packages/lexical-package-name/src/__tests__/unit/LexicalPackageName.test.{ts,tsx}` |
| dist（被 gitignore 的構建產品）  | `packages/lexical-package-name/dist`                                                |
| npm（被 gitignore 的預發佈產品） | `packages/lexical-package-name/npm`                                                 |
| www 入口點                       | `packages/lexical-package-name/LexicalPackageName.js`                               |

### 多模組導出（@lexical/react）

某些套件可能有多個模組（目前僅限 `@lexical/react`），這些模組分別導出。在這種情況下，不應有 `index.ts` 入口點文件，每個模組應是頂層的入口點。所有入口點應為 TypeScript 文件，而不是包含 `index.ts` 文件的子目錄。

[update-packages](#npm-run-update-packages) 腳本將確保導出與磁碟上的文件匹配。

## 創建新套件

創建新套件的第一步是創建工作區，這裡有一個 [npm-init](https://docs.npmjs.com/cli/v10/commands/npm-init) 模板，它會根據約定填充一些默認值。

我們將使用的示例是創建 `lexical-eslint-plugin` 的步驟，它將作為 `@lexical/eslint-plugin` 發佈到 npm。

### 創建工作區

```
npm init -w packages/lexical-eslint-plugin
```

這僅自動化了第一步，創建了一個文件：

<details><summary>

`packages/lexical-eslint-plugin/package.json`

</summary>

```json
{
  "name": "@lexical/eslint-plugin",
  "description": "",
  "keywords": ["lexical", "editor"],
  "version": "0.14.3",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/facebook/lexical.git",
    "directory": "packages/lexical-eslint-plugin"
  },
  "main": "LexicalEslintPlugin.js",
  "types": "index.d.ts",
  "bugs": {
    "url": "https://github.com/facebook/lexical/issues"
  },
  "homepage": "https://github.com/facebook/lexical#readme"
}
```

</details>

在繼續之前，需要對這個 package.json 做一些後續步驟：

- 更新描述
- 添加適當的關鍵字

### 創建初始源文件

```
mkdir -p packages/lexical-eslint-plugin/src
code packages/lexical-eslint-plugin/src/index.ts
```

以下是您可能會開始使用的一些最小化示例。我省略了許可證標頭，eslint 標頭/修復器會幫助您處理這些！

<details><summary>

`packages/lexical-eslint-plugin/src/index.ts`

</summary>

```typescript
import {name, version} from '../package.json';

const plugin = {
  meta: {name, version},
  rules: {},
};

export default plugin;
```

</details>

### 運行 update-packages 生成樣板文檔和配置

```
npm run update-packages
```

這將設置 tsconfig、flow 等配置，以識別您的新模組。它還會使用 package.json 中的描述創建初始的 README.md。

### 創建初始單元測試

```
mkdir -p packages/lexical-eslint-plugin/src/__tests__/unit
code packages/lexical-eslint-plugin/src/__tests__/unit/LexicalEslintPlugin.test.ts
```

<details><summary>

`packages/lexical-eslint-plugin/src/__tests__/unit/LexicalEslintPlugin.test.ts`

</summary>

```typescript
import plugin from '@lexical/eslint-plugin';

describe('LexicalEslintPlugin', () => {
  it('exports a plugin with meta and rules', () => {
    expect(Object.keys(plugin).sort()).toMatchObject(['meta', 'rules']);
  });
});
```

</details>

## 開發腳本

### npm run update-packages

此腳本執行：update-version、update-tsconfig、update-flowconfig、create-docs 和 create-www-stubs。這可以在任何時候安全地執行，並確保 package.json 文件的版本、模組解析路徑設置正確，以及填充各種默認值。

這些腳本可以單獨運行，但除非您正在處理其中一個腳本，否則您可以運行所有腳本。

### npm run prepare-release

此命令執行所有預發佈步驟，並讓您檢查將上傳到 npm 的工件。每個公共套件將有一個 npm 目錄，例如 `packages/lexical/npm`，其中包含這些工件。

這還會更新 scripts/error-codes/codes.json，這是生產錯誤代碼到錯誤消息的映射。在標記版本之前，務必提交這個結果。

### npm run ci-check

檢查 Flow、TypeScript、prettier 和 eslint 的問題。這是一個很好的命令，用於提交後（這會自動修復大多數 prettier 問題）和推送 PR 之前運行。

### npm run flow

檢查 Flow 類型

### npm run tsc

檢查 TypeScript 類型

### npm run tsc-extension

檢查 lexical-devtools 擴展的 TypeScript 類型

### npm run test-unit

運行單元測試

### npm run lint

運行 eslint

## 發佈經理腳本

### npm run extract-codes

這將運行一個構建，還提取生成的錯誤代碼文件 codes.json。

這應該至少在每次發佈之前執行，但不應在任何 PR 中執行，因為這會導致序列號之間的衝突。

建議更頻繁地執行這個命令，可能在每次分支合併到主分支時。

codes.json 文件還會在每次生成發佈構建時更新，作為確保這些代碼在發佈中是最新的保障。此命令運行開發構建以提取代碼，這樣會更快，因為它不進行任何優化/壓縮步驟。

### npm run increment-version

增加 monorepo 的版本。`-i` 參數必須是 `minor` | `patch` | `prerelease` 之一。

postversion 腳本將：

- 創建一個本地的 `${npm_package_version}__release` 分支
- `npm run update-version` 更新示例和子套件的 monorepo 依賴
- `npm install` 更新 package-lock.json
- `npm run update-packages` 更新其他生成的配置
- `npm run extract-codes` 提取錯誤代碼

- `npm run update-changelog` 更新 changelog（如果不是預發佈版本）
- 從分支創建版本提交和標籤

這通常通過 `version.yml` GitHub 工作流執行，該工作流還會推送標籤和分支。

### npm run changelog

根據 git 歷史更新 changelog。

### npm run release

_前提條件：_ 所有之前的發佈經理腳本，加上在 git 中創建標籤，可能還有其他步驟。

運行 prepare-release 進行完整構建，然後上傳到 npm。

## 發佈流程

這是公開發佈的當前流程，至少截至 2024 年 5 月（~0.15.0）。

在這個過程中，主分支應該“凍結”（此期間不應合併其他 PR）。這可以避免 GitHub 發佈（第 1 步中從主分支創建）和 NPM 發佈（第 4 步中從主分支創建）之間的內容不匹配。

1. 使用 GitHub Actions “Create New Release Branch” 工作流（`version.yml`）創建一個新版本
2. 提出對該工作流創建的版本分支的 PR
3. 在 PR 通過測試並獲得批准後，合併 PR
4. 在 PR 合併到主分支後，使用 GitHub Actions “Publish to NPM” 工作流（`pre-release.yml`）發佈到 NPM
5. 從第 1 步創建的標籤中創建 GitHub 發佈，並手動編輯發佈說明
6. 在 Discord 的 #announcements 中宣布發佈
