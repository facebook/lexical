var pwExport;
(() => {
  'use strict';
  var e = {
      317: (e, t, r) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.parseCSS = function (e, t) {
            let r;
            try {
              (r = n.tokenize(e)),
                r[r.length - 1] instanceof n.EOFToken ||
                  r.push(new n.EOFToken());
            } catch (t) {
              const r = t.message + ` while parsing selector "${e}"`,
                n = (t.stack || '').indexOf(t.message);
              throw (
                (-1 !== n &&
                  (t.stack =
                    t.stack.substring(0, n) +
                    r +
                    t.stack.substring(n + t.message.length)),
                (t.message = r),
                t)
              );
            }
            const o = r.find(
              (e) =>
                e instanceof n.AtKeywordToken ||
                e instanceof n.BadStringToken ||
                e instanceof n.BadURLToken ||
                e instanceof n.ColumnToken ||
                e instanceof n.CDOToken ||
                e instanceof n.CDCToken ||
                e instanceof n.SemicolonToken ||
                e instanceof n.OpenCurlyToken ||
                e instanceof n.CloseCurlyToken ||
                e instanceof n.URLToken ||
                e instanceof n.PercentageToken,
            );
            if (o)
              throw new Error(
                `Unsupported token "${o.toSource()}" while parsing selector "${e}"`,
              );
            let i = 0;
            const s = new Set();
            function c() {
              return new Error(
                `Unexpected token "${r[
                  i
                ].toSource()}" while parsing selector "${e}"`,
              );
            }
            function a() {
              for (; r[i] instanceof n.WhitespaceToken; ) i++;
            }
            function u(e = i) {
              return r[e] instanceof n.IdentToken;
            }
            function p(e = i) {
              return r[e] instanceof n.CommaToken;
            }
            function l(e = i) {
              return r[e] instanceof n.CloseParenToken;
            }
            function h(e = i) {
              return r[e] instanceof n.DelimToken && '*' === r[e].value;
            }
            function f(e = i) {
              return r[e] instanceof n.EOFToken;
            }
            function y(e = i) {
              return (
                r[e] instanceof n.DelimToken &&
                ['>', '+', '~'].includes(r[e].value)
              );
            }
            function g(e = i) {
              return (
                p(e) ||
                l(e) ||
                f(e) ||
                y(e) ||
                r[e] instanceof n.WhitespaceToken
              );
            }
            function m() {
              const e = [d()];
              for (; a(), p(); ) i++, e.push(d());
              return e;
            }
            function d() {
              return (
                a(),
                (function (e = i) {
                  return r[e] instanceof n.NumberToken;
                })() ||
                (function (e = i) {
                  return r[e] instanceof n.StringToken;
                })()
                  ? r[i++].value
                  : (function () {
                      const e = {simples: []};
                      for (
                        a(),
                          y()
                            ? e.simples.push({
                                selector: {
                                  functions: [{name: 'scope', args: []}],
                                },
                                combinator: '',
                              })
                            : e.simples.push({selector: w(), combinator: ''});
                        ;

                      ) {
                        if ((a(), y()))
                          (e.simples[e.simples.length - 1].combinator =
                            r[i++].value),
                            a();
                        else if (g()) break;
                        e.simples.push({combinator: '', selector: w()});
                      }
                      return e;
                    })()
              );
            }
            function w() {
              let e = '';
              const o = [];
              for (; !g(); )
                if (u() || h()) e += r[i++].toSource();
                else if (r[i] instanceof n.HashToken) e += r[i++].toSource();
                else if (r[i] instanceof n.DelimToken && '.' === r[i].value) {
                  if ((i++, !u())) throw c();
                  e += '.' + r[i++].toSource();
                } else if (r[i] instanceof n.ColonToken)
                  if ((i++, u()))
                    if (t.has(r[i].value.toLowerCase())) {
                      const e = r[i++].value.toLowerCase();
                      o.push({name: e, args: []}), s.add(e);
                    } else e += ':' + r[i++].toSource();
                  else {
                    if (!(r[i] instanceof n.FunctionToken)) throw c();
                    {
                      const n = r[i++].value.toLowerCase();
                      if (
                        (t.has(n)
                          ? (o.push({name: n, args: m()}), s.add(n))
                          : (e += `:${n}(${S()})`),
                        a(),
                        !l())
                      )
                        throw c();
                      i++;
                    }
                  }
                else {
                  if (!(r[i] instanceof n.OpenSquareToken)) throw c();
                  for (
                    e += '[', i++;
                    !(r[i] instanceof n.CloseSquareToken || f());

                  )
                    e += r[i++].toSource();
                  if (!(r[i] instanceof n.CloseSquareToken)) throw c();
                  (e += ']'), i++;
                }
              if (!e && !o.length) throw c();
              return {css: e || void 0, functions: o};
            }
            function S() {
              let e = '';
              for (; !l() && !f(); ) e += r[i++].toSource();
              return e;
            }
            const v = m();
            if (!f()) throw new Error(`Error while parsing selector "${e}"`);
            if (v.some((e) => 'object' != typeof e || !('simples' in e)))
              throw new Error(`Error while parsing selector "${e}"`);
            return {selector: v, names: Array.from(s)};
          }),
          (t.serializeSelector = function e(t) {
            return t
              .map((t) =>
                'string' == typeof t
                  ? `"${t}"`
                  : 'number' == typeof t
                  ? String(t)
                  : t.simples
                      .map(({selector: t, combinator: r}) => {
                        let n = t.css || '';
                        return (
                          (n += t.functions
                            .map((t) => `:${t.name}(${e(t.args)})`)
                            .join('')),
                          r && (n += ' ' + r),
                          n
                        );
                      })
                      .join(' '),
              )
              .join(', ');
          });
        var n = (function (e, t) {
          if (e && e.__esModule) return e;
          if (null === e || ('object' != typeof e && 'function' != typeof e))
            return {default: e};
          var r = o(t);
          if (r && r.has(e)) return r.get(e);
          var n = {},
            i = Object.defineProperty && Object.getOwnPropertyDescriptor;
          for (var s in e)
            if ('default' !== s && Object.prototype.hasOwnProperty.call(e, s)) {
              var c = i ? Object.getOwnPropertyDescriptor(e, s) : null;
              c && (c.get || c.set)
                ? Object.defineProperty(n, s, c)
                : (n[s] = e[s]);
            }
          return (n.default = e), r && r.set(e, n), n;
        })(r(503));
        function o(e) {
          if ('function' != typeof WeakMap) return null;
          var t = new WeakMap(),
            r = new WeakMap();
          return (o = function (e) {
            return e ? r : t;
          })(e);
        }
      },
      503: (e, t) => {
        var r, n;
        (r = function (e) {
          var t = function (e, t, r) {
            return e >= t && e <= r;
          };
          function r(e) {
            return t(e, 48, 57);
          }
          function n(e) {
            return r(e) || t(e, 65, 70) || t(e, 97, 102);
          }
          function o(e) {
            return (
              (function (e) {
                return t(e, 65, 90);
              })(e) ||
              (function (e) {
                return t(e, 97, 122);
              })(e)
            );
          }
          function i(e) {
            return (
              o(e) ||
              (function (e) {
                return e >= 128;
              })(e) ||
              95 == e
            );
          }
          function s(e) {
            return i(e) || r(e) || 45 == e;
          }
          function c(e) {
            return t(e, 0, 8) || 11 == e || t(e, 14, 31) || 127 == e;
          }
          function a(e) {
            return 10 == e;
          }
          function u(e) {
            return a(e) || 9 == e || 32 == e;
          }
          var p = function (e) {
            this.message = e;
          };
          function l(e) {
            if (e <= 65535) return String.fromCharCode(e);
            e -= Math.pow(2, 16);
            var t = Math.floor(e / Math.pow(2, 10)) + 55296,
              r = (e % Math.pow(2, 10)) + 56320;
            return String.fromCharCode(t) + String.fromCharCode(r);
          }
          function h() {
            throw 'Abstract Base Class';
          }
          function f() {
            return this;
          }
          function y() {
            return this;
          }
          function g() {
            return this;
          }
          function m() {
            return this;
          }
          function d() {
            return this;
          }
          function w() {
            return this;
          }
          function S() {
            return this;
          }
          function v() {
            return this;
          }
          function _() {
            throw 'Abstract Base Class';
          }
          function T() {
            return (this.value = '{'), (this.mirror = '}'), this;
          }
          function b() {
            return (this.value = '}'), (this.mirror = '{'), this;
          }
          function E() {
            return (this.value = '['), (this.mirror = ']'), this;
          }
          function k() {
            return (this.value = ']'), (this.mirror = '['), this;
          }
          function C() {
            return (this.value = '('), (this.mirror = ')'), this;
          }
          function O() {
            return (this.value = ')'), (this.mirror = '('), this;
          }
          function M() {
            return this;
          }
          function x() {
            return this;
          }
          function N() {
            return this;
          }
          function A() {
            return this;
          }
          function j() {
            return this;
          }
          function $() {
            return this;
          }
          function q() {
            return this;
          }
          function P(e) {
            return (this.value = l(e)), this;
          }
          function L() {
            throw 'Abstract Base Class';
          }
          function R(e) {
            this.value = e;
          }
          function D(e) {
            (this.value = e), (this.mirror = ')');
          }
          function I(e) {
            this.value = e;
          }
          function U(e) {
            (this.value = e), (this.type = 'unrestricted');
          }
          function B(e) {
            this.value = e;
          }
          function Q(e) {
            this.value = e;
          }
          function F() {
            (this.value = null), (this.type = 'integer'), (this.repr = '');
          }
          function J() {
            (this.value = null), (this.repr = '');
          }
          function W() {
            (this.value = null),
              (this.type = 'integer'),
              (this.repr = ''),
              (this.unit = '');
          }
          function z(e) {
            for (
              var r = '', n = (e = '' + e).charCodeAt(0), o = 0;
              o < e.length;
              o++
            ) {
              var i = e.charCodeAt(o);
              if (0 == i)
                throw new p('Invalid character: the input contains U+0000.');
              t(i, 1, 31) ||
              127 == i ||
              (0 == o && t(i, 48, 57)) ||
              (1 == o && t(i, 48, 57) && 45 == n)
                ? (r += '\\' + i.toString(16) + ' ')
                : i >= 128 ||
                  45 == i ||
                  95 == i ||
                  t(i, 48, 57) ||
                  t(i, 65, 90) ||
                  t(i, 97, 122)
                ? (r += e[o])
                : (r += '\\' + e[o]);
            }
            return r;
          }
          function G(e) {
            e = '' + e;
            for (var r = '', n = 0; n < e.length; n++) {
              var o = e.charCodeAt(n);
              if (0 == o)
                throw new p('Invalid character: the input contains U+0000.');
              t(o, 1, 31) || 127 == o
                ? (r += '\\' + o.toString(16) + ' ')
                : (r += 34 == o || 92 == o ? '\\' + e[n] : e[n]);
            }
            return r;
          }
          ((p.prototype = new Error()).name = 'InvalidCharacterError'),
            (h.prototype.toJSON = function () {
              return {token: this.tokenType};
            }),
            (h.prototype.toString = function () {
              return this.tokenType;
            }),
            (h.prototype.toSource = function () {
              return '' + this;
            }),
            (f.prototype = Object.create(h.prototype)),
            (f.prototype.tokenType = 'BADSTRING'),
            (y.prototype = Object.create(h.prototype)),
            (y.prototype.tokenType = 'BADURL'),
            (g.prototype = Object.create(h.prototype)),
            (g.prototype.tokenType = 'WHITESPACE'),
            (g.prototype.toString = function () {
              return 'WS';
            }),
            (g.prototype.toSource = function () {
              return ' ';
            }),
            (m.prototype = Object.create(h.prototype)),
            (m.prototype.tokenType = 'CDO'),
            (m.prototype.toSource = function () {
              return '\x3c!--';
            }),
            (d.prototype = Object.create(h.prototype)),
            (d.prototype.tokenType = 'CDC'),
            (d.prototype.toSource = function () {
              return '--\x3e';
            }),
            (w.prototype = Object.create(h.prototype)),
            (w.prototype.tokenType = ':'),
            (S.prototype = Object.create(h.prototype)),
            (S.prototype.tokenType = ';'),
            (v.prototype = Object.create(h.prototype)),
            (v.prototype.tokenType = ','),
            (_.prototype = Object.create(h.prototype)),
            (T.prototype = Object.create(_.prototype)),
            (T.prototype.tokenType = '{'),
            (b.prototype = Object.create(_.prototype)),
            (b.prototype.tokenType = '}'),
            (E.prototype = Object.create(_.prototype)),
            (E.prototype.tokenType = '['),
            (k.prototype = Object.create(_.prototype)),
            (k.prototype.tokenType = ']'),
            (C.prototype = Object.create(_.prototype)),
            (C.prototype.tokenType = '('),
            (O.prototype = Object.create(_.prototype)),
            (O.prototype.tokenType = ')'),
            (M.prototype = Object.create(h.prototype)),
            (M.prototype.tokenType = '~='),
            (x.prototype = Object.create(h.prototype)),
            (x.prototype.tokenType = '|='),
            (N.prototype = Object.create(h.prototype)),
            (N.prototype.tokenType = '^='),
            (A.prototype = Object.create(h.prototype)),
            (A.prototype.tokenType = '$='),
            (j.prototype = Object.create(h.prototype)),
            (j.prototype.tokenType = '*='),
            ($.prototype = Object.create(h.prototype)),
            ($.prototype.tokenType = '||'),
            (q.prototype = Object.create(h.prototype)),
            (q.prototype.tokenType = 'EOF'),
            (q.prototype.toSource = function () {
              return '';
            }),
            (P.prototype = Object.create(h.prototype)),
            (P.prototype.tokenType = 'DELIM'),
            (P.prototype.toString = function () {
              return 'DELIM(' + this.value + ')';
            }),
            (P.prototype.toJSON = function () {
              var e =
                this.constructor.prototype.constructor.prototype.toJSON.call(
                  this,
                );
              return (e.value = this.value), e;
            }),
            (P.prototype.toSource = function () {
              return '\\' == this.value ? '\\\n' : this.value;
            }),
            (L.prototype = Object.create(h.prototype)),
            (L.prototype.ASCIIMatch = function (e) {
              return this.value.toLowerCase() == e.toLowerCase();
            }),
            (L.prototype.toJSON = function () {
              var e =
                this.constructor.prototype.constructor.prototype.toJSON.call(
                  this,
                );
              return (e.value = this.value), e;
            }),
            (R.prototype = Object.create(L.prototype)),
            (R.prototype.tokenType = 'IDENT'),
            (R.prototype.toString = function () {
              return 'IDENT(' + this.value + ')';
            }),
            (R.prototype.toSource = function () {
              return z(this.value);
            }),
            (D.prototype = Object.create(L.prototype)),
            (D.prototype.tokenType = 'FUNCTION'),
            (D.prototype.toString = function () {
              return 'FUNCTION(' + this.value + ')';
            }),
            (D.prototype.toSource = function () {
              return z(this.value) + '(';
            }),
            (I.prototype = Object.create(L.prototype)),
            (I.prototype.tokenType = 'AT-KEYWORD'),
            (I.prototype.toString = function () {
              return 'AT(' + this.value + ')';
            }),
            (I.prototype.toSource = function () {
              return '@' + z(this.value);
            }),
            (U.prototype = Object.create(L.prototype)),
            (U.prototype.tokenType = 'HASH'),
            (U.prototype.toString = function () {
              return 'HASH(' + this.value + ')';
            }),
            (U.prototype.toJSON = function () {
              var e =
                this.constructor.prototype.constructor.prototype.toJSON.call(
                  this,
                );
              return (e.value = this.value), (e.type = this.type), e;
            }),
            (U.prototype.toSource = function () {
              return 'id' == this.type
                ? '#' + z(this.value)
                : '#' +
                    (function (e) {
                      for (
                        var r = '', n = ((e = '' + e).charCodeAt(0), 0);
                        n < e.length;
                        n++
                      ) {
                        var o = e.charCodeAt(n);
                        if (0 == o)
                          throw new p(
                            'Invalid character: the input contains U+0000.',
                          );
                        o >= 128 ||
                        45 == o ||
                        95 == o ||
                        t(o, 48, 57) ||
                        t(o, 65, 90) ||
                        t(o, 97, 122)
                          ? (r += e[n])
                          : (r += '\\' + o.toString(16) + ' ');
                      }
                      return r;
                    })(this.value);
            }),
            (B.prototype = Object.create(L.prototype)),
            (B.prototype.tokenType = 'STRING'),
            (B.prototype.toString = function () {
              return '"' + G(this.value) + '"';
            }),
            (Q.prototype = Object.create(L.prototype)),
            (Q.prototype.tokenType = 'URL'),
            (Q.prototype.toString = function () {
              return 'URL(' + this.value + ')';
            }),
            (Q.prototype.toSource = function () {
              return 'url("' + G(this.value) + '")';
            }),
            (F.prototype = Object.create(h.prototype)),
            (F.prototype.tokenType = 'NUMBER'),
            (F.prototype.toString = function () {
              return 'integer' == this.type
                ? 'INT(' + this.value + ')'
                : 'NUMBER(' + this.value + ')';
            }),
            (F.prototype.toJSON = function () {
              var e =
                this.constructor.prototype.constructor.prototype.toJSON.call(
                  this,
                );
              return (
                (e.value = this.value),
                (e.type = this.type),
                (e.repr = this.repr),
                e
              );
            }),
            (F.prototype.toSource = function () {
              return this.repr;
            }),
            (J.prototype = Object.create(h.prototype)),
            (J.prototype.tokenType = 'PERCENTAGE'),
            (J.prototype.toString = function () {
              return 'PERCENTAGE(' + this.value + ')';
            }),
            (J.prototype.toJSON = function () {
              var e =
                this.constructor.prototype.constructor.prototype.toJSON.call(
                  this,
                );
              return (e.value = this.value), (e.repr = this.repr), e;
            }),
            (J.prototype.toSource = function () {
              return this.repr + '%';
            }),
            (W.prototype = Object.create(h.prototype)),
            (W.prototype.tokenType = 'DIMENSION'),
            (W.prototype.toString = function () {
              return 'DIM(' + this.value + ',' + this.unit + ')';
            }),
            (W.prototype.toJSON = function () {
              var e =
                this.constructor.prototype.constructor.prototype.toJSON.call(
                  this,
                );
              return (
                (e.value = this.value),
                (e.type = this.type),
                (e.repr = this.repr),
                (e.unit = this.unit),
                e
              );
            }),
            (W.prototype.toSource = function () {
              var e = this.repr,
                r = z(this.unit);
              return (
                'e' != r[0].toLowerCase() ||
                  ('-' != r[1] && !t(r.charCodeAt(1), 48, 57)) ||
                  (r = '\\65 ' + r.slice(1, r.length)),
                e + r
              );
            }),
            (e.tokenize = function (e) {
              e = (function (e) {
                for (var r = [], n = 0; n < e.length; n++) {
                  var o = e.charCodeAt(n);
                  if (
                    (13 == o && 10 == e.charCodeAt(n + 1) && ((o = 10), n++),
                    (13 != o && 12 != o) || (o = 10),
                    0 == o && (o = 65533),
                    t(o, 55296, 56319) && t(e.charCodeAt(n + 1), 56320, 57343))
                  ) {
                    var i = o - 55296,
                      s = e.charCodeAt(n + 1) - 56320;
                    (o = Math.pow(2, 16) + i * Math.pow(2, 10) + s), n++;
                  }
                  r.push(o);
                }
                return r;
              })(e);
              for (
                var o,
                  p = -1,
                  h = [],
                  _ = 0,
                  L = 0,
                  z = 0,
                  G = {line: _, column: L},
                  H = function (t) {
                    return t >= e.length ? -1 : e[t];
                  },
                  V = function (e) {
                    if ((void 0 === e && (e = 1), e > 3))
                      throw 'Spec Error: no more than three codepoints of lookahead.';
                    return H(p + e);
                  },
                  K = function (e) {
                    return (
                      void 0 === e && (e = 1),
                      a((o = H((p += e))))
                        ? ((_ += 1), (z = L), (L = 0))
                        : (L += e),
                      !0
                    );
                  },
                  X = function () {
                    return (
                      (p -= 1),
                      a(o) ? ((_ -= 1), (L = z)) : (L -= 1),
                      (G.line = _),
                      (G.column = L),
                      !0
                    );
                  },
                  Z = function (e) {
                    return void 0 === e && (e = o), -1 == e;
                  },
                  Y = function () {
                    return (
                      console.log(
                        'Parse error at index ' +
                          p +
                          ', processing codepoint 0x' +
                          o.toString(16) +
                          '.',
                      ),
                      !0
                    );
                  },
                  ee = function () {
                    if ((te(), K(), u(o))) {
                      for (; u(V()); ) K();
                      return new g();
                    }
                    if (34 == o) return oe();
                    if (35 == o) {
                      if (s(V()) || ce(V(1), V(2))) {
                        var e = new U();
                        return (
                          ue(V(1), V(2), V(3)) && (e.type = 'id'),
                          (e.value = he()),
                          e
                        );
                      }
                      return new P(o);
                    }
                    return 36 == o
                      ? 61 == V()
                        ? (K(), new A())
                        : new P(o)
                      : 39 == o
                      ? oe()
                      : 40 == o
                      ? new C()
                      : 41 == o
                      ? new O()
                      : 42 == o
                      ? 61 == V()
                        ? (K(), new j())
                        : new P(o)
                      : 43 == o
                      ? le()
                        ? (X(), re())
                        : new P(o)
                      : 44 == o
                      ? new v()
                      : 45 == o
                      ? le()
                        ? (X(), re())
                        : 45 == V(1) && 62 == V(2)
                        ? (K(2), new d())
                        : pe()
                        ? (X(), ne())
                        : new P(o)
                      : 46 == o
                      ? le()
                        ? (X(), re())
                        : new P(o)
                      : 58 == o
                      ? new w()
                      : 59 == o
                      ? new S()
                      : 60 == o
                      ? 33 == V(1) && 45 == V(2) && 45 == V(3)
                        ? (K(3), new m())
                        : new P(o)
                      : 64 == o
                      ? ue(V(1), V(2), V(3))
                        ? new I(he())
                        : new P(o)
                      : 91 == o
                      ? new E()
                      : 92 == o
                      ? ae()
                        ? (X(), ne())
                        : (Y(), new P(o))
                      : 93 == o
                      ? new k()
                      : 94 == o
                      ? 61 == V()
                        ? (K(), new N())
                        : new P(o)
                      : 123 == o
                      ? new T()
                      : 124 == o
                      ? 61 == V()
                        ? (K(), new x())
                        : 124 == V()
                        ? (K(), new $())
                        : new P(o)
                      : 125 == o
                      ? new b()
                      : 126 == o
                      ? 61 == V()
                        ? (K(), new M())
                        : new P(o)
                      : r(o)
                      ? (X(), re())
                      : i(o)
                      ? (X(), ne())
                      : Z()
                      ? new q()
                      : new P(o);
                  },
                  te = function () {
                    for (; 47 == V(1) && 42 == V(2); )
                      for (K(2); ; ) {
                        if ((K(), 42 == o && 47 == V())) {
                          K();
                          break;
                        }
                        if (Z()) return void Y();
                      }
                  },
                  re = function () {
                    var e,
                      t = fe();
                    return ue(V(1), V(2), V(3))
                      ? (((e = new W()).value = t.value),
                        (e.repr = t.repr),
                        (e.type = t.type),
                        (e.unit = he()),
                        e)
                      : 37 == V()
                      ? (K(),
                        ((e = new J()).value = t.value),
                        (e.repr = t.repr),
                        e)
                      : (((e = new F()).value = t.value),
                        (e.repr = t.repr),
                        (e.type = t.type),
                        e);
                  },
                  ne = function () {
                    var e = he();
                    if ('url' == e.toLowerCase() && 40 == V()) {
                      for (K(); u(V(1)) && u(V(2)); ) K();
                      return 34 == V() || 39 == V()
                        ? new D(e)
                        : !u(V()) || (34 != V(2) && 39 != V(2))
                        ? ie()
                        : new D(e);
                    }
                    return 40 == V() ? (K(), new D(e)) : new R(e);
                  },
                  oe = function (e) {
                    void 0 === e && (e = o);
                    for (var t = ''; K(); ) {
                      if (o == e || Z()) return new B(t);
                      if (a(o)) return Y(), X(), new f();
                      92 == o
                        ? Z(V()) || (a(V()) ? K() : (t += l(se())))
                        : (t += l(o));
                    }
                  },
                  ie = function () {
                    for (var e = new Q(''); u(V()); ) K();
                    if (Z(V())) return e;
                    for (; K(); ) {
                      if (41 == o || Z()) return e;
                      if (u(o)) {
                        for (; u(V()); ) K();
                        return 41 == V() || Z(V()) ? (K(), e) : (ge(), new y());
                      }
                      if (34 == o || 39 == o || 40 == o || c(o))
                        return Y(), ge(), new y();
                      if (92 == o) {
                        if (!ae()) return Y(), ge(), new y();
                        e.value += l(se());
                      } else e.value += l(o);
                    }
                  },
                  se = function () {
                    if ((K(), n(o))) {
                      for (var e = [o], t = 0; t < 5 && n(V()); t++)
                        K(), e.push(o);
                      u(V()) && K();
                      var r = parseInt(
                        e
                          .map(function (e) {
                            return String.fromCharCode(e);
                          })
                          .join(''),
                        16,
                      );
                      return r > 1114111 && (r = 65533), r;
                    }
                    return Z() ? 65533 : o;
                  },
                  ce = function (e, t) {
                    return 92 == e && !a(t);
                  },
                  ae = function () {
                    return ce(o, V());
                  },
                  ue = function (e, t, r) {
                    return 45 == e
                      ? i(t) || 45 == t || ce(t, r)
                      : !!i(e) || (92 == e && ce(e, t));
                  },
                  pe = function () {
                    return ue(o, V(1), V(2));
                  },
                  le = function () {
                    return (
                      (e = o),
                      (t = V(1)),
                      (n = V(2)),
                      43 == e || 45 == e
                        ? !!r(t) || !(46 != t || !r(n))
                        : 46 == e
                        ? !!r(t)
                        : !!r(e)
                    );
                    var e, t, n;
                  },
                  he = function () {
                    for (var e = ''; K(); )
                      if (s(o)) e += l(o);
                      else {
                        if (!ae()) return X(), e;
                        e += l(se());
                      }
                  },
                  fe = function () {
                    var e = [],
                      t = 'integer';
                    for (
                      (43 != V() && 45 != V()) || (K(), (e += l(o)));
                      r(V());

                    )
                      K(), (e += l(o));
                    if (46 == V(1) && r(V(2)))
                      for (
                        K(), e += l(o), K(), e += l(o), t = 'number';
                        r(V());

                      )
                        K(), (e += l(o));
                    var n = V(1),
                      i = V(2),
                      s = V(3);
                    if ((69 != n && 101 != n) || !r(i)) {
                      if ((69 == n || 101 == n) && (43 == i || 45 == i) && r(s))
                        for (
                          K(),
                            e += l(o),
                            K(),
                            e += l(o),
                            K(),
                            e += l(o),
                            t = 'number';
                          r(V());

                        )
                          K(), (e += l(o));
                    } else
                      for (
                        K(), e += l(o), K(), e += l(o), t = 'number';
                        r(V());

                      )
                        K(), (e += l(o));
                    return {type: t, value: ye(e), repr: e};
                  },
                  ye = function (e) {
                    return +e;
                  },
                  ge = function () {
                    for (; K(); ) {
                      if (41 == o || Z()) return;
                      ae() && se();
                    }
                  },
                  me = 0;
                !Z(V());

              )
                if ((h.push(ee()), ++me > 2 * e.length))
                  return "I'm infinite-looping!";
              return h;
            }),
            (e.IdentToken = R),
            (e.FunctionToken = D),
            (e.AtKeywordToken = I),
            (e.HashToken = U),
            (e.StringToken = B),
            (e.BadStringToken = f),
            (e.URLToken = Q),
            (e.BadURLToken = y),
            (e.DelimToken = P),
            (e.NumberToken = F),
            (e.PercentageToken = J),
            (e.DimensionToken = W),
            (e.IncludeMatchToken = M),
            (e.DashMatchToken = x),
            (e.PrefixMatchToken = N),
            (e.SuffixMatchToken = A),
            (e.SubstringMatchToken = j),
            (e.ColumnToken = $),
            (e.WhitespaceToken = g),
            (e.CDOToken = m),
            (e.CDCToken = d),
            (e.ColonToken = w),
            (e.SemicolonToken = S),
            (e.CommaToken = v),
            (e.OpenParenToken = C),
            (e.CloseParenToken = O),
            (e.OpenSquareToken = E),
            (e.CloseSquareToken = k),
            (e.OpenCurlyToken = T),
            (e.CloseCurlyToken = b),
            (e.EOFToken = q),
            (e.CSSParserToken = h),
            (e.GroupingToken = _);
        }),
          void 0 === (n = r.apply(t, [t])) || (e.exports = n);
      },
      461: (e, t, r) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.parseSelector = function (e) {
            const t = (function (e) {
                let t,
                  r = 0,
                  n = 0;
                const o = {parts: []},
                  i = () => {
                    const t = e.substring(n, r).trim(),
                      i = t.indexOf('=');
                    let s, c;
                    -1 !== i &&
                    t
                      .substring(0, i)
                      .trim()
                      .match(/^[a-zA-Z_0-9-+:*]+$/)
                      ? ((s = t.substring(0, i).trim()),
                        (c = t.substring(i + 1)))
                      : (t.length > 1 &&
                          '"' === t[0] &&
                          '"' === t[t.length - 1]) ||
                        (t.length > 1 &&
                          "'" === t[0] &&
                          "'" === t[t.length - 1])
                      ? ((s = 'text'), (c = t))
                      : /^\(*\/\//.test(t) || t.startsWith('..')
                      ? ((s = 'xpath'), (c = t))
                      : ((s = 'css'), (c = t));
                    let a = !1;
                    if (
                      ('*' === s[0] && ((a = !0), (s = s.substring(1))),
                      o.parts.push({name: s, body: c}),
                      a)
                    ) {
                      if (void 0 !== o.capture)
                        throw new Error(
                          'Only one of the selectors can capture using * modifier',
                        );
                      o.capture = o.parts.length - 1;
                    }
                  };
                if (!e.includes('>>')) return (r = e.length), i(), o;
                for (; r < e.length; ) {
                  const o = e[r];
                  '\\' === o && r + 1 < e.length
                    ? (r += 2)
                    : o === t
                    ? ((t = void 0), r++)
                    : t || ('"' !== o && "'" !== o && '`' !== o)
                    ? t || '>' !== o || '>' !== e[r + 1]
                      ? r++
                      : (i(), (r += 2), (n = r))
                    : ((t = o), r++);
                }
                return i(), o;
              })(e),
              r = t.parts.map((e) =>
                'css' === e.name || 'css:light' === e.name
                  ? ('css:light' === e.name &&
                      (e.body = ':light(' + e.body + ')'),
                    {name: 'css', body: (0, n.parseCSS)(e.body, o).selector})
                  : e,
              );
            return {selector: e, capture: t.capture, parts: r};
          }),
          (t.customCSSNames = void 0);
        var n = r(317);
        const o = new Set([
          'not',
          'is',
          'where',
          'has',
          'scope',
          'light',
          'visible',
          'text',
          'text-matches',
          'text-is',
          'has-text',
          'above',
          'below',
          'right-of',
          'left-of',
          'near',
          'nth-match',
        ]);
        t.customCSSNames = o;
      },
      848: (e, t, r) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.createLaxTextMatcher = y),
          (t.createStrictTextMatcher = g),
          (t.createRegexTextMatcher = m),
          (t.elementText = w),
          (t.elementMatchesText = S),
          (t.parentElementOrShadowHost = O),
          (t.isVisible = N),
          (t.SelectorEvaluatorImpl = void 0);
        var n = r(461);
        t.SelectorEvaluatorImpl = class {
          constructor(e) {
            (this._engines = new Map()),
              (this._cacheQueryCSS = new Map()),
              (this._cacheMatches = new Map()),
              (this._cacheQuery = new Map()),
              (this._cacheMatchesSimple = new Map()),
              (this._cacheMatchesParents = new Map()),
              (this._cacheCallMatches = new Map()),
              (this._cacheCallQuery = new Map()),
              (this._cacheQuerySimple = new Map()),
              (this._cacheText = new Map()),
              (this._scoreMap = void 0),
              (this._retainCacheCounter = 0);
            for (const [t, r] of e) this._engines.set(t, r);
            this._engines.set('not', c),
              this._engines.set('is', o),
              this._engines.set('where', o),
              this._engines.set('has', i),
              this._engines.set('scope', s),
              this._engines.set('light', a),
              this._engines.set('visible', u),
              this._engines.set('text', p),
              this._engines.set('text-is', l),
              this._engines.set('text-matches', h),
              this._engines.set('has-text', f),
              this._engines.set('right-of', k('right-of', v)),
              this._engines.set('left-of', k('left-of', _)),
              this._engines.set('above', k('above', T)),
              this._engines.set('below', k('below', b)),
              this._engines.set('near', k('near', E)),
              this._engines.set('nth-match', C);
            const t = [...this._engines.keys()];
            t.sort();
            const r = [...n.customCSSNames];
            if ((r.sort(), t.join('|') !== r.join('|')))
              throw new Error(
                `Please keep customCSSNames in sync with evaluator engines: ${t.join(
                  '|',
                )} vs ${r.join('|')}`,
              );
          }
          begin() {
            ++this._retainCacheCounter;
          }
          end() {
            --this._retainCacheCounter,
              this._retainCacheCounter ||
                (this._cacheQueryCSS.clear(),
                this._cacheMatches.clear(),
                this._cacheQuery.clear(),
                this._cacheMatchesSimple.clear(),
                this._cacheMatchesParents.clear(),
                this._cacheCallMatches.clear(),
                this._cacheCallQuery.clear(),
                this._cacheQuerySimple.clear(),
                this._cacheText.clear());
          }
          _cached(e, t, r, n) {
            e.has(t) || e.set(t, []);
            const o = e.get(t),
              i = o.find((e) => r.every((t, r) => e.rest[r] === t));
            if (i) return i.result;
            const s = n();
            return o.push({rest: r, result: s}), s;
          }
          _checkSelector(e) {
            if (
              'object' != typeof e ||
              !e ||
              !(Array.isArray(e) || ('simples' in e && e.simples.length))
            )
              throw new Error(`Malformed selector "${e}"`);
            return e;
          }
          matches(e, t, r) {
            const n = this._checkSelector(t);
            this.begin();
            try {
              return this._cached(
                this._cacheMatches,
                e,
                [n, r.scope, r.pierceShadow],
                () =>
                  Array.isArray(n)
                    ? this._matchesEngine(o, e, n, r)
                    : !!this._matchesSimple(
                        e,
                        n.simples[n.simples.length - 1].selector,
                        r,
                      ) && this._matchesParents(e, n, n.simples.length - 2, r),
              );
            } finally {
              this.end();
            }
          }
          query(e, t) {
            const r = this._checkSelector(t);
            this.begin();
            try {
              return this._cached(
                this._cacheQuery,
                r,
                [e.scope, e.pierceShadow],
                () => {
                  if (Array.isArray(r)) return this._queryEngine(o, e, r);
                  const t = this._scoreMap;
                  this._scoreMap = new Map();
                  let n = this._querySimple(
                    e,
                    r.simples[r.simples.length - 1].selector,
                  );
                  return (
                    (n = n.filter((t) =>
                      this._matchesParents(t, r, r.simples.length - 2, e),
                    )),
                    this._scoreMap.size &&
                      n.sort((e, t) => {
                        const r = this._scoreMap.get(e),
                          n = this._scoreMap.get(t);
                        return r === n
                          ? 0
                          : void 0 === r
                          ? 1
                          : void 0 === n
                          ? -1
                          : r - n;
                      }),
                    (this._scoreMap = t),
                    n
                  );
                },
              );
            } finally {
              this.end();
            }
          }
          _markScore(e, t) {
            this._scoreMap && this._scoreMap.set(e, t);
          }
          _matchesSimple(e, t, r) {
            return this._cached(
              this._cacheMatchesSimple,
              e,
              [t, r.scope, r.pierceShadow],
              () => {
                if (
                  !t.functions.some(
                    (e) => 'scope' === e.name || 'is' === e.name,
                  ) &&
                  e === r.scope
                )
                  return !1;
                if (t.css && !this._matchesCSS(e, t.css)) return !1;
                for (const n of t.functions)
                  if (
                    !this._matchesEngine(this._getEngine(n.name), e, n.args, r)
                  )
                    return !1;
                return !0;
              },
            );
          }
          _querySimple(e, t) {
            return t.functions.length
              ? this._cached(
                  this._cacheQuerySimple,
                  t,
                  [e.scope, e.pierceShadow],
                  () => {
                    let r = t.css;
                    const n = t.functions;
                    let o;
                    '*' === r && n.length && (r = void 0);
                    let i = -1;
                    void 0 !== r
                      ? (o = this._queryCSS(e, r))
                      : ((i = n.findIndex(
                          (e) => void 0 !== this._getEngine(e.name).query,
                        )),
                        -1 === i && (i = 0),
                        (o = this._queryEngine(
                          this._getEngine(n[i].name),
                          e,
                          n[i].args,
                        )));
                    for (let t = 0; t < n.length; t++) {
                      if (t === i) continue;
                      const r = this._getEngine(n[t].name);
                      void 0 !== r.matches &&
                        (o = o.filter((o) =>
                          this._matchesEngine(r, o, n[t].args, e),
                        ));
                    }
                    for (let t = 0; t < n.length; t++) {
                      if (t === i) continue;
                      const r = this._getEngine(n[t].name);
                      void 0 === r.matches &&
                        (o = o.filter((o) =>
                          this._matchesEngine(r, o, n[t].args, e),
                        ));
                    }
                    return o;
                  },
                )
              : this._queryCSS(e, t.css || '*');
          }
          _matchesParents(e, t, r, n) {
            return (
              r < 0 ||
              this._cached(
                this._cacheMatchesParents,
                e,
                [t, r, n.scope, n.pierceShadow],
                () => {
                  const {selector: o, combinator: i} = t.simples[r];
                  if ('>' === i) {
                    const i = M(e, n);
                    return (
                      !(!i || !this._matchesSimple(i, o, n)) &&
                      this._matchesParents(i, t, r - 1, n)
                    );
                  }
                  if ('+' === i) {
                    const i = x(e, n);
                    return (
                      !(!i || !this._matchesSimple(i, o, n)) &&
                      this._matchesParents(i, t, r - 1, n)
                    );
                  }
                  if ('' === i) {
                    let i = M(e, n);
                    for (; i; ) {
                      if (this._matchesSimple(i, o, n)) {
                        if (this._matchesParents(i, t, r - 1, n)) return !0;
                        if ('' === t.simples[r - 1].combinator) break;
                      }
                      i = M(i, n);
                    }
                    return !1;
                  }
                  if ('~' === i) {
                    let i = x(e, n);
                    for (; i; ) {
                      if (this._matchesSimple(i, o, n)) {
                        if (this._matchesParents(i, t, r - 1, n)) return !0;
                        if ('~' === t.simples[r - 1].combinator) break;
                      }
                      i = x(i, n);
                    }
                    return !1;
                  }
                  if ('>=' === i) {
                    let i = e;
                    for (; i; ) {
                      if (this._matchesSimple(i, o, n)) {
                        if (this._matchesParents(i, t, r - 1, n)) return !0;
                        if ('' === t.simples[r - 1].combinator) break;
                      }
                      i = M(i, n);
                    }
                    return !1;
                  }
                  throw new Error(`Unsupported combinator "${i}"`);
                },
              )
            );
          }
          _matchesEngine(e, t, r, n) {
            if (e.matches) return this._callMatches(e, t, r, n);
            if (e.query) return this._callQuery(e, r, n).includes(t);
            throw new Error(
              'Selector engine should implement "matches" or "query"',
            );
          }
          _queryEngine(e, t, r) {
            if (e.query) return this._callQuery(e, r, t);
            if (e.matches)
              return this._queryCSS(t, '*').filter((n) =>
                this._callMatches(e, n, r, t),
              );
            throw new Error(
              'Selector engine should implement "matches" or "query"',
            );
          }
          _callMatches(e, t, r, n) {
            return this._cached(
              this._cacheCallMatches,
              t,
              [e, n.scope, n.pierceShadow, ...r],
              () => e.matches(t, r, n, this),
            );
          }
          _callQuery(e, t, r) {
            return this._cached(
              this._cacheCallQuery,
              e,
              [r.scope, r.pierceShadow, ...t],
              () => e.query(r, t, this),
            );
          }
          _matchesCSS(e, t) {
            return e.matches(t);
          }
          _queryCSS(e, t) {
            return this._cached(
              this._cacheQueryCSS,
              t,
              [e.scope, e.pierceShadow],
              () => {
                let r = [];
                return (
                  (function n(o) {
                    if (
                      ((r = r.concat([...o.querySelectorAll(t)])),
                      e.pierceShadow)
                    ) {
                      o.shadowRoot && n(o.shadowRoot);
                      for (const e of o.querySelectorAll('*'))
                        e.shadowRoot && n(e.shadowRoot);
                    }
                  })(e.scope),
                  r
                );
              },
            );
          }
          _getEngine(e) {
            const t = this._engines.get(e);
            if (!t) throw new Error(`Unknown selector engine "${e}"`);
            return t;
          }
        };
        const o = {
            matches(e, t, r, n) {
              if (0 === t.length)
                throw new Error('"is" engine expects non-empty selector list');
              return t.some((t) => n.matches(e, t, r));
            },
            query(e, t, r) {
              if (0 === t.length)
                throw new Error('"is" engine expects non-empty selector list');
              let n = [];
              for (const o of t) n = n.concat(r.query(e, o));
              return 1 === t.length
                ? n
                : (function (e) {
                    const t = new Map(),
                      r = [],
                      n = [];
                    function o(e) {
                      let n = t.get(e);
                      if (n) return n;
                      const i = O(e);
                      return (
                        i ? o(i).children.push(e) : r.push(e),
                        (n = {children: [], taken: !1}),
                        t.set(e, n),
                        n
                      );
                    }
                    return (
                      e.forEach((e) => (o(e).taken = !0)),
                      r.forEach(function e(r) {
                        const o = t.get(r);
                        if ((o.taken && n.push(r), o.children.length > 1)) {
                          const e = new Set(o.children);
                          o.children = [];
                          let t = r.firstElementChild;
                          for (; t && o.children.length < e.size; )
                            e.has(t) && o.children.push(t),
                              (t = t.nextElementSibling);
                          for (
                            t = r.shadowRoot
                              ? r.shadowRoot.firstElementChild
                              : null;
                            t && o.children.length < e.size;

                          )
                            e.has(t) && o.children.push(t),
                              (t = t.nextElementSibling);
                        }
                        o.children.forEach(e);
                      }),
                      n
                    );
                  })(n);
            },
          },
          i = {
            matches(e, t, r, n) {
              if (0 === t.length)
                throw new Error('"has" engine expects non-empty selector list');
              return n.query({...r, scope: e}, t).length > 0;
            },
          },
          s = {
            matches(e, t, r, n) {
              if (0 !== t.length)
                throw new Error('"scope" engine expects no arguments');
              return 9 === r.scope.nodeType
                ? e === r.scope.documentElement
                : e === r.scope;
            },
            query(e, t, r) {
              if (0 !== t.length)
                throw new Error('"scope" engine expects no arguments');
              if (9 === e.scope.nodeType) {
                const t = e.scope.documentElement;
                return t ? [t] : [];
              }
              return 1 === e.scope.nodeType ? [e.scope] : [];
            },
          },
          c = {
            matches(e, t, r, n) {
              if (0 === t.length)
                throw new Error('"not" engine expects non-empty selector list');
              return !n.matches(e, t, r);
            },
          },
          a = {
            query: (e, t, r) => r.query({...e, pierceShadow: !1}, t),
            matches: (e, t, r, n) => n.matches(e, t, {...r, pierceShadow: !1}),
          },
          u = {
            matches(e, t, r, n) {
              if (t.length)
                throw new Error('"visible" engine expects no arguments');
              return N(e);
            },
          },
          p = {
            matches(e, t, r, n) {
              if (1 !== t.length || 'string' != typeof t[0])
                throw new Error('"text" engine expects a single string');
              return 'self' === S(n, e, y(t[0]));
            },
          },
          l = {
            matches(e, t, r, n) {
              if (1 !== t.length || 'string' != typeof t[0])
                throw new Error('"text-is" engine expects a single string');
              return 'none' !== S(n, e, g(t[0]));
            },
          },
          h = {
            matches(e, t, r, n) {
              if (
                0 === t.length ||
                'string' != typeof t[0] ||
                t.length > 2 ||
                (2 === t.length && 'string' != typeof t[1])
              )
                throw new Error(
                  '"text-matches" engine expects a regexp body and optional regexp flags',
                );
              return (
                'self' === S(n, e, m(t[0], 2 === t.length ? t[1] : void 0))
              );
            },
          },
          f = {
            matches(e, t, r, n) {
              if (1 !== t.length || 'string' != typeof t[0])
                throw new Error('"has-text" engine expects a single string');
              return !d(e) && y(t[0])(w(n, e));
            },
          };
        function y(e) {
          return (
            (e = e.trim().replace(/\s+/g, ' ').toLowerCase()),
            (t) => t.full.trim().replace(/\s+/g, ' ').toLowerCase().includes(e)
          );
        }
        function g(e) {
          return (
            (e = e.trim().replace(/\s+/g, ' ')),
            (t) => t.immediate.some((t) => t.trim().replace(/\s+/g, ' ') === e)
          );
        }
        function m(e, t) {
          const r = new RegExp(e, t);
          return (e) => r.test(e.full);
        }
        function d(e) {
          return (
            'SCRIPT' === e.nodeName ||
            'STYLE' === e.nodeName ||
            (document.head && document.head.contains(e))
          );
        }
        function w(e, t) {
          let r = e._cacheText.get(t);
          if (void 0 === r) {
            if (((r = {full: '', immediate: []}), !d(t))) {
              let n = '';
              if (
                t instanceof HTMLInputElement &&
                ('submit' === t.type || 'button' === t.type)
              )
                r = {full: t.value, immediate: [t.value]};
              else {
                for (let o = t.firstChild; o; o = o.nextSibling)
                  o.nodeType === Node.TEXT_NODE
                    ? ((r.full += o.nodeValue || ''), (n += o.nodeValue || ''))
                    : (n && r.immediate.push(n),
                      (n = ''),
                      o.nodeType === Node.ELEMENT_NODE &&
                        (r.full += w(e, o).full));
                n && r.immediate.push(n),
                  t.shadowRoot && (r.full += w(e, t.shadowRoot).full);
              }
            }
            e._cacheText.set(t, r);
          }
          return r;
        }
        function S(e, t, r) {
          if (d(t)) return 'none';
          if (!r(w(e, t))) return 'none';
          for (let n = t.firstChild; n; n = n.nextSibling)
            if (n.nodeType === Node.ELEMENT_NODE && r(w(e, n)))
              return 'selfAndChildren';
          return t.shadowRoot && r(w(e, t.shadowRoot))
            ? 'selfAndChildren'
            : 'self';
        }
        function v(e, t, r) {
          const n = e.left - t.right;
          if (!(n < 0 || (void 0 !== r && n > r)))
            return (
              n + Math.max(t.bottom - e.bottom, 0) + Math.max(e.top - t.top, 0)
            );
        }
        function _(e, t, r) {
          const n = t.left - e.right;
          if (!(n < 0 || (void 0 !== r && n > r)))
            return (
              n + Math.max(t.bottom - e.bottom, 0) + Math.max(e.top - t.top, 0)
            );
        }
        function T(e, t, r) {
          const n = t.top - e.bottom;
          if (!(n < 0 || (void 0 !== r && n > r)))
            return (
              n + Math.max(e.left - t.left, 0) + Math.max(t.right - e.right, 0)
            );
        }
        function b(e, t, r) {
          const n = e.top - t.bottom;
          if (!(n < 0 || (void 0 !== r && n > r)))
            return (
              n + Math.max(e.left - t.left, 0) + Math.max(t.right - e.right, 0)
            );
        }
        function E(e, t, r) {
          const n = void 0 === r ? 50 : r;
          let o = 0;
          return (
            e.left - t.right >= 0 && (o += e.left - t.right),
            t.left - e.right >= 0 && (o += t.left - e.right),
            t.top - e.bottom >= 0 && (o += t.top - e.bottom),
            e.top - t.bottom >= 0 && (o += e.top - t.bottom),
            o > n ? void 0 : o
          );
        }
        function k(e, t) {
          return {
            matches(r, n, o, i) {
              const s =
                  n.length && 'number' == typeof n[n.length - 1]
                    ? n[n.length - 1]
                    : void 0,
                c = void 0 === s ? n : n.slice(0, n.length - 1);
              if (n.length < 1 + (void 0 === s ? 0 : 1))
                throw new Error(
                  `"${e}" engine expects a selector list and optional maximum distance in pixels`,
                );
              const a = r.getBoundingClientRect();
              let u;
              for (const e of i.query(o, c)) {
                if (e === r) continue;
                const n = t(a, e.getBoundingClientRect(), s);
                void 0 !== n && (void 0 === u || n < u) && (u = n);
              }
              return void 0 !== u && (i._markScore(r, u), !0);
            },
          };
        }
        const C = {
          query(e, t, r) {
            let n = t[t.length - 1];
            if (t.length < 2)
              throw new Error(
                '"nth-match" engine expects non-empty selector list and an index argument',
              );
            if ('number' != typeof n || n < 1)
              throw new Error(
                '"nth-match" engine expects a one-based index as the last argument',
              );
            const i = o.query(e, t.slice(0, t.length - 1), r);
            return n--, n < i.length ? [i[n]] : [];
          },
        };
        function O(e) {
          return e.parentElement
            ? e.parentElement
            : e.parentNode &&
              e.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
              e.parentNode.host
            ? e.parentNode.host
            : void 0;
        }
        function M(e, t) {
          if (e !== t.scope)
            return t.pierceShadow ? O(e) : e.parentElement || void 0;
        }
        function x(e, t) {
          if (e !== t.scope) return e.previousElementSibling || void 0;
        }
        function N(e) {
          if (!e.ownerDocument || !e.ownerDocument.defaultView) return !0;
          const t = e.ownerDocument.defaultView.getComputedStyle(e);
          if (!t || 'hidden' === t.visibility) return !1;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }
      },
      854: (e, t, r) => {
        Object.defineProperty(t, '__esModule', {value: !0}),
          (t.querySelector = function (e, t, r) {
            try {
              const n = e.parseSelector(t);
              return {selector: t, elements: e.querySelectorAll(n, r)};
            } catch (e) {
              return {selector: t, elements: []};
            }
          }),
          (t.generateSelector = function (e, t) {
            e._evaluator.begin();
            try {
              const r = (function (e, t) {
                  if (t.ownerDocument.documentElement === t)
                    return [{engine: 'css', selector: 'html', score: 1}];
                  const r = (u, l) => {
                    const y = l ? o : i;
                    let g = y.get(u);
                    return (
                      void 0 === g &&
                        ((g = ((o, i) => {
                          const u = o === t;
                          let l = i
                            ? (function (e, t, r) {
                                if ('SELECT' === t.nodeName) return [];
                                const o = (0, n.elementText)(e._evaluator, t)
                                  .full.trim()
                                  .replace(/\s+/g, ' ')
                                  .substring(0, 80);
                                if (!o) return [];
                                const i = [];
                                let s = o;
                                if (
                                  ((o.includes('"') ||
                                    o.includes('>>') ||
                                    '/' === o[0]) &&
                                    (s = `/.*${(function (e) {
                                      return e.replace(
                                        /[.*+?^>${}()|[\]\\]/g,
                                        '\\$&',
                                      );
                                    })(o)}.*/`),
                                  i.push({
                                    engine: 'text',
                                    selector: s,
                                    score: 10,
                                  }),
                                  r && s === o)
                                ) {
                                  let e = t.nodeName.toLocaleLowerCase();
                                  t.hasAttribute('role') &&
                                    (e += `[role=${p(
                                      t.getAttribute('role'),
                                    )}]`),
                                    i.push({
                                      engine: 'css',
                                      selector: `${e}:has-text("${o}")`,
                                      score: 30,
                                    });
                                }
                                return i;
                              })(e, o, o === t).map((e) => [e])
                            : [];
                          o !== t && (l = s(l));
                          const y = (function (e, t) {
                            const r = [];
                            for (const e of [
                              'data-testid',
                              'data-test-id',
                              'data-test',
                            ])
                              t.hasAttribute(e) &&
                                r.push({
                                  engine: 'css',
                                  selector: `[${e}=${p(t.getAttribute(e))}]`,
                                  score: 1,
                                });
                            if ('INPUT' === t.nodeName) {
                              const e = t;
                              e.placeholder &&
                                r.push({
                                  engine: 'css',
                                  selector: `[placeholder=${p(e.placeholder)}]`,
                                  score: 10,
                                });
                            }
                            t.hasAttribute('aria-label') &&
                              r.push({
                                engine: 'css',
                                selector: `[aria-label=${p(
                                  t.getAttribute('aria-label'),
                                )}]`,
                                score: 10,
                              }),
                              t.getAttribute('alt') &&
                                ['APPLET', 'AREA', 'IMG', 'INPUT'].includes(
                                  t.nodeName,
                                ) &&
                                r.push({
                                  engine: 'css',
                                  selector: `${t.nodeName.toLowerCase()}[alt=${p(
                                    t.getAttribute('alt'),
                                  )}]`,
                                  score: 10,
                                }),
                              t.hasAttribute('role') &&
                                r.push({
                                  engine: 'css',
                                  selector: `${t.nodeName.toLocaleLowerCase()}[role=${p(
                                    t.getAttribute('role'),
                                  )}]`,
                                  score: 50,
                                }),
                              t.getAttribute('name') &&
                                [
                                  'BUTTON',
                                  'FORM',
                                  'FIELDSET',
                                  'IFRAME',
                                  'INPUT',
                                  'KEYGEN',
                                  'OBJECT',
                                  'OUTPUT',
                                  'SELECT',
                                  'TEXTAREA',
                                  'MAP',
                                  'META',
                                  'PARAM',
                                ].includes(t.nodeName) &&
                                r.push({
                                  engine: 'css',
                                  selector: `${t.nodeName.toLowerCase()}[name=${p(
                                    t.getAttribute('name'),
                                  )}]`,
                                  score: 50,
                                }),
                              ['INPUT', 'TEXTAREA'].includes(t.nodeName) &&
                                'hidden' !== t.getAttribute('type') &&
                                t.getAttribute('type') &&
                                r.push({
                                  engine: 'css',
                                  selector: `${t.nodeName.toLowerCase()}[type=${p(
                                    t.getAttribute('type'),
                                  )}]`,
                                  score: 50,
                                }),
                              ['INPUT', 'TEXTAREA', 'SELECT'].includes(
                                t.nodeName,
                              ) &&
                                r.push({
                                  engine: 'css',
                                  selector: t.nodeName.toLowerCase(),
                                  score: 50,
                                });
                            const n = t.getAttribute('id');
                            return (
                              n &&
                                !(function (e) {
                                  let t,
                                    r = 0;
                                  for (let n = 0; n < e.length; ++n) {
                                    const o = e[n];
                                    let i;
                                    '-' !== o &&
                                      '_' !== o &&
                                      ((i =
                                        o >= 'a' && o <= 'z'
                                          ? 'lower'
                                          : o >= 'A' && o <= 'Z'
                                          ? 'upper'
                                          : o >= '0' && o <= '9'
                                          ? 'digit'
                                          : 'other'),
                                      'lower' !== i || 'upper' !== t
                                        ? (t && t !== i && ++r, (t = i))
                                        : (t = i));
                                  }
                                  return r >= e.length / 4;
                                })(n) &&
                                r.push({
                                  engine: 'css',
                                  selector: a(n),
                                  score: 100,
                                }),
                              r.push({
                                engine: 'css',
                                selector: t.nodeName.toLocaleLowerCase(),
                                score: 200,
                              }),
                              r
                            );
                          })(0, o).map((e) => [e]);
                          let g = f(e, t.ownerDocument, o, [...l, ...y], u);
                          l = s(l);
                          const m = (t) => {
                            const n = i && !t.length,
                              s = [...t, ...y].filter((e) => !g || h(e) < h(g));
                            let a = s[0];
                            if (a)
                              for (let t = c(o); t; t = c(t)) {
                                const i = r(t, n);
                                if (!i) continue;
                                if (g && h([...i, ...a]) >= h(g)) continue;
                                if (((a = f(e, t, o, s, u)), !a)) return;
                                const c = [...i, ...a];
                                (!g || h(c) < h(g)) && (g = c);
                              }
                          };
                          return m(l), o === t && l.length && m([]), g;
                        })(u, l)),
                        y.set(u, g)),
                      g
                    );
                  };
                  return r(t, !0);
                })(
                  e,
                  (t =
                    t.closest(
                      'button,select,input,[role=button],[role=checkbox],[role=radio]',
                    ) || t),
                ),
                y = l(r || [u(e, t)]),
                g = e.parseSelector(y);
              return {
                selector: y,
                elements: e.querySelectorAll(g, t.ownerDocument),
              };
            } finally {
              o.clear(), i.clear(), e._evaluator.end();
            }
          });
        var n = r(848);
        const o = new Map(),
          i = new Map();
        function s(e) {
          return e.filter((e) => '/' !== e[0].selector[0]);
        }
        function c(e) {
          return e.parentElement
            ? e.parentElement
            : e.parentNode &&
              e.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
              e.parentNode.host
            ? e.parentNode.host
            : null;
        }
        function a(e) {
          return /^[a-zA-Z][a-zA-Z0-9\-\_]+$/.test(e) ? '#' + e : `[id="${e}"]`;
        }
        function u(e, t) {
          const r = 1e7,
            n = t.ownerDocument,
            o = [];
          function i(r) {
            const n = o.slice();
            r && n.unshift(r);
            const i = n.join(' '),
              s = e.parseSelector(i);
            return e.querySelector(s, t.ownerDocument, !1) === t ? i : void 0;
          }
          for (let e = t; e && e !== n; e = c(e)) {
            const t = e.nodeName.toLowerCase();
            let n = '';
            if (e.id) {
              const t = a(e.id),
                o = i(t);
              if (o) return {engine: 'css', selector: o, score: r};
              n = t;
            }
            const s = e.parentNode,
              c = [...e.classList];
            for (let e = 0; e < c.length; ++e) {
              const t = '.' + c.slice(0, e + 1).join('.'),
                o = i(t);
              if (o) return {engine: 'css', selector: o, score: r};
              !n && s && 1 === s.querySelectorAll(t).length && (n = t);
            }
            if (s) {
              const o = [...s.children],
                c =
                  0 ===
                  o.filter((e) => e.nodeName.toLowerCase() === t).indexOf(e)
                    ? t
                    : `${t}:nth-child(${1 + o.indexOf(e)})`,
                a = i(c);
              if (a) return {engine: 'css', selector: a, score: r};
              n || (n = c);
            } else n || (n = t);
            o.unshift(n);
          }
          return {engine: 'css', selector: i(), score: r};
        }
        function p(e) {
          return `"${e.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
        }
        function l(e) {
          const t = [];
          let r = '';
          for (const {engine: n, selector: o} of e)
            t.length &&
              ('css' !== r || 'css' !== n || o.startsWith(':nth-match(')) &&
              t.push('>>'),
              (r = n),
              'css' === n ? t.push(o) : t.push(`${n}=${o}`);
          return t.join(' ');
        }
        function h(e) {
          let t = 0;
          for (let r = 0; r < e.length; r++) t += e[r].score * (e.length - r);
          return t;
        }
        function f(e, t, r, n, o) {
          const i = n.map((e) => ({tokens: e, score: h(e)}));
          i.sort((e, t) => e.score - t.score);
          let s = null;
          for (const {tokens: n} of i) {
            const i = e.parseSelector(l(n)),
              c = e.querySelectorAll(i, t),
              a = c.indexOf(r);
            if (0 === a) return n;
            if (!o || s || -1 === a || c.length > 5) continue;
            const u = n.map((e) =>
              'text' !== e.engine
                ? e
                : e.selector.startsWith('/') && e.selector.endsWith('/')
                ? {
                    engine: 'css',
                    selector: `:text-matches("${e.selector.substring(
                      1,
                      e.selector.length - 1,
                    )}")`,
                    score: e.score,
                  }
                : {
                    engine: 'css',
                    selector: `:text("${e.selector}")`,
                    score: e.score,
                  },
            );
            s = [
              {
                engine: 'css',
                selector: `:nth-match(${l(u)}, ${a + 1})`,
                score: h(u) + 1e3,
              },
            ];
          }
          return s;
        }
      },
    },
    t = {};
  function r(n) {
    var o = t[n];
    if (void 0 !== o) return o.exports;
    var i = (t[n] = {exports: {}});
    return e[n](i, i.exports, r), i.exports;
  }
  var n = {};
  (() => {
    var e = n;
    e.default = void 0;
    var t = r(854);
    var o = class {
      constructor(e) {
        (this._injectedScript = void 0),
          (this._injectedScript = e),
          window.playwright ||
            (window.playwright = {
              $: (e, t) => this._querySelector(e, !!t),
              $$: (e) => this._querySelectorAll(e),
              inspect: (e) => this._inspect(e),
              selector: (e) => this._selector(e),
              resume: () => this._resume(),
            });
      }
      _querySelector(e, t) {
        if ('string' != typeof e)
          throw new Error("Usage: playwright.query('Playwright >> selector').");
        const r = this._injectedScript.parseSelector(e);
        return this._injectedScript.querySelector(r, document, t);
      }
      _querySelectorAll(e) {
        if ('string' != typeof e)
          throw new Error("Usage: playwright.$$('Playwright >> selector').");
        const t = this._injectedScript.parseSelector(e);
        return this._injectedScript.querySelectorAll(t, document);
      }
      _inspect(e) {
        if ('string' != typeof e)
          throw new Error(
            "Usage: playwright.inspect('Playwright >> selector').",
          );
        window.inspect(this._querySelector(e, !1));
      }
      _selector(e) {
        if (!(e instanceof Element))
          throw new Error('Usage: playwright.selector(element).');
        return (0, t.generateSelector)(this._injectedScript, e).selector;
      }
      _resume() {
        window._playwrightResume().catch(() => {});
      }
    };
    e.default = o;
  })(),
    (pwExport = n.default);
})();
