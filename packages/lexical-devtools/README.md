# Lexical DevTools browser extension

This is the source code for the Lexical DevTools browser extension.

[link-edge]: https://microsoftedge.microsoft.com/addons/detail/lexical-developer-tools/pclbkaofdgafcfhlnimcdhhkkhcabpcb 'Version published on Edge Add-ons Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/lexical-developer-tools/ 'Version published on Mozilla Add-ons'

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/edge/edge.svg" width="48" alt="Chrome" valign="middle">][link-edge] [<img valign="middle" src="https://img.shields.io/badge/dynamic/json?label=%20&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fpclbkaofdgafcfhlnimcdhhkkhcabpcb">][link-edge]

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/lexical-developer-tools.svg?label=%20">][link-firefox]

## Local development

Lexical DevTools extension uses [WXT](https://wxt.dev/) framework to simplify development. Please refer to [WXT Development Guide](https://wxt.dev/guide/development.html) for comprehensive documentation.

**TLDR:**
```bash
$ npm run dev
# In browser: Alt+R to force reload extension
```

**Useful Hints:**
- Extension activity log: [chrome://extensions/?activity=eddfjidloofnnmloonifcjkpmfmlblab](chrome://extensions/?activity=eddfjidloofnnmloonifcjkpmfmlblab)
- Status of ServiceWorkers: [chrome://serviceworker-internals/?devtools](chrome://serviceworker-internals/?devtools)
- WXT Framework debugging: `DEBUG_WXT=1 npm run dev`
- If you detach the Dev Tools in a separate window, and press `Cmd+Option+I` while Dev Tools window is focused, you will invoke the Dev Tools for the Dev Tools window.

**Safari:**

To develop and run Safari version of the extension you (obviously) need a Mac and Xcode installed. Safari on the contrary to other browsers doesn't accept web extensions as a zip archive but rather requires you to [wrap it in native code (Swift) wrapper](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari/). Fortunately this process is mostly automated here.

```bash
# Install Xcode

# Environment setup
sudo xcode-select -s /Applications/Xcode.app
xcodebuild --install
sudo xcodebuild -license
xcodebuild -runFirstLaunch

# Normal operation
npm run dev:safari

# Build & upload to Apple Connect
BUILD_VERSION=0 npm run safari:archive 
PASSWORD="XXX" npm run safari:upload
```

## Design

This extension follows typical [Browser DevTools architecture](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools) that includes sereral independent contexts that communicate via events or extension APIs.

<figure align="center">
  <img src="./docs/architecture-diagram.png" alt="DevTools extension architecture" width="526">
  <figcaption>DevTools extension architecture.</figcaption>
</figure>
