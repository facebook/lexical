"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SnapshotRenderer = void 0;

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class SnapshotRenderer {
  constructor(resources, snapshots, index) {
    this._snapshots = void 0;
    this._index = void 0;
    this.snapshotName = void 0;
    this._resources = void 0;
    this._snapshot = void 0;
    this._resources = resources;
    this._snapshots = snapshots;
    this._index = index;
    this._snapshot = snapshots[index];
    this.snapshotName = snapshots[index].snapshotName;
  }

  snapshot() {
    return this._snapshots[this._index];
  }

  viewport() {
    return this._snapshots[this._index].viewport;
  }

  render() {
    const visit = (n, snapshotIndex) => {
      // Text node.
      if (typeof n === 'string') return escapeText(n);

      if (!n._string) {
        if (Array.isArray(n[0])) {
          // Node reference.
          const referenceIndex = snapshotIndex - n[0][0];

          if (referenceIndex >= 0 && referenceIndex <= snapshotIndex) {
            const nodes = snapshotNodes(this._snapshots[referenceIndex]);
            const nodeIndex = n[0][1];
            if (nodeIndex >= 0 && nodeIndex < nodes.length) n._string = visit(nodes[nodeIndex], referenceIndex);
          }
        } else if (typeof n[0] === 'string') {
          // Element node.
          const builder = [];
          builder.push('<', n[0]);

          for (const [attr, value] of Object.entries(n[1] || {})) builder.push(' ', attr, '="', escapeAttribute(value), '"');

          builder.push('>');

          for (let i = 2; i < n.length; i++) builder.push(visit(n[i], snapshotIndex));

          if (!autoClosing.has(n[0])) builder.push('</', n[0], '>');
          n._string = builder.join('');
        } else {
          // Why are we here? Let's not throw, just in case.
          n._string = '';
        }
      }

      return n._string;
    };

    const snapshot = this._snapshot;
    let html = visit(snapshot.html, this._index);
    if (!html) return {
      html: '',
      pageId: snapshot.pageId,
      frameId: snapshot.frameId,
      index: this._index
    };
    if (snapshot.doctype) html = `<!DOCTYPE ${snapshot.doctype}>` + html;
    html += `
      <style>*[__playwright_target__="${this.snapshotName}"] { background-color: #6fa8dc7f; }</style>
      <script>${snapshotScript()}</script>
    `;
    return {
      html,
      pageId: snapshot.pageId,
      frameId: snapshot.frameId,
      index: this._index
    };
  }

  resourceByUrl(url) {
    const snapshot = this._snapshot;
    let result; // First try locating exact resource belonging to this frame.

    for (const resource of this._resources) {
      if (resource._monotonicTime >= snapshot.timestamp) break;
      if (resource._frameref !== snapshot.frameId) continue;

      if (resource.request.url === url) {
        result = resource;
        break;
      }
    }

    if (!result) {
      // Then fall back to resource with this URL to account for memory cache.
      for (const resource of this._resources) {
        if (resource._monotonicTime >= snapshot.timestamp) break;
        if (resource.request.url === url) return resource;
      }
    }

    if (result) {
      // Patch override if necessary.
      for (const o of snapshot.resourceOverrides) {
        if (url === o.url && o.sha1) {
          result = { ...result,
            response: { ...result.response,
              content: { ...result.response.content,
                _sha1: o.sha1
              }
            }
          };
          break;
        }
      }
    }

    return result;
  }

}

exports.SnapshotRenderer = SnapshotRenderer;
const autoClosing = new Set(['AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'MENUITEM', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);
const escaped = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
};

function escapeAttribute(s) {
  return s.replace(/[&<>"']/ug, char => escaped[char]);
}

function escapeText(s) {
  return s.replace(/[&<]/ug, char => escaped[char]);
}

function snapshotNodes(snapshot) {
  if (!snapshot._nodes) {
    const nodes = [];

    const visit = n => {
      if (typeof n === 'string') {
        nodes.push(n);
      } else if (typeof n[0] === 'string') {
        for (let i = 2; i < n.length; i++) visit(n[i]);

        nodes.push(n);
      }
    };

    visit(snapshot.html);
    snapshot._nodes = nodes;
  }

  return snapshot._nodes;
}

function snapshotScript() {
  function applyPlaywrightAttributes(shadowAttribute, scrollTopAttribute, scrollLeftAttribute, styleSheetAttribute) {
    const scrollTops = [];
    const scrollLefts = [];

    const visit = root => {
      // Collect all scrolled elements for later use.
      for (const e of root.querySelectorAll(`[${scrollTopAttribute}]`)) scrollTops.push(e);

      for (const e of root.querySelectorAll(`[${scrollLeftAttribute}]`)) scrollLefts.push(e);

      for (const iframe of root.querySelectorAll('iframe')) {
        const src = iframe.getAttribute('src');

        if (!src) {
          iframe.setAttribute('src', 'data:text/html,<body style="background: #ddd"></body>');
        } else {
          // Append query parameters to inherit ?name= or ?time= values from parent.
          const url = new URL('/trace' + src + window.location.search, window.location.href);
          url.searchParams.delete('pointX');
          url.searchParams.delete('pointY');
          iframe.setAttribute('src', url.toString());
        }
      }

      for (const element of root.querySelectorAll(`template[${shadowAttribute}]`)) {
        const template = element;
        const shadowRoot = template.parentElement.attachShadow({
          mode: 'open'
        });
        shadowRoot.appendChild(template.content);
        template.remove();
        visit(shadowRoot);
      }

      if ('adoptedStyleSheets' in root) {
        const adoptedSheets = [...root.adoptedStyleSheets];

        for (const element of root.querySelectorAll(`template[${styleSheetAttribute}]`)) {
          const template = element;
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(template.getAttribute(styleSheetAttribute));
          adoptedSheets.push(sheet);
        }

        root.adoptedStyleSheets = adoptedSheets;
      }
    };

    visit(document);

    const onLoad = () => {
      window.removeEventListener('load', onLoad);

      for (const element of scrollTops) {
        element.scrollTop = +element.getAttribute(scrollTopAttribute);
        element.removeAttribute(scrollTopAttribute);
      }

      for (const element of scrollLefts) {
        element.scrollLeft = +element.getAttribute(scrollLeftAttribute);
        element.removeAttribute(scrollLeftAttribute);
      }

      const search = new URL(window.location.href).searchParams;
      const pointX = search.get('pointX');
      const pointY = search.get('pointY');

      if (pointX) {
        const pointElement = document.createElement('x-pw-pointer');
        pointElement.style.position = 'fixed';
        pointElement.style.backgroundColor = 'red';
        pointElement.style.width = '20px';
        pointElement.style.height = '20px';
        pointElement.style.borderRadius = '10px';
        pointElement.style.margin = '-10px 0 0 -10px';
        pointElement.style.zIndex = '2147483647';
        pointElement.style.left = pointX + 'px';
        pointElement.style.top = pointY + 'px';
        document.documentElement.appendChild(pointElement);
      }
    };

    window.addEventListener('load', onLoad);
  }

  const kShadowAttribute = '__playwright_shadow_root_';
  const kScrollTopAttribute = '__playwright_scroll_top_';
  const kScrollLeftAttribute = '__playwright_scroll_left_';
  const kStyleSheetAttribute = '__playwright_style_sheet_';
  return `\n(${applyPlaywrightAttributes.toString()})('${kShadowAttribute}', '${kScrollTopAttribute}', '${kScrollLeftAttribute}', '${kStyleSheetAttribute}')`;
}