---
id: "twitter"
title: "Twitter Plugin"
sidebar_label: "Twitter Plugin"
---

This page focuses on implementing the Twitter plugin and the code you need to embed tweets into your editor. You can check out the CodeSandbox directly or view, edit and try out the code in real-time inside the embed. 

To use, enter the URL of the relevant tweet, and it will get embedded into the editor. You will not see any additional embeds if the URL is wrong or doesn't exist.

The example here is very simplified, so you can create your own logic for handling wrong URLs or canceling the embedding. The size of the embed is also adjustable. 

<iframe src="https://codesandbox.io/embed/lexical-twitter-plugin-example-6lh3jg?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/TwitterPlugin.ts,/src/nodes/TweetNode.tsx&theme=dark&view=split"
     style={{width:"100%", height:"700px", border:0, borderRadius: "4px", overflow:"hidden"}}
     title="lexical-twitter-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>