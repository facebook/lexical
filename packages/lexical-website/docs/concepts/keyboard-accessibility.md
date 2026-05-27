# Keyboard Accessibility

Lexical follows the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) keyboard model. This page documents the contracts that plugin authors and host applications rely on, so a Lexical editor can sit inside a larger keyboard-accessible flow without trapping or surprising the user.

## Tab key

By default, `Tab` inside the editor follows the browser's normal focus order — it moves to the next focusable element on the page. There is no keyboard trap.

The optional `TabIndentationPlugin` (`@lexical/react/LexicalTabIndentationPlugin`) takes over `Tab` and uses it for block indent / outdent. Hosts that mount this plugin opt in to that behavior. WCAG 2.1.2 (No Keyboard Trap) still applies — pressing `Escape` blurs the editor (see below), at which point `Tab` leaves the editor again.

## Escape key

Pressing `Escape` while the editor has focus calls `editor.blur()` via the rich-text Escape command handler (registered at `COMMAND_PRIORITY_EDITOR`). After blur, the next `Tab` advances to the page's next focusable element — this is what makes the `TabIndentationPlugin` compliant with WCAG 2.1.2.

Plugin authors who want to intercept `Escape` (modal close, dropdown close, etc.) should register their handler at a higher priority and return `true` to stop propagation. Common patterns already established in the codebase:

| Priority | Caller | Purpose |
| --- | --- | --- |
| `HIGH` | Floating link / dropdown | Close the floating UI, keep editor focus |
| `NORMAL` | Comment plugin | Cancel inline comment editing |
| `LOW` | Image / equation components | Clear `NodeSelection` on a decorator |
| `EDITOR` | Rich text (default) | `editor.blur()` |

Handlers that return `false` let the chain continue, so Escape can still fall through to the default blur even after a higher-priority handler runs.

Some host modals (e.g. the playground's `Modal` component) bind their close handler directly to `window.addEventListener('keydown', ...)` rather than going through `KEY_ESCAPE_COMMAND`. That path runs alongside the table above; it does not participate in the editor's command priority chain.

## Toolbar focus jump

The playground uses `useFocusManager` (`@lexical/react/useFocusManager`) to provide a documented shortcut for moving focus from the editor to the toolbar without tabbing through the page. The hook listens for `Alt+F10` inside the editor and moves focus to the toolbar's first focusable item. While focus is in the toolbar, pressing `Escape` restores both focus and the editor's prior selection via `editor.focus()`.

This matches the WAI-ARIA editor menubar pattern and the convention used by Word and CKEditor. Hosts that don't mount `useFocusManager` get the default browser flow (Tab in, Tab out).

## Toolbar arrow-key navigation

Toolbars that opt into `useRovingTabIndex` (`@lexical/react/useRovingTabIndex`) collapse to a single tab stop: arrow keys move between items inside the toolbar; `Tab` moves past the toolbar as a whole. Items keep `tabindex="-1"` except the active one (`tabindex="0"`). Tracks the WAI-ARIA toolbar pattern.

## Modal focus trap

`useFocusTrap` (`@lexical/react/useFocusTrap`) cycles `Tab` / `Shift+Tab` inside a modal container and restores focus to the previously-focused element on unmount. Escape is **not** intercepted by the hook — modal owners handle the close key themselves, so the editor's Escape contract above stays predictable.

## Screen reader announcements

`useAriaLiveRegion` (`@lexical/react/useAriaLiveRegion`) mounts a visually-hidden `aria-live` region (default `polite`) and returns an `announce(message)` function. The region is removed on unmount. Useful for status announcements (mode changes, format toggles, etc.) — see the playground's `EditorModeAnnouncePlugin` for an example that pairs the hook with `editor.registerEditableListener`.

## Component ARIA quick reference

Where Lexical already applies ARIA attributes today (set directly in each component's `createDOM` / `updateDOM` or, for non-node UI, in the surrounding React tree):

| Component | role | aria-\* attributes |
| --- | --- | --- |
| `ToolbarPlugin` (playground) | `toolbar` | `aria-label` |
| `Modal` (playground) | `dialog` | `aria-modal`, `aria-labelledby` |
| `LexicalListItemNode` (check list leaf) | `checkbox` | `aria-checked` |
| `LexicalMenu` typeahead popup | `listbox` | `aria-label`, `aria-controls` |
| `EquationNode` (playground) | `math` | `aria-label` |
| `useAriaLiveRegion` region | `status` | `aria-live`, `aria-atomic` |

Custom nodes follow the same pattern: set the attributes in `createDOM` and re-apply in `updateDOM` when the state they reflect changes. There is no central ARIA contract on `LexicalNode`; treat each subclass's `createDOM` as the source of truth.

## Browser notes

Lexical relies on the standard DOM `Escape` contract — verified on Chrome and Safari (macOS, normal window). Safari in fullscreen intercepts `Escape` at the browser level to exit fullscreen; that is the browser's contract, not Lexical's.

## What this page does not cover

- Touch / mobile screen reader gestures. The hooks above share the same DOM contracts with mobile (TalkBack, VoiceOver iOS) but mobile has not been exercised in this set of changes.
- High contrast / forced-colors theming. See the playground's `index.css` `@media (forced-colors: active)` block for a baseline.
