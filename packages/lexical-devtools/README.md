# Lexical DevTools browser extension

This is the source code for the Lexical DevTools browser extension.

[link-chrome]: https://chromewebstore.google.com/detail/lexical-developer-tools/kgljmdocanfjckcgfpcpdoklodllfdpc 'Version published on Chrome Web Store'
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/lexical-developer-tools/ 'Version published on Mozilla Add-ons'

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/chrome/chrome.svg" width="48" alt="Chrome logo" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/kgljmdocanfjckcgfpcpdoklodllfdpc?style=flat&label=%20">][link-chrome]

[<img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/firefox/firefox.svg" width="48" alt="Firefox logo" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/lexical-developer-tools.svg?label=%20">][link-firefox]

## Local development

Lexical DevTools extension uses [WXT](https://wxt.dev/) framework to simplify development. Please refer to [WXT Development Guide](https://wxt.dev/guide/introduction.html) for comprehensive documentation.

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

# Build & upload to Apple Connect
BUILD_VERSION=0 pnpm run safari:archive 
PASSWORD="XXX" pnpm run safari:upload
```

## Publishing flow

**Preconditions:**

If new version of the extension contains big changes to it's UI or functionality, before proceeding, go to the web UI of every marketplace and update screenshots and preview videos.

**Chrome, Firefox:**

Go to the ["Publish DevTools extension to stores" GitHub action](https://github.com/facebook/lexical/actions/workflows/devtools-extension-publish.yml) and start it manually. Increase "Build version" in case publish happens more than once within single Lexical monorepo version.

The published version is `<package.json version>.<build version>`, e.g. `0.52.0.1`. Two things to know before re-running the workflow:

- "Build version" must be a plain integer (`0`, `1`, `2`, …). It is parsed with `parseInt`, so a value like `0.52.1` silently becomes `0` and you end up re-publishing the same version.
- The two stores are submitted independently, so a run can succeed for one and fail for the other — Firefox rejects a version it already has with `409 Conflict: Version X already exists.`. Check which store is `✓` in the log before assuming nothing shipped; a re-run with a bumped build version then leaves the two stores one build number apart, which is harmless.

## Requesting maintainer access to extension marketplaces

Marketplace governance is shared between Meta and [EPAM Open Source Office](https://www.epam.com/open-source). For account access, reach out on the [Lexical Discord](https://discord.gg/KmG4wQnnD9). The access request flow is the following:

**Firefox:**

1. Create Mozilla account: https://accounts.firefox.com/settings
2. Enable two factor authentication for this account.
3. Go to https://addons.mozilla.org/en-US/firefox/users/edit and set a "Display Name" for your account.
4. Email [Vladlen Fedosov](mailto:vladlen_fedosov@epam.com), [Sherry Wong](mailto:potatowagon@meta.com) and [Gerard Rovira](mailto:gerardrovira@meta.com) with the request to add you as a maintainer to Firefox Add-Ons for Lexical Developer Tools extension. Pls include: Mozilla account email; reasoning description.
5. _[For Maintainer]_ Open [authors & license management page](https://addons.mozilla.org/en-US/developers/addon/lexical-developer-tools/ownership) and add new user email.

**Chrome:**

Chrome no longer requires publisher members to share a domain name — the Chrome Web Store [dropped the distinction between individual and group publishers](https://developer.chrome.com/docs/webstore/share-ownership), and an admin can now invite any Google account to a publisher. So the request flow is:

1. Make sure you have a Google account with [2-Step Verification](https://support.google.com/accounts/answer/185839) enabled — the Chrome Web Store requires it to publish or update an item.
2. Ask on Discord to be added as a member of the publisher that owns Lexical Developer Tools. Pls include: Google account email; the role you need; reasoning description.
3. _[For Maintainer]_ Open the publisher's **Settings → Members** page in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), choose "Invite member" and pick a role:
   - **Item Manager** — update metadata and upload new packages. Enough for day-to-day releases.
   - **Editor** — the above, plus publisher settings and trusted testers.
   - **Admin** — the above, plus managing members and roles.
4. Accept the invitation from the email Google sends.

Use the publishing flow described above to release new versions; you only need dashboard access for listing changes such as screenshots, description and preview videos.

## Design

This extension follows typical [Browser DevTools architecture](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools) that includes sereral independent contexts that communicate via events or extension APIs.

<figure align="center">
  <img src="./docs/architecture-diagram.png" alt="DevTools extension architecture" width="526">
  <figcaption>DevTools extension architecture.</figcaption>
</figure>
