---
'@lexical/link': patch
---

[fix] Open new-tab links from `ClickableLinkPlugin` / `registerClickableLink` without `window.opener`
@mbret
PR: #9303

This prevents the opened page from navigating the editor's tab (reverse tabnabbing). Same-tab opens are unchanged.

Verify: pages opened from editor links that relied on `window.opener`.
