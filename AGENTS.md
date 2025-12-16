# Lexical Agent Guide

This file provides detailed guidance for AI agents and automated tools working with the Lexical codebase.

## Build, Test, and Development Commands

### Building
- `npm run build` - Build all packages in development mode
- `npm run build-prod` - Clean and build all packages in production mode
- `npm run build-release` - Build production release with error codes
- `npm run build-types` - Build TypeScript type definitions and validate them

### Testing
- `npm run test-unit` - Run all unit tests (Vitest)
- `npm run test-unit-watch` - Run unit tests in watch mode
- `npm run test-e2e-chromium` - Run E2E tests in Chromium (requires dev server running)
- `npm run test-e2e-firefox` - Run E2E tests in Firefox
- `npm run test-e2e-webkit` - Run E2E tests in WebKit
- `npm run debug-test-e2e-chromium` - Run E2E tests in debug mode (headed)
- `npm run debug-test-unit` - Debug unit tests with inspector

For E2E testing workflow:
1. Start the dev server: `npm run start` (or `npm run dev` if you don't need collab)
2. In another terminal: `npm run test-e2e-chromium`

### Development Servers
- `npm run start` - Start playground dev server + collab server (http://localhost:3000)
- `npm run dev` - Start only the playground dev server (no collab)
- `npm run start:website` - Start Docusaurus website (http://localhost:3001)
- `npm run collab` - Start collab server on localhost:1234

### Code Quality
- `npm run lint` - Run ESLint on all files
- `npm run prettier` - Check code formatting
- `npm run prettier:fix` - Auto-fix formatting issues
- `npm run flow` - Run Flow type checker
- `npm run tsc` - Run TypeScript compiler
- `npm run ci-check` - Run all checks (TypeScript, Flow, Prettier, ESLint)

## High-Level Architecture

### Core Concepts

Lexical is built around several key architectural concepts that work together:

**Editor Instance** - Created via `createEditor()`, wires everything together. Manages the EditorState, registers listeners/commands/transforms, and handles DOM reconciliation.

**EditorState** - Immutable data model representing the editor content. Contains:
- A node tree (hierarchical structure of LexicalNodes)
- A selection object (current cursor/selection state)
- Fully serializable to/from JSON

**$ Functions Convention** - Functions prefixed with `$` (e.g., `$getRoot()`, `$getSelection()`) can ONLY be called within:
- `editor.update(() => {...})` - for mutations
- `editor.read(() => {...})` - for read-only access
- Node transforms and command handlers (which have implicit update context)

This is similar to React hooks' restrictions but enforces synchronous context instead of call order.

**Double-Buffering Updates** - When `editor.update()` is called:
1. Current EditorState is cloned as work-in-progress
2. Mutations modify the work-in-progress state
3. Multiple synchronous updates are batched
4. DOM reconciler diffs and applies changes
5. New immutable EditorState becomes current

**Node Immutability & Keys** - All nodes are recursively frozen after reconciliation. Node methods automatically call `node.getWritable()` to create mutable clones. All versions of a logical node share the same runtime-only key, allowing node methods to always reference the latest version from the active EditorState.

### Monorepo Structure

This is a monorepo with packages in `packages/`:

**Core Packages:**
- `lexical` - Core framework (Editor, EditorState, base nodes, selection, updates)
- `@lexical/react` - React bindings (LexicalComposer, plugins as components)
- `@lexical/headless` - Headless editor for server-side/testing

**Feature Packages** (extend core with nodes/commands/utilities):
- `@lexical/rich-text` - Rich text editing (headings, quotes, etc.)
- `@lexical/plain-text` - Plain text editing
- `@lexical/list` - List nodes (ordered/unordered/checklist)
- `@lexical/table` - Table support
- `@lexical/code` - Code block with syntax highlighting
- `@lexical/link` - Link nodes and utilities
- `@lexical/markdown` - Markdown import/export
- `@lexical/html` - HTML serialization
- `@lexical/history` - Undo/redo
- `@lexical/yjs` - Real-time collaboration via Yjs
- And many more...

**Development Packages:**
- `lexical-playground` - Full-featured demo application
- `lexical-website` - Docusaurus documentation site

### Key Architectural Patterns

**Plugin System (React)** - Plugins are React components that hook into the editor lifecycle:
```jsx
function MyPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      // React to updates
    });
  }, [editor]);
  return null;
}
```

**Command Pattern** - Commands are the primary communication mechanism:
- Create with `createCommand()`
- Dispatch with `editor.dispatchCommand(command, payload)`
- Handle with `editor.registerCommand(command, handler, priority)`
- Handlers propagate by priority until one stops propagation

**Node Transforms** - Registered via `editor.registerNodeTransform(NodeClass, transform)`. Called automatically during updates when nodes of that type change. Have implicit update context.

**Listeners** - All `editor.register*()` methods return cleanup functions for easy unsubscription.

## Type System

This codebase uses **both TypeScript and Flow**:
- Source files are primarily TypeScript (`.ts`, `.tsx`)
- Flow type definitions are generated in `packages/*/flow/` directories
- Run `npm run flow` to check Flow types
- Run `npm run tsc` to check TypeScript types
- Both are checked in CI via `npm run ci-check`

When adding/modifying APIs, types must be maintained for both systems.

## Important Development Notes

### Reconciliation and Updates
- `editor.read()` flushes pending updates first, then provides consistent reconciled state
- Inside `editor.update()`, you see pending state (transforms/reconciliation not yet run)
- `editor.getEditorState().read()` always uses latest reconciled state
- Updates can be nested: `editor.update(() => editor.update(...))` is allowed
- Do NOT nest reads in updates or vice versa (except read at end of update, which flushes)

### Node References
Always access node properties/methods within read/update context. Nodes automatically resolve to their latest version via their key. Don't store node references across update boundaries.

### Testing Strategy
- **Unit tests** - Vitest, located in `packages/**/__tests__/unit/**/*.test.{ts,tsx}`
- **E2E tests** - Playwright, located in `packages/lexical-playground/__tests__/e2e/**/*.spec.{ts,mjs}`
- E2E tests require the playground dev server running
- Use `npm run debug-test-e2e-chromium` to debug E2E tests with browser UI

### Custom Nodes
When creating custom nodes:
1. Extend a base node class (TextNode, ElementNode, DecoratorNode)
2. Implement required static methods: `getType()`, `clone()`, `importJSON()`
3. Implement instance methods: `createDOM()`, `updateDOM()`, `exportJSON()`
4. Register with editor config: `nodes: [YourCustomNode]`
5. Export a `$createYourNode()` factory function (follows $ convention)

### Build System
- Uses Rollup for bundling
- Build script: `scripts/build.js`
- Supports multiple build modes: development, production, www (Meta internal)
- TypeScript source → compiled to CommonJS and ESM
- Package manager logic in `scripts/shared/packagesManager.js`
