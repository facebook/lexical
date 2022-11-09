---
id: "tables"
title: "Table Plugin"
sidebar_label: "Table Plugin"
---

This page focuses on implementing the table plugin and the code you need to incorporate tables into your editor. You can check out the CodeSandbox directly or view, edit and try out the code in real-time inside the embed. 

The below example has all the basic functionality of the tables (e.g., inserting and removing columns and creating headers). Note that the header text is bold, and you can either hardcode it to be simple text or import the relevant styles from Lexical (e.g., italic, bold, underlined) to change the format. There are quite some files to be included and CSS, but they cover most of the table functionality. 

<iframe src="https://codesandbox.io/embed/lexical-table-plugin-example-zd6k44?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/TableToolbar.tsx,/src/plugins/TablePlugin.tsx&theme=dark&view=split"
     style={{width:"100%", height:"700px", border:0, borderRadius: "4px", overflow:"hidden"}}
     title="lexical-table-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>