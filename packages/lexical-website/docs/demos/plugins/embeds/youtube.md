---
id: "youtube"
title: "YouTube Plugin"
sidebar_label: "YouTube Plugin"
---

This page focuses on the implementation of the YouTube plugin and the code you need to embed YouTube videos into your editor. You can check out the CodeSandbox directly or view, edit and try out the code in real-time inside the embed. 

To use, enter the URL of the relevant video, and it will get embedded into the editor. If the URL is wrong or doesn't exist, an empty YouTube video will get embedded and show an error when playing the video. 

The example here is very simplified, so you can create your own logic for handling wrong URLs or canceling the embedding. The size of the embed is also adjustable. 

<iframe src="https://codesandbox.io/embed/lexical-youtube-plugin-example-5unxt3?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/YouTubePlugin.ts,/src/nodes/YouTubeNode.tsx&theme=dark&view=split"
     style={{width:"100%", height:"700px", border:0, borderRadius: "4px", overflow:"hidden"}}
     title="lexical-youtube-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>