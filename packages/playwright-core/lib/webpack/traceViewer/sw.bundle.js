(() => {
  'use strict';
  var e = {
      967: (e, t) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.VERSION = void 0),
          (t.VERSION = 3);
      },
      626: (e, t) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.SnapshotRenderer = void 0),
          (t.SnapshotRenderer = class {
            constructor(e, t, n) {
              (this._snapshots = void 0),
                (this._index = void 0),
                (this.snapshotName = void 0),
                (this._resources = void 0),
                (this._snapshot = void 0),
                (this._resources = e),
                (this._snapshots = t),
                (this._index = n),
                (this._snapshot = t[n]),
                (this.snapshotName = t[n].snapshotName);
            }
            snapshot() {
              return this._snapshots[this._index];
            }
            viewport() {
              return this._snapshots[this._index].viewport;
            }
            render() {
              const e = (t, r) => {
                  if ('string' == typeof t)
                    return t.replace(/[&<]/gu, (e) => s[e]);
                  if (!t._string)
                    if (Array.isArray(t[0])) {
                      const n = r - t[0][0];
                      if (n >= 0 && n <= r) {
                        const s = (function (e) {
                            if (!e._nodes) {
                              const t = [],
                                n = (e) => {
                                  if ('string' == typeof e) t.push(e);
                                  else if ('string' == typeof e[0]) {
                                    for (let t = 2; t < e.length; t++) n(e[t]);
                                    t.push(e);
                                  }
                                };
                              n(e.html), (e._nodes = t);
                            }
                            return e._nodes;
                          })(this._snapshots[n]),
                          r = t[0][1];
                        r >= 0 && r < s.length && (t._string = e(s[r], n));
                      }
                    } else if ('string' == typeof t[0]) {
                      const o = [];
                      o.push('<', t[0]);
                      for (const [e, n] of Object.entries(t[1] || {}))
                        o.push(
                          ' ',
                          e,
                          '="',
                          n.replace(/[&<>"']/gu, (e) => s[e]),
                          '"',
                        );
                      o.push('>');
                      for (let n = 2; n < t.length; n++) o.push(e(t[n], r));
                      n.has(t[0]) || o.push('</', t[0], '>'),
                        (t._string = o.join(''));
                    } else t._string = '';
                  return t._string;
                },
                t = this._snapshot;
              let r = e(t.html, this._index);
              return r
                ? (t.doctype && (r = `<!DOCTYPE ${t.doctype}>` + r),
                  (r += `\n      <style>*[__playwright_target__="${
                    this.snapshotName
                  }"] { background-color: #6fa8dc7f; }</style>\n      <script>\n(${function (
                    e,
                    t,
                    n,
                    s,
                  ) {
                    const r = [],
                      o = [],
                      a = (i) => {
                        for (const e of i.querySelectorAll(`[${t}]`)) r.push(e);
                        for (const e of i.querySelectorAll(`[${n}]`)) o.push(e);
                        for (const e of i.querySelectorAll('iframe')) {
                          const t = e.getAttribute('src');
                          t
                            ? e.setAttribute(
                                'src',
                                new URL(
                                  t + window.location.search,
                                  window.location.href,
                                ).toString(),
                              )
                            : e.setAttribute(
                                'src',
                                'data:text/html,<body style="background: #ddd"></body>',
                              );
                        }
                        for (const t of i.querySelectorAll(`template[${e}]`)) {
                          const e = t,
                            n = e.parentElement.attachShadow({mode: 'open'});
                          n.appendChild(e.content), e.remove(), a(n);
                        }
                        if ('adoptedStyleSheets' in i) {
                          const e = [...i.adoptedStyleSheets];
                          for (const t of i.querySelectorAll(
                            `template[${s}]`,
                          )) {
                            const n = t,
                              r = new CSSStyleSheet();
                            r.replaceSync(n.getAttribute(s)), e.push(r);
                          }
                          i.adoptedStyleSheets = e;
                        }
                      };
                    a(document);
                    const i = () => {
                      window.removeEventListener('load', i);
                      for (const e of r)
                        (e.scrollTop = +e.getAttribute(t)),
                          e.removeAttribute(t);
                      for (const e of o)
                        (e.scrollLeft = +e.getAttribute(n)),
                          e.removeAttribute(n);
                      const e = new URL(window.location.href).searchParams,
                        s = e.get('pointX'),
                        a = e.get('pointY');
                      if (s) {
                        const e = document.createElement('x-pw-pointer');
                        (e.style.position = 'fixed'),
                          (e.style.backgroundColor = 'red'),
                          (e.style.width = '20px'),
                          (e.style.height = '20px'),
                          (e.style.borderRadius = '10px'),
                          (e.style.margin = '-10px 0 0 -10px'),
                          (e.style.zIndex = '2147483647'),
                          (e.style.left = s + 'px'),
                          (e.style.top = a + 'px'),
                          document.documentElement.appendChild(e);
                      }
                    };
                    window.addEventListener('load', i);
                  }.toString()})('__playwright_shadow_root_', '__playwright_scroll_top_', '__playwright_scroll_left_', '__playwright_style_sheet_')<\/script>\n    `),
                  {
                    html: r,
                    pageId: t.pageId,
                    frameId: t.frameId,
                    index: this._index,
                  })
                : {
                    html: '',
                    pageId: t.pageId,
                    frameId: t.frameId,
                    index: this._index,
                  };
            }
            resourceByUrl(e) {
              const t = this._snapshot;
              let n;
              for (const s of this._resources) {
                if (s._monotonicTime >= t.timestamp) break;
                if (s._frameref === t.frameId && s.request.url === e) {
                  n = s;
                  break;
                }
              }
              if (!n)
                for (const n of this._resources) {
                  if (n._monotonicTime >= t.timestamp) break;
                  if (n.request.url === e) return n;
                }
              if (n)
                for (const s of t.resourceOverrides)
                  if (e === s.url && s.sha1) {
                    n = {
                      ...n,
                      response: {
                        ...n.response,
                        content: {...n.response.content, _sha1: s.sha1},
                      },
                    };
                    break;
                  }
              return n;
            }
          });
        const n = new Set([
            'AREA',
            'BASE',
            'BR',
            'COL',
            'COMMAND',
            'EMBED',
            'HR',
            'IMG',
            'INPUT',
            'KEYGEN',
            'LINK',
            'MENUITEM',
            'META',
            'PARAM',
            'SOURCE',
            'TRACK',
            'WBR',
          ]),
          s = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          };
      },
      507: (e, t) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.SnapshotServer = void 0);
        const n = 'http://playwright.bloburl/#';
        t.SnapshotServer = class {
          constructor(e) {
            (this._snapshotStorage = void 0),
              (this._snapshotIds = new Map()),
              (this._snapshotStorage = e);
          }
          serveSnapshot(e, t, n) {
            const s = this._snapshot(e.substring('/snapshot'.length), t);
            if (!s) return new Response(null, {status: 404});
            const r = s.render();
            return (
              this._snapshotIds.set(n, s),
              new Response(r.html, {
                status: 200,
                headers: {'Content-Type': 'text/html'},
              })
            );
          }
          serveSnapshotSize(e, t) {
            const n = this._snapshot(e.substring('/snapshotSize'.length), t);
            return this._respondWithJson(n ? n.viewport() : {});
          }
          _snapshot(e, t) {
            const n = t.get('name');
            return this._snapshotStorage.snapshotByName(e.slice(1), n);
          }
          _respondWithJson(e) {
            return new Response(JSON.stringify(e), {
              status: 200,
              headers: {
                'Cache-Control': 'public, max-age=31536000',
                'Content-Type': 'application/json',
              },
            });
          }
          async serveResource(e, t) {
            const s = this._snapshotIds.get(t),
              r = e.startsWith(n)
                ? e.substring(n.length)
                : (function (e) {
                    try {
                      const t = new URL(e);
                      return (t.hash = ''), t.toString();
                    } catch (t) {
                      return e;
                    }
                  })(e),
              o = null == s ? void 0 : s.resourceByUrl(r);
            if (!o) return new Response(null, {status: 404});
            const a = o.response.content._sha1;
            return a
              ? this._innerServeResource(a, o)
              : new Response(null, {status: 404});
          }
          async _innerServeResource(e, t) {
            const n = await this._snapshotStorage.resourceContent(e);
            if (!n) return new Response(null, {status: 404});
            let s = t.response.content.mimeType;
            /^text\/|^application\/(javascript|json)/.test(s) &&
              !s.includes('charset') &&
              (s = `${s}; charset=utf-8`);
            const r = new Headers();
            r.set('Content-Type', s);
            for (const {name: e, value: n} of t.response.headers) r.set(e, n);
            return (
              r.delete('Content-Encoding'),
              r.delete('Access-Control-Allow-Origin'),
              r.set('Access-Control-Allow-Origin', '*'),
              r.delete('Content-Length'),
              r.set('Content-Length', String(n.size)),
              r.set('Cache-Control', 'public, max-age=31536000'),
              new Response(n, {headers: r})
            );
          }
        };
      },
      373: (e, t, n) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.BaseSnapshotStorage = void 0);
        var s = n(187),
          r = n(626);
        class o extends s.EventEmitter {
          constructor(...e) {
            super(...e),
              (this._resources = []),
              (this._frameSnapshots = new Map());
          }
          clear() {
            (this._resources = []), this._frameSnapshots.clear();
          }
          addResource(e) {
            this._resources.push(e);
          }
          addFrameSnapshot(e) {
            let t = this._frameSnapshots.get(e.frameId);
            t ||
              ((t = {raw: [], renderer: []}),
              this._frameSnapshots.set(e.frameId, t),
              e.isMainFrame && this._frameSnapshots.set(e.pageId, t)),
              t.raw.push(e);
            const n = new r.SnapshotRenderer(
              this._resources,
              t.raw,
              t.raw.length - 1,
            );
            t.renderer.push(n), this.emit('snapshot', n);
          }
          resources() {
            return this._resources.slice();
          }
          snapshotByName(e, t) {
            const n = this._frameSnapshots.get(e);
            return null == n
              ? void 0
              : n.renderer.find((e) => e.snapshotName === t);
          }
          snapshotByIndex(e, t) {
            const n = this._frameSnapshots.get(e);
            return null == n ? void 0 : n.renderer[t];
          }
        }
        t.BaseSnapshotStorage = o;
      },
      606: (e, t, n) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.commandsWithTracingSnapshots =
            t.PersistentSnapshotStorage =
            t.TraceModel =
              void 0);
        var s = (function (e, t) {
            if (e && e.__esModule) return e;
            if (null === e || ('object' != typeof e && 'function' != typeof e))
              return {default: e};
            var n = o(t);
            if (n && n.has(e)) return n.get(e);
            var s = {},
              r = Object.defineProperty && Object.getOwnPropertyDescriptor;
            for (var a in e)
              if (
                'default' !== a &&
                Object.prototype.hasOwnProperty.call(e, a)
              ) {
                var i = r ? Object.getOwnPropertyDescriptor(e, a) : null;
                i && (i.get || i.set)
                  ? Object.defineProperty(s, a, i)
                  : (s[a] = e[a]);
              }
            return (s.default = e), n && n.set(e, s), s;
          })(n(967)),
          r = n(373);
        function o(e) {
          if ('function' != typeof WeakMap) return null;
          var t = new WeakMap(),
            n = new WeakMap();
          return (o = function (e) {
            return e ? n : t;
          })(e);
        }
        self.importScripts('zip.min.js');
        const a = self.zip;
        t.TraceModel = class {
          constructor() {
            (this.contextEntry = void 0),
              (this.pageEntries = new Map()),
              (this._snapshotStorage = void 0),
              (this._entries = new Map()),
              (this._version = void 0),
              (this.contextEntry = {
                startTime: Number.MAX_VALUE,
                endTime: Number.MIN_VALUE,
                browserName: '',
                options: {},
                pages: [],
                resources: [],
              });
          }
          async load(e) {
            const t = await fetch(e, {mode: 'cors'}),
              n = await t.blob(),
              s = new a.ZipReader(new a.BlobReader(n), {useWebWorkers: !1});
            let r, o;
            for (const e of await s.getEntries())
              e.filename.endsWith('.trace') && (r = e),
                e.filename.endsWith('.network') && (o = e),
                this._entries.set(e.filename, e);
            this._snapshotStorage = new i(this._entries);
            const l = new a.TextWriter();
            await r.getData(l);
            for (const e of (await l.getData()).split('\n'))
              this.appendEvent(e);
            if (o) {
              const e = new a.TextWriter();
              await o.getData(e);
              for (const t of (await e.getData()).split('\n'))
                this.appendEvent(t);
            }
            this._build();
          }
          async resourceForSha1(e) {
            const t = this._entries.get('resources/' + e);
            if (!t) return;
            const n = new a.BlobWriter();
            return await t.getData(n), await n.getData();
          }
          storage() {
            return this._snapshotStorage;
          }
          _build() {
            for (const e of this.contextEntry.pages)
              e.actions.sort(
                (e, t) => e.metadata.startTime - t.metadata.startTime,
              );
            this.contextEntry.resources = this._snapshotStorage.resources();
          }
          _pageEntry(e) {
            let t = this.pageEntries.get(e);
            return (
              t ||
                ((t = {
                  actions: [],
                  events: [],
                  objects: {},
                  screencastFrames: [],
                }),
                this.pageEntries.set(e, t),
                this.contextEntry.pages.push(t)),
              t
            );
          }
          appendEvent(e) {
            if (!e) return;
            const t = this._modernize(JSON.parse(e));
            switch (t.type) {
              case 'context-options':
                (this.contextEntry.browserName = t.browserName),
                  (this.contextEntry.options = t.options);
                break;
              case 'screencast-frame':
                this._pageEntry(t.pageId).screencastFrames.push(t);
                break;
              case 'action': {
                const e = t.metadata;
                t.hasSnapshot &&
                  e.pageId &&
                  this._pageEntry(e.pageId).actions.push(t);
                break;
              }
              case 'event': {
                const e = t.metadata;
                e.pageId &&
                  ('__create__' === e.method
                    ? (this._pageEntry(e.pageId).objects[e.params.guid] =
                        e.params.initializer)
                    : this._pageEntry(e.pageId).events.push(t));
                break;
              }
              case 'resource-snapshot':
                this._snapshotStorage.addResource(t.snapshot);
                break;
              case 'frame-snapshot':
                this._snapshotStorage.addFrameSnapshot(t.snapshot);
            }
            ('action' !== t.type && 'event' !== t.type) ||
              ((this.contextEntry.startTime = Math.min(
                this.contextEntry.startTime,
                t.metadata.startTime,
              )),
              (this.contextEntry.endTime = Math.max(
                this.contextEntry.endTime,
                t.metadata.endTime,
              )));
          }
          _modernize(e) {
            if (void 0 === this._version) return e;
            for (let t = this._version; t < s.VERSION; ++t)
              e = this[`_modernize_${t}_to_${t + 1}`].call(this, e);
            return e;
          }
          _modernize_0_to_1(e) {
            return (
              'action' === e.type &&
                ('string' == typeof e.metadata.error &&
                  (e.metadata.error = {
                    error: {name: 'Error', message: e.metadata.error},
                  }),
                e.metadata &&
                  'boolean' != typeof e.hasSnapshot &&
                  (e.hasSnapshot = l.has(e.metadata))),
              e
            );
          }
          _modernize_1_to_2(e) {
            return (
              'frame-snapshot' === e.type &&
                e.snapshot.isMainFrame &&
                (e.snapshot.viewport = this.contextEntry.options.viewport || {
                  width: 1280,
                  height: 720,
                }),
              e
            );
          }
          _modernize_2_to_3(e) {
            if ('resource-snapshot' === e.type && !e.snapshot.request) {
              const t = e.snapshot;
              e.snapshot = {
                _frameref: t.frameId,
                request: {
                  url: t.url,
                  method: t.method,
                  headers: t.requestHeaders,
                  postData: t.requestSha1 ? {_sha1: t.requestSha1} : void 0,
                },
                response: {
                  status: t.status,
                  headers: t.responseHeaders,
                  content: {mimeType: t.contentType, _sha1: t.responseSha1},
                },
                _monotonicTime: t.timestamp,
              };
            }
            return e;
          }
        };
        class i extends r.BaseSnapshotStorage {
          constructor(e) {
            super(), (this._entries = void 0), (this._entries = e);
          }
          async resourceContent(e) {
            const t = this._entries.get('resources/' + e),
              n = new a.BlobWriter();
            return await t.getData(n), n.getData();
          }
        }
        t.PersistentSnapshotStorage = i;
        const l = new Set([
          'EventTarget.waitForEventInfo',
          'BrowserContext.waitForEventInfo',
          'Page.waitForEventInfo',
          'WebSocket.waitForEventInfo',
          'ElectronApplication.waitForEventInfo',
          'AndroidDevice.waitForEventInfo',
          'Page.goBack',
          'Page.goForward',
          'Page.reload',
          'Page.setViewportSize',
          'Page.keyboardDown',
          'Page.keyboardUp',
          'Page.keyboardInsertText',
          'Page.keyboardType',
          'Page.keyboardPress',
          'Page.mouseMove',
          'Page.mouseDown',
          'Page.mouseUp',
          'Page.mouseClick',
          'Page.mouseWheel',
          'Page.touchscreenTap',
          'Frame.evalOnSelector',
          'Frame.evalOnSelectorAll',
          'Frame.addScriptTag',
          'Frame.addStyleTag',
          'Frame.check',
          'Frame.click',
          'Frame.dragAndDrop',
          'Frame.dblclick',
          'Frame.dispatchEvent',
          'Frame.evaluateExpression',
          'Frame.evaluateExpressionHandle',
          'Frame.fill',
          'Frame.focus',
          'Frame.getAttribute',
          'Frame.goto',
          'Frame.hover',
          'Frame.innerHTML',
          'Frame.innerText',
          'Frame.inputValue',
          'Frame.isChecked',
          'Frame.isDisabled',
          'Frame.isEnabled',
          'Frame.isHidden',
          'Frame.isVisible',
          'Frame.isEditable',
          'Frame.press',
          'Frame.selectOption',
          'Frame.setContent',
          'Frame.setInputFiles',
          'Frame.tap',
          'Frame.textContent',
          'Frame.type',
          'Frame.uncheck',
          'Frame.waitForTimeout',
          'Frame.waitForFunction',
          'Frame.waitForSelector',
          'Frame.expect',
          'JSHandle.evaluateExpression',
          'ElementHandle.evaluateExpression',
          'JSHandle.evaluateExpressionHandle',
          'ElementHandle.evaluateExpressionHandle',
          'ElementHandle.evalOnSelector',
          'ElementHandle.evalOnSelectorAll',
          'ElementHandle.check',
          'ElementHandle.click',
          'ElementHandle.dblclick',
          'ElementHandle.dispatchEvent',
          'ElementHandle.fill',
          'ElementHandle.hover',
          'ElementHandle.innerHTML',
          'ElementHandle.innerText',
          'ElementHandle.inputValue',
          'ElementHandle.isChecked',
          'ElementHandle.isDisabled',
          'ElementHandle.isEditable',
          'ElementHandle.isEnabled',
          'ElementHandle.isHidden',
          'ElementHandle.isVisible',
          'ElementHandle.press',
          'ElementHandle.scrollIntoViewIfNeeded',
          'ElementHandle.selectOption',
          'ElementHandle.selectText',
          'ElementHandle.setInputFiles',
          'ElementHandle.tap',
          'ElementHandle.textContent',
          'ElementHandle.type',
          'ElementHandle.uncheck',
          'ElementHandle.waitForElementState',
          'ElementHandle.waitForSelector',
        ]);
        t.commandsWithTracingSnapshots = l;
      },
      187: (e) => {
        var t,
          n = 'object' == typeof Reflect ? Reflect : null,
          s =
            n && 'function' == typeof n.apply
              ? n.apply
              : function (e, t, n) {
                  return Function.prototype.apply.call(e, t, n);
                };
        t =
          n && 'function' == typeof n.ownKeys
            ? n.ownKeys
            : Object.getOwnPropertySymbols
            ? function (e) {
                return Object.getOwnPropertyNames(e).concat(
                  Object.getOwnPropertySymbols(e),
                );
              }
            : function (e) {
                return Object.getOwnPropertyNames(e);
              };
        var r =
          Number.isNaN ||
          function (e) {
            return e != e;
          };
        function o() {
          o.init.call(this);
        }
        (e.exports = o),
          (e.exports.once = function (e, t) {
            return new Promise(function (n, s) {
              function r(n) {
                e.removeListener(t, o), s(n);
              }
              function o() {
                'function' == typeof e.removeListener &&
                  e.removeListener('error', r),
                  n([].slice.call(arguments));
              }
              m(e, t, o, {once: !0}),
                'error' !== t &&
                  (function (e, t, n) {
                    'function' == typeof e.on && m(e, 'error', t, {once: !0});
                  })(e, r);
            });
          }),
          (o.EventEmitter = o),
          (o.prototype._events = void 0),
          (o.prototype._eventsCount = 0),
          (o.prototype._maxListeners = void 0);
        var a = 10;
        function i(e) {
          if ('function' != typeof e)
            throw new TypeError(
              'The "listener" argument must be of type Function. Received type ' +
                typeof e,
            );
        }
        function l(e) {
          return void 0 === e._maxListeners
            ? o.defaultMaxListeners
            : e._maxListeners;
        }
        function c(e, t, n, s) {
          var r, o, a, c;
          if (
            (i(n),
            void 0 === (o = e._events)
              ? ((o = e._events = Object.create(null)), (e._eventsCount = 0))
              : (void 0 !== o.newListener &&
                  (e.emit('newListener', t, n.listener ? n.listener : n),
                  (o = e._events)),
                (a = o[t])),
            void 0 === a)
          )
            (a = o[t] = n), ++e._eventsCount;
          else if (
            ('function' == typeof a
              ? (a = o[t] = s ? [n, a] : [a, n])
              : s
              ? a.unshift(n)
              : a.push(n),
            (r = l(e)) > 0 && a.length > r && !a.warned)
          ) {
            a.warned = !0;
            var p = new Error(
              'Possible EventEmitter memory leak detected. ' +
                a.length +
                ' ' +
                String(t) +
                ' listeners added. Use emitter.setMaxListeners() to increase limit',
            );
            (p.name = 'MaxListenersExceededWarning'),
              (p.emitter = e),
              (p.type = t),
              (p.count = a.length),
              (c = p),
              console && console.warn && console.warn(c);
          }
          return e;
        }
        function p() {
          if (!this.fired)
            return (
              this.target.removeListener(this.type, this.wrapFn),
              (this.fired = !0),
              0 === arguments.length
                ? this.listener.call(this.target)
                : this.listener.apply(this.target, arguments)
            );
        }
        function h(e, t, n) {
          var s = {fired: !1, wrapFn: void 0, target: e, type: t, listener: n},
            r = p.bind(s);
          return (r.listener = n), (s.wrapFn = r), r;
        }
        function u(e, t, n) {
          var s = e._events;
          if (void 0 === s) return [];
          var r = s[t];
          return void 0 === r
            ? []
            : 'function' == typeof r
            ? n
              ? [r.listener || r]
              : [r]
            : n
            ? (function (e) {
                for (var t = new Array(e.length), n = 0; n < t.length; ++n)
                  t[n] = e[n].listener || e[n];
                return t;
              })(r)
            : f(r, r.length);
        }
        function d(e) {
          var t = this._events;
          if (void 0 !== t) {
            var n = t[e];
            if ('function' == typeof n) return 1;
            if (void 0 !== n) return n.length;
          }
          return 0;
        }
        function f(e, t) {
          for (var n = new Array(t), s = 0; s < t; ++s) n[s] = e[s];
          return n;
        }
        function m(e, t, n, s) {
          if ('function' == typeof e.on) s.once ? e.once(t, n) : e.on(t, n);
          else {
            if ('function' != typeof e.addEventListener)
              throw new TypeError(
                'The "emitter" argument must be of type EventEmitter. Received type ' +
                  typeof e,
              );
            e.addEventListener(t, function r(o) {
              s.once && e.removeEventListener(t, r), n(o);
            });
          }
        }
        Object.defineProperty(o, 'defaultMaxListeners', {
          enumerable: !0,
          get: function () {
            return a;
          },
          set: function (e) {
            if ('number' != typeof e || e < 0 || r(e))
              throw new RangeError(
                'The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' +
                  e +
                  '.',
              );
            a = e;
          },
        }),
          (o.init = function () {
            (void 0 !== this._events &&
              this._events !== Object.getPrototypeOf(this)._events) ||
              ((this._events = Object.create(null)), (this._eventsCount = 0)),
              (this._maxListeners = this._maxListeners || void 0);
          }),
          (o.prototype.setMaxListeners = function (e) {
            if ('number' != typeof e || e < 0 || r(e))
              throw new RangeError(
                'The value of "n" is out of range. It must be a non-negative number. Received ' +
                  e +
                  '.',
              );
            return (this._maxListeners = e), this;
          }),
          (o.prototype.getMaxListeners = function () {
            return l(this);
          }),
          (o.prototype.emit = function (e) {
            for (var t = [], n = 1; n < arguments.length; n++)
              t.push(arguments[n]);
            var r = 'error' === e,
              o = this._events;
            if (void 0 !== o) r = r && void 0 === o.error;
            else if (!r) return !1;
            if (r) {
              var a;
              if ((t.length > 0 && (a = t[0]), a instanceof Error)) throw a;
              var i = new Error(
                'Unhandled error.' + (a ? ' (' + a.message + ')' : ''),
              );
              throw ((i.context = a), i);
            }
            var l = o[e];
            if (void 0 === l) return !1;
            if ('function' == typeof l) s(l, this, t);
            else {
              var c = l.length,
                p = f(l, c);
              for (n = 0; n < c; ++n) s(p[n], this, t);
            }
            return !0;
          }),
          (o.prototype.addListener = function (e, t) {
            return c(this, e, t, !1);
          }),
          (o.prototype.on = o.prototype.addListener),
          (o.prototype.prependListener = function (e, t) {
            return c(this, e, t, !0);
          }),
          (o.prototype.once = function (e, t) {
            return i(t), this.on(e, h(this, e, t)), this;
          }),
          (o.prototype.prependOnceListener = function (e, t) {
            return i(t), this.prependListener(e, h(this, e, t)), this;
          }),
          (o.prototype.removeListener = function (e, t) {
            var n, s, r, o, a;
            if ((i(t), void 0 === (s = this._events))) return this;
            if (void 0 === (n = s[e])) return this;
            if (n === t || n.listener === t)
              0 == --this._eventsCount
                ? (this._events = Object.create(null))
                : (delete s[e],
                  s.removeListener &&
                    this.emit('removeListener', e, n.listener || t));
            else if ('function' != typeof n) {
              for (r = -1, o = n.length - 1; o >= 0; o--)
                if (n[o] === t || n[o].listener === t) {
                  (a = n[o].listener), (r = o);
                  break;
                }
              if (r < 0) return this;
              0 === r
                ? n.shift()
                : (function (e, t) {
                    for (; t + 1 < e.length; t++) e[t] = e[t + 1];
                    e.pop();
                  })(n, r),
                1 === n.length && (s[e] = n[0]),
                void 0 !== s.removeListener &&
                  this.emit('removeListener', e, a || t);
            }
            return this;
          }),
          (o.prototype.off = o.prototype.removeListener),
          (o.prototype.removeAllListeners = function (e) {
            var t, n, s;
            if (void 0 === (n = this._events)) return this;
            if (void 0 === n.removeListener)
              return (
                0 === arguments.length
                  ? ((this._events = Object.create(null)),
                    (this._eventsCount = 0))
                  : void 0 !== n[e] &&
                    (0 == --this._eventsCount
                      ? (this._events = Object.create(null))
                      : delete n[e]),
                this
              );
            if (0 === arguments.length) {
              var r,
                o = Object.keys(n);
              for (s = 0; s < o.length; ++s)
                'removeListener' !== (r = o[s]) && this.removeAllListeners(r);
              return (
                this.removeAllListeners('removeListener'),
                (this._events = Object.create(null)),
                (this._eventsCount = 0),
                this
              );
            }
            if ('function' == typeof (t = n[e])) this.removeListener(e, t);
            else if (void 0 !== t)
              for (s = t.length - 1; s >= 0; s--) this.removeListener(e, t[s]);
            return this;
          }),
          (o.prototype.listeners = function (e) {
            return u(this, e, !0);
          }),
          (o.prototype.rawListeners = function (e) {
            return u(this, e, !1);
          }),
          (o.listenerCount = function (e, t) {
            return 'function' == typeof e.listenerCount
              ? e.listenerCount(t)
              : d.call(e, t);
          }),
          (o.prototype.listenerCount = d),
          (o.prototype.eventNames = function () {
            return this._eventsCount > 0 ? t(this._events) : [];
          });
      },
    },
    t = {};
  function n(s) {
    var r = t[s];
    if (void 0 !== r) return r.exports;
    var o = (t[s] = {exports: {}});
    return e[s](o, o.exports, n), o.exports;
  }
  (() => {
    var e = n(507),
      t = n(606);
    self.addEventListener('install', function (e) {
      self.skipWaiting();
    }),
      self.addEventListener('activate', function (e) {
        e.waitUntil(self.clients.claim());
      });
    const s = new URL(self.registration.scope).pathname,
      r = new Map();
    self.addEventListener('fetch', function (n) {
      n.respondWith(
        (async function (n) {
          const o = n.request,
            a =
              'navigate' === o.mode
                ? o.url
                : (await self.clients.get(n.clientId)).url,
            i = new URL(a).searchParams.get('trace'),
            {snapshotServer: l} = r.get(i) || {};
          if (o.url.startsWith(self.registration.scope)) {
            const c = new URL(o.url),
              p = c.pathname.substring(s.length - 1);
            if ('/context' === p) {
              await (async function () {
                const e = new Set();
                for (const [t, n] of r)
                  (await self.clients.get(n.clientId)) && e.add(t);
                for (const t of r.keys()) e.has(t) || r.delete(t);
              })();
              const s = await (async function (n, s) {
                const o = r.get(n);
                if (o) return o.traceModel;
                const a = new t.TraceModel(),
                  i =
                    n.startsWith('http') || n.startsWith('blob')
                      ? n
                      : `/file?path=${n}`;
                await a.load(i);
                const l = new e.SnapshotServer(a.storage());
                return (
                  r.set(n, {traceModel: a, snapshotServer: l, clientId: s}), a
                );
              })(i, n.clientId);
              return new Response(JSON.stringify(s.contextEntry), {
                status: 200,
                headers: {'Content-Type': 'application/json'},
              });
            }
            if (p.startsWith('/snapshotSize/'))
              return l
                ? l.serveSnapshotSize(p, c.searchParams)
                : new Response(null, {status: 404});
            if (p.startsWith('/snapshot/'))
              return l
                ? l.serveSnapshot(p, c.searchParams, a)
                : new Response(null, {status: 404});
            if (p.startsWith('/sha1/')) {
              for (const {traceModel: e} of r.values()) {
                const t = await e.resourceForSha1(p.slice('/sha1/'.length));
                if (t) return new Response(t, {status: 200});
              }
              return new Response(null, {status: 404});
            }
            return fetch(n.request);
          }
          return l
            ? l.serveResource(o.url, a)
            : new Response(null, {status: 404});
        })(n),
      );
    });
  })();
})();
