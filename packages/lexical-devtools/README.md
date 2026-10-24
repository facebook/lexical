# Lexical DevTools browser extension

This is the source code for the Lexical DevTools browser extension.

[link-chrome]: https://chromewebstore.google.com/detail/lexical-developer-tools/kgljmdocanfjckcgfpcpdoklodllfdpc 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/lexical-developer-tools/ 'Version published on Mozilla Add-ons'
[link-safari]: https://apps.apple.com/us/app/lexical-developer-tools/id6502753400 'Version published on Mac App Store'

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/chrome/chrome.svg" width="48" alt="Chrome logo" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/kgljmdocanfjckcgfpcpdoklodllfdpc?style=flat&label=%20">][link-chrome]

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/firefox/firefox.svg" width="48" alt="Firefox logo" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/lexical-developer-tools.svg?label=%20">][link-firefox]

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/safari/safari.svg" width="48" alt="Safari logo" valign="middle">][link-safari] [<img valign="middle" src="https://img.shields.io/itunes/v/6502753400?label=%20">][link-safari]

## Local development

Lexical DevTools extension uses [WXT](https://wxt.dev/) framework to simplify development. Please refer to [WXT Development Guide](https://wxt.dev/guide/development.html) for comprehensive documentation.

**TLDR:**
```bash
$ pnpm run dev
# In browser: Alt+R to force reload extension
```

**Useful Hints:**
- Extension activity log: [chrome://extensions/?activity=eddfjidloofnnmloonifcjkpmfmlblab](chrome://extensions/?activity=eddfjidloofnnmloonifcjkpmfmlblab)
- Status of ServiceWorkers: [chrome://serviceworker-internals/?devtools](chrome://serviceworker-internals/?devtools)
- WXT Framework debugging: `DEBUG_WXT=1 pnpm run dev`
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
pnpm run dev:safari
```

The Safari extension is no longer published: the Mac App Store listing has been taken down, so `dev:safari` builds it for local use only.

## Publishing

Production (`latest`) npm releases submit Chrome and Firefox extensions for review from the released commit, with build version `0`. Update store screenshots/videos before releases that change the UI.

For extension-only releases or retries, run [Publish DevTools extension to stores](https://github.com/facebook/lexical/actions/workflows/devtools-extension-publish.yml) on the release tag. Increase "Build version" for repeated uploads of the same Lexical version (`<version>.<build_version>`), and wait for pending Chrome reviews to finish. Store submissions can fail independently; retry this workflow without republishing npm packages.

### Store credentials

Enable the Chrome Web Store API in Google Cloud and [link a publishing service account](https://developer.chrome.com/docs/webstore/service-accounts) to the listing's publisher. Configure these repository settings:

| Setting | Type | Value |
| --- | --- | --- |
| `EXTENSION_CHROME_EXTENSION_ID` | Secret | Listing's extension ID |
| `EXTENSION_CHROME_PUBLISHER_ID` | Variable | **Publisher > Settings** in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) |
| `EXTENSION_CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` | Variable | Service account's `client_email` |
| `EXTENSION_CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | Secret | Decoded `private_key` PEM with actual newlines, not the full JSON key |

Firefox requires repository secrets `EXTENSION_FIREFOX_EXTENSION_ID`, `EXTENSION_FIREFOX_JWT_ISSUER`, and `EXTENSION_FIREFOX_JWT_SECRET`.

Confirm Chrome visibility and rollout in the Developer Dashboard. Visibility changes require one manual publish before API publishing. `wxt submit --dry-run` contacts Google.

### Marketplace access

Contact [Vladlen Fedosov](mailto:vladlen_fedosov@epam.com) or [Christopher Howard](mailto:christopher_howard@epam.com) at [EPAM Open Source Office](https://www.epam.com/open-source) for marketplace access. Chrome access requires a [publisher administrator](https://developer.chrome.com/docs/webstore/share-ownership). For Firefox, enable two-factor authentication, set a display name, and provide your Mozilla account email to an [existing maintainer](https://addons.mozilla.org/en-US/developers/addon/lexical-developer-tools/ownership).

## Design

This extension follows typical [Browser DevTools architecture](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools) that includes sereral independent contexts that communicate via events or extension APIs.

<figure align="center">
  <img src="./docs/architecture-diagram.png" alt="DevTools extension architecture" width="526">
  <figcaption>DevTools extension architecture.</figcaption>
</figure>
