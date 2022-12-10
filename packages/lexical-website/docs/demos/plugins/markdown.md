---
id: "markdown"
title: "Markdown Plugin"
sidebar_label: "Markdown Plugin"
---

This page focuses on implementing the markdown plugin and the code you need to incorporate markdown support into your editor. You can check out the CodeSandbox directly or view, edit and try out the code in real-time inside the embed. 

The editor already has some prepopulated text, and you can press the button on the bottom right to turn the current text into Markdown text. If you press again, it will turn back to standard editor text. This is a rich text editor example, and you can see most of the formatting functionality (e.g., bold, italic, underlined text).

Currently, for the purposes of simplicity, the link plugin is very basic, so you will have to press twice on the links to see the URL and edit it. You can further import the AutoLink and ClickableLink plugins to be able to click on the link to jump straight to the website of your preference. 

This plugin is also a part of the actions plugin. You can check out the other tools (e.g., delete all, lock/unlock text) by exploring the playground's source code.

<iframe src="https://codesandbox.io/embed/lexical-markdown-plugin-example-4076jq?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/MarkdownTransformers.ts,/src/plugins/ActionsPlugin.tsx&theme=dark&view=split"
     style={{width:"100%", height:"700px", border:0, borderRadius: "4px", overflow:"hidden"}}
     title="lexical-markdown-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>