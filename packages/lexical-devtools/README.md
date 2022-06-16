# `@lexical/devtools`

This package contains the cross-browser web extension for Lexical Developer Tools.

## Installation

The end goal is to have this extension be publicly available for the end user in each browser extension/app store **(NOTE: currently not available)**:
* [Chrome web store](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en)
* [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
* [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/gpphkfbcpidddadnkolkpfckpihlkkil)

## Local development
You can also build and install this extension from source.

### Prerequisite steps
DevTools depends on local versions of several NPM packages also in this workspace. You'll need to either build or download those packages first.

#### Build from source
To build dependencies from source, run the following command from the root of the repository (`packages/lexical-devtools`):
```sh
cd packages/lexical-devtools`
npm i
```

### Build steps
Once the above packages have been built or downloaded, you can build the extension by running:
```sh
npm run build
```

Then load the extension in your browser of choice following these instructions, selecting either the `build` folder or `build/manifest.json`:
- [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked)
- [Edge](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading)
- [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#trying_it_out)

After the extension has loaded, open the browser DevTools panel, and you should be able to see `Lexical` as one of the panels.