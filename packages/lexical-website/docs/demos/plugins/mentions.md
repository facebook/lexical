---
id: "mentions"
title: "Mentions Plugin"
sidebar_label: "Mentions Plugin"
---

This page focuses on implementing the mentions plugin and the code you need to incorporate mentions into your editor. You can check out the CodeSandbox directly or view, edit and try out the code in real-time inside the embed. 

In the simplified example below, there are dummy mentions, so you can change them depending on preference or pull the data from an external source by adding extra logic. There are no respective images for the dummy mentions, but the plugin handles images in its simplified form, so it is possible to add icons next to the names. Currently, the search options are limited to 5, but it is also easily changeable. 

**How to use**: type @ and any letter. If there is a name associated with the letters you typed, it will be shown in the typeahead below the text. If the mention is successful, it will be highlighted.

<iframe src="https://codesandbox.io/embed/lexical-mention-plugin-example-ojn42n?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/MentionsPlugin.tsx,/src/nodes/MentionNode.ts&theme=dark&view=split"
     style={{width:100+"%", height:700+"px", border:0, "border-radius": 4+"px", overflow:"hidden"}}
     title="lexical-plain-text-example (forked)"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>