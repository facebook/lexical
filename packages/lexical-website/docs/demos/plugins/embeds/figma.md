---
id: "figma"
title: "Figma Plugin"
sidebar_label: "Figma Plugin"
---

This page focuses on implementing the Figma plugin and the code you need to embed Figma files into your editor. You can check out the CodeSandbox directly or view, edit and try out the code in real-time inside the embed. 

To use, enter the URL of the relevant file, and it will get embedded into the editor. If the URL is wrong or doesn't exist, an empty Figma file will get embedded and show an error. 

The example here is very simplified, so you can create your own logic for handling wrong URLs or canceling the embedding. The size of the embed is also adjustable. 

<iframe src="https://codesandbox.io/embed/lexical-figma-plugin-example-0dphp4?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/FigmaPlugin.tsx,/src/nodes/FigmaNode.tsx&theme=dark&view=split"
     style={{width:"100%", height:"700px", border:0, borderRadius: "4px", overflow:"hidden"}}
     title="lexical-figma-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>