---
'@lexical/react': patch
---

[fix] A non-editable `ContentEditable` no longer renders `role="textbox"` or widget-only ARIA attributes
@potatowagon
PR: #9270

Verify: accessibility snapshots and selectors that relied on `role="textbox"` for read-only editors.
