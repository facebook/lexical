(() => {
  'use strict';
  var e, t;
  (e = void 0),
    (t = function (e) {
      const t = -2,
        n = -3,
        i = -5,
        r = [
          0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383,
          32767, 65535,
        ],
        a = [
          96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0,
          8, 48, 0, 9, 192, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 160, 0, 8, 0,
          0, 8, 128, 0, 8, 64, 0, 9, 224, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9,
          144, 83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 208, 81, 7, 17, 0, 8, 104,
          0, 8, 40, 0, 9, 176, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 240, 80, 7,
          4, 0, 8, 84, 0, 8, 20, 85, 8, 227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0,
          9, 200, 81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 168, 0, 8, 4, 0, 8, 132,
          0, 8, 68, 0, 9, 232, 80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 152, 84, 7,
          83, 0, 8, 124, 0, 8, 60, 0, 9, 216, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0,
          9, 184, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 248, 80, 7, 3, 0, 8, 82,
          0, 8, 18, 85, 8, 163, 83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 196, 81,
          7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 164, 0, 8, 2, 0, 8, 130, 0, 8, 66, 0,
          9, 228, 80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 148, 84, 7, 67, 0, 8, 122,
          0, 8, 58, 0, 9, 212, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 180, 0, 8,
          10, 0, 8, 138, 0, 8, 74, 0, 9, 244, 80, 7, 5, 0, 8, 86, 0, 8, 22, 192,
          8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 204, 81, 7, 15, 0, 8, 102,
          0, 8, 38, 0, 9, 172, 0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 236, 80, 7,
          9, 0, 8, 94, 0, 8, 30, 0, 9, 156, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0,
          9, 220, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 188, 0, 8, 14, 0, 8,
          142, 0, 8, 78, 0, 9, 252, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131,
          82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 194, 80, 7, 10, 0, 8, 97, 0, 8,
          33, 0, 9, 162, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 226, 80, 7, 6, 0,
          8, 89, 0, 8, 25, 0, 9, 146, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 210,
          81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 178, 0, 8, 9, 0, 8, 137, 0, 8,
          73, 0, 9, 242, 80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0,
          8, 117, 0, 8, 53, 0, 9, 202, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9,
          170, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 234, 80, 7, 8, 0, 8, 93, 0,
          8, 29, 0, 9, 154, 84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 218, 82, 7,
          23, 0, 8, 109, 0, 8, 45, 0, 9, 186, 0, 8, 13, 0, 8, 141, 0, 8, 77, 0,
          9, 250, 80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8,
          115, 0, 8, 51, 0, 9, 198, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 166, 0,
          8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 230, 80, 7, 7, 0, 8, 91, 0, 8, 27, 0,
          9, 150, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 214, 82, 7, 19, 0, 8,
          107, 0, 8, 43, 0, 9, 182, 0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 246,
          80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8,
          55, 0, 9, 206, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 174, 0, 8, 7, 0,
          8, 135, 0, 8, 71, 0, 9, 238, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 158,
          84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 222, 82, 7, 27, 0, 8, 111, 0, 8,
          47, 0, 9, 190, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 254, 96, 7, 256,
          0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9,
          193, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 161, 0, 8, 0, 0, 8, 128, 0,
          8, 64, 0, 9, 225, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 145, 83, 7, 59,
          0, 8, 120, 0, 8, 56, 0, 9, 209, 81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9,
          177, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 241, 80, 7, 4, 0, 8, 84, 0,
          8, 20, 85, 8, 227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 201, 81, 7,
          13, 0, 8, 100, 0, 8, 36, 0, 9, 169, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0,
          9, 233, 80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 153, 84, 7, 83, 0, 8, 124,
          0, 8, 60, 0, 9, 217, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 185, 0, 8,
          12, 0, 8, 140, 0, 8, 76, 0, 9, 249, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85,
          8, 163, 83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 197, 81, 7, 11, 0, 8,
          98, 0, 8, 34, 0, 9, 165, 0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 229, 80,
          7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 149, 84, 7, 67, 0, 8, 122, 0, 8, 58,
          0, 9, 213, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 181, 0, 8, 10, 0, 8,
          138, 0, 8, 74, 0, 9, 245, 80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83,
          7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 205, 81, 7, 15, 0, 8, 102, 0, 8, 38,
          0, 9, 173, 0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 237, 80, 7, 9, 0, 8,
          94, 0, 8, 30, 0, 9, 157, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 221,
          82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 189, 0, 8, 14, 0, 8, 142, 0, 8,
          78, 0, 9, 253, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31,
          0, 8, 113, 0, 8, 49, 0, 9, 195, 80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9,
          163, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 227, 80, 7, 6, 0, 8, 89, 0,
          8, 25, 0, 9, 147, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 211, 81, 7,
          17, 0, 8, 105, 0, 8, 41, 0, 9, 179, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0,
          9, 243, 80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8,
          117, 0, 8, 53, 0, 9, 203, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 171,
          0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 235, 80, 7, 8, 0, 8, 93, 0, 8, 29,
          0, 9, 155, 84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 219, 82, 7, 23, 0, 8,
          109, 0, 8, 45, 0, 9, 187, 0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 251,
          80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8,
          51, 0, 9, 199, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 167, 0, 8, 3, 0,
          8, 131, 0, 8, 67, 0, 9, 231, 80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 151,
          84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 215, 82, 7, 19, 0, 8, 107, 0, 8,
          43, 0, 9, 183, 0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 247, 80, 7, 5, 0,
          8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 207,
          81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 175, 0, 8, 7, 0, 8, 135, 0, 8,
          71, 0, 9, 239, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 159, 84, 7, 99, 0,
          8, 127, 0, 8, 63, 0, 9, 223, 82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9,
          191, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 255,
        ],
        s = [
          80, 5, 1, 87, 5, 257, 83, 5, 17, 91, 5, 4097, 81, 5, 5, 89, 5, 1025,
          85, 5, 65, 93, 5, 16385, 80, 5, 3, 88, 5, 513, 84, 5, 33, 92, 5, 8193,
          82, 5, 9, 90, 5, 2049, 86, 5, 129, 192, 5, 24577, 80, 5, 2, 87, 5,
          385, 83, 5, 25, 91, 5, 6145, 81, 5, 7, 89, 5, 1537, 85, 5, 97, 93, 5,
          24577, 80, 5, 4, 88, 5, 769, 84, 5, 49, 92, 5, 12289, 82, 5, 13, 90,
          5, 3073, 86, 5, 193, 192, 5, 24577,
        ],
        o = [
          3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51,
          59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0,
        ],
        c = [
          0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,
          4, 5, 5, 5, 5, 0, 112, 112,
        ],
        l = [
          1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385,
          513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385,
          24577,
        ],
        d = [
          0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10,
          10, 11, 11, 12, 12, 13, 13,
        ];
      function u() {
        let e, t, r, a, s, u;
        function f(e, t, o, c, l, d, f, h, _, w, p) {
          let b, g, y, x, m, k, v, A, R, U, E, S, z, D, T;
          (U = 0), (m = o);
          do {
            r[e[t + U]]++, U++, m--;
          } while (0 !== m);
          if (r[0] == o) return (f[0] = -1), (h[0] = 0), 0;
          for (A = h[0], k = 1; k <= 15 && 0 === r[k]; k++);
          for (v = k, A < k && (A = k), m = 15; 0 !== m && 0 === r[m]; m--);
          for (
            y = m, A > m && (A = m), h[0] = A, D = 1 << k;
            k < m;
            k++, D <<= 1
          )
            if ((D -= r[k]) < 0) return n;
          if ((D -= r[m]) < 0) return n;
          for (r[m] += D, u[1] = k = 0, U = 1, z = 2; 0 != --m; )
            (u[z] = k += r[U]), z++, U++;
          (m = 0), (U = 0);
          do {
            0 !== (k = e[t + U]) && (p[u[k]++] = m), U++;
          } while (++m < o);
          for (
            o = u[y],
              u[0] = m = 0,
              U = 0,
              x = -1,
              S = -A,
              s[0] = 0,
              E = 0,
              T = 0;
            v <= y;
            v++
          )
            for (b = r[v]; 0 != b--; ) {
              for (; v > S + A; ) {
                if (
                  (x++,
                  (S += A),
                  (T = y - S),
                  (T = T > A ? A : T),
                  (g = 1 << (k = v - S)) > b + 1 &&
                    ((g -= b + 1), (z = v), k < T))
                )
                  for (; ++k < T && !((g <<= 1) <= r[++z]); ) g -= r[z];
                if (((T = 1 << k), w[0] + T > 1440)) return n;
                (s[x] = E = w[0]),
                  (w[0] += T),
                  0 !== x
                    ? ((u[x] = m),
                      (a[0] = k),
                      (a[1] = A),
                      (k = m >>> (S - A)),
                      (a[2] = E - s[x - 1] - k),
                      _.set(a, 3 * (s[x - 1] + k)))
                    : (f[0] = E);
              }
              for (
                a[1] = v - S,
                  U >= o
                    ? (a[0] = 192)
                    : p[U] < c
                    ? ((a[0] = p[U] < 256 ? 0 : 96), (a[2] = p[U++]))
                    : ((a[0] = d[p[U] - c] + 16 + 64), (a[2] = l[p[U++] - c])),
                  g = 1 << (v - S),
                  k = m >>> S;
                k < T;
                k += g
              )
                _.set(a, 3 * (E + k));
              for (k = 1 << (v - 1); 0 != (m & k); k >>>= 1) m ^= k;
              for (m ^= k, R = (1 << S) - 1; (m & R) != u[x]; )
                x--, (S -= A), (R = (1 << S) - 1);
            }
          return 0 !== D && 1 != y ? i : 0;
        }
        function h(n) {
          let i;
          for (
            e ||
              ((e = []),
              (t = []),
              (r = new Int32Array(16)),
              (a = []),
              (s = new Int32Array(15)),
              (u = new Int32Array(16))),
              t.length < n && (t = []),
              i = 0;
            i < n;
            i++
          )
            t[i] = 0;
          for (i = 0; i < 16; i++) r[i] = 0;
          for (i = 0; i < 3; i++) a[i] = 0;
          s.set(r.subarray(0, 15), 0), u.set(r.subarray(0, 16), 0);
        }
        (this.inflate_trees_bits = function (r, a, s, o, c) {
          let l;
          return (
            h(19),
            (e[0] = 0),
            (l = f(r, 0, 19, 19, null, null, s, a, o, e, t)),
            l == n
              ? (c.msg = 'oversubscribed dynamic bit lengths tree')
              : (l != i && 0 !== a[0]) ||
                ((c.msg = 'incomplete dynamic bit lengths tree'), (l = n)),
            l
          );
        }),
          (this.inflate_trees_dynamic = function (r, a, s, u, _, w, p, b, g) {
            let y;
            return (
              h(288),
              (e[0] = 0),
              (y = f(s, 0, r, 257, o, c, w, u, b, e, t)),
              0 != y || 0 === u[0]
                ? (y == n
                    ? (g.msg = 'oversubscribed literal/length tree')
                    : -4 != y &&
                      ((g.msg = 'incomplete literal/length tree'), (y = n)),
                  y)
                : (h(288),
                  (y = f(s, r, a, 0, l, d, p, _, b, e, t)),
                  0 != y || (0 === _[0] && r > 257)
                    ? (y == n
                        ? (g.msg = 'oversubscribed distance tree')
                        : y == i
                        ? ((g.msg = 'incomplete distance tree'), (y = n))
                        : -4 != y &&
                          ((g.msg = 'empty distance tree with lengths'),
                          (y = n)),
                      y)
                    : 0)
            );
          });
      }
      function f() {
        const e = this;
        let i,
          a,
          s,
          o,
          c = 0,
          l = 0,
          d = 0,
          u = 0,
          f = 0,
          h = 0,
          _ = 0,
          w = 0,
          p = 0,
          b = 0;
        function g(e, t, i, a, s, o, c, l) {
          let d, u, f, h, _, w, p, b, g, y, x, m, k, v, A, R;
          (p = l.next_in_index),
            (b = l.avail_in),
            (_ = c.bitb),
            (w = c.bitk),
            (g = c.write),
            (y = g < c.read ? c.read - g - 1 : c.end - g),
            (x = r[e]),
            (m = r[t]);
          do {
            for (; w < 20; )
              b--, (_ |= (255 & l.read_byte(p++)) << w), (w += 8);
            if (
              ((d = _ & x),
              (u = i),
              (f = a),
              (R = 3 * (f + d)),
              0 !== (h = u[R]))
            )
              for (;;) {
                if (((_ >>= u[R + 1]), (w -= u[R + 1]), 0 != (16 & h))) {
                  for (
                    h &= 15, k = u[R + 2] + (_ & r[h]), _ >>= h, w -= h;
                    w < 15;

                  )
                    b--, (_ |= (255 & l.read_byte(p++)) << w), (w += 8);
                  for (d = _ & m, u = s, f = o, R = 3 * (f + d), h = u[R]; ; ) {
                    if (((_ >>= u[R + 1]), (w -= u[R + 1]), 0 != (16 & h))) {
                      for (h &= 15; w < h; )
                        b--, (_ |= (255 & l.read_byte(p++)) << w), (w += 8);
                      if (
                        ((v = u[R + 2] + (_ & r[h])),
                        (_ >>= h),
                        (w -= h),
                        (y -= k),
                        g >= v)
                      )
                        (A = g - v),
                          g - A > 0 && 2 > g - A
                            ? ((c.window[g++] = c.window[A++]),
                              (c.window[g++] = c.window[A++]),
                              (k -= 2))
                            : (c.window.set(c.window.subarray(A, A + 2), g),
                              (g += 2),
                              (A += 2),
                              (k -= 2));
                      else {
                        A = g - v;
                        do {
                          A += c.end;
                        } while (A < 0);
                        if (((h = c.end - A), k > h)) {
                          if (((k -= h), g - A > 0 && h > g - A))
                            do {
                              c.window[g++] = c.window[A++];
                            } while (0 != --h);
                          else
                            c.window.set(c.window.subarray(A, A + h), g),
                              (g += h),
                              (A += h),
                              (h = 0);
                          A = 0;
                        }
                      }
                      if (g - A > 0 && k > g - A)
                        do {
                          c.window[g++] = c.window[A++];
                        } while (0 != --k);
                      else
                        c.window.set(c.window.subarray(A, A + k), g),
                          (g += k),
                          (A += k),
                          (k = 0);
                      break;
                    }
                    if (0 != (64 & h))
                      return (
                        (l.msg = 'invalid distance code'),
                        (k = l.avail_in - b),
                        (k = w >> 3 < k ? w >> 3 : k),
                        (b += k),
                        (p -= k),
                        (w -= k << 3),
                        (c.bitb = _),
                        (c.bitk = w),
                        (l.avail_in = b),
                        (l.total_in += p - l.next_in_index),
                        (l.next_in_index = p),
                        (c.write = g),
                        n
                      );
                    (d += u[R + 2]),
                      (d += _ & r[h]),
                      (R = 3 * (f + d)),
                      (h = u[R]);
                  }
                  break;
                }
                if (0 != (64 & h))
                  return 0 != (32 & h)
                    ? ((k = l.avail_in - b),
                      (k = w >> 3 < k ? w >> 3 : k),
                      (b += k),
                      (p -= k),
                      (w -= k << 3),
                      (c.bitb = _),
                      (c.bitk = w),
                      (l.avail_in = b),
                      (l.total_in += p - l.next_in_index),
                      (l.next_in_index = p),
                      (c.write = g),
                      1)
                    : ((l.msg = 'invalid literal/length code'),
                      (k = l.avail_in - b),
                      (k = w >> 3 < k ? w >> 3 : k),
                      (b += k),
                      (p -= k),
                      (w -= k << 3),
                      (c.bitb = _),
                      (c.bitk = w),
                      (l.avail_in = b),
                      (l.total_in += p - l.next_in_index),
                      (l.next_in_index = p),
                      (c.write = g),
                      n);
                if (
                  ((d += u[R + 2]),
                  (d += _ & r[h]),
                  (R = 3 * (f + d)),
                  0 === (h = u[R]))
                ) {
                  (_ >>= u[R + 1]),
                    (w -= u[R + 1]),
                    (c.window[g++] = u[R + 2]),
                    y--;
                  break;
                }
              }
            else
              (_ >>= u[R + 1]),
                (w -= u[R + 1]),
                (c.window[g++] = u[R + 2]),
                y--;
          } while (y >= 258 && b >= 10);
          return (
            (k = l.avail_in - b),
            (k = w >> 3 < k ? w >> 3 : k),
            (b += k),
            (p -= k),
            (w -= k << 3),
            (c.bitb = _),
            (c.bitk = w),
            (l.avail_in = b),
            (l.total_in += p - l.next_in_index),
            (l.next_in_index = p),
            (c.write = g),
            0
          );
        }
        (e.init = function (e, t, n, r, c, l) {
          (i = 0),
            (_ = e),
            (w = t),
            (s = n),
            (p = r),
            (o = c),
            (b = l),
            (a = null);
        }),
          (e.proc = function (e, y, x) {
            let m,
              k,
              v,
              A,
              R,
              U,
              E,
              S = 0,
              z = 0,
              D = 0;
            for (
              D = y.next_in_index,
                A = y.avail_in,
                S = e.bitb,
                z = e.bitk,
                R = e.write,
                U = R < e.read ? e.read - R - 1 : e.end - R;
              ;

            )
              switch (i) {
                case 0:
                  if (
                    U >= 258 &&
                    A >= 10 &&
                    ((e.bitb = S),
                    (e.bitk = z),
                    (y.avail_in = A),
                    (y.total_in += D - y.next_in_index),
                    (y.next_in_index = D),
                    (e.write = R),
                    (x = g(_, w, s, p, o, b, e, y)),
                    (D = y.next_in_index),
                    (A = y.avail_in),
                    (S = e.bitb),
                    (z = e.bitk),
                    (R = e.write),
                    (U = R < e.read ? e.read - R - 1 : e.end - R),
                    0 != x)
                  ) {
                    i = 1 == x ? 7 : 9;
                    break;
                  }
                  (d = _), (a = s), (l = p), (i = 1);
                case 1:
                  for (m = d; z < m; ) {
                    if (0 === A)
                      return (
                        (e.bitb = S),
                        (e.bitk = z),
                        (y.avail_in = A),
                        (y.total_in += D - y.next_in_index),
                        (y.next_in_index = D),
                        (e.write = R),
                        e.inflate_flush(y, x)
                      );
                    (x = 0),
                      A--,
                      (S |= (255 & y.read_byte(D++)) << z),
                      (z += 8);
                  }
                  if (
                    ((k = 3 * (l + (S & r[m]))),
                    (S >>>= a[k + 1]),
                    (z -= a[k + 1]),
                    (v = a[k]),
                    0 === v)
                  ) {
                    (u = a[k + 2]), (i = 6);
                    break;
                  }
                  if (0 != (16 & v)) {
                    (f = 15 & v), (c = a[k + 2]), (i = 2);
                    break;
                  }
                  if (0 == (64 & v)) {
                    (d = v), (l = k / 3 + a[k + 2]);
                    break;
                  }
                  if (0 != (32 & v)) {
                    i = 7;
                    break;
                  }
                  return (
                    (i = 9),
                    (y.msg = 'invalid literal/length code'),
                    (x = n),
                    (e.bitb = S),
                    (e.bitk = z),
                    (y.avail_in = A),
                    (y.total_in += D - y.next_in_index),
                    (y.next_in_index = D),
                    (e.write = R),
                    e.inflate_flush(y, x)
                  );
                case 2:
                  for (m = f; z < m; ) {
                    if (0 === A)
                      return (
                        (e.bitb = S),
                        (e.bitk = z),
                        (y.avail_in = A),
                        (y.total_in += D - y.next_in_index),
                        (y.next_in_index = D),
                        (e.write = R),
                        e.inflate_flush(y, x)
                      );
                    (x = 0),
                      A--,
                      (S |= (255 & y.read_byte(D++)) << z),
                      (z += 8);
                  }
                  (c += S & r[m]),
                    (S >>= m),
                    (z -= m),
                    (d = w),
                    (a = o),
                    (l = b),
                    (i = 3);
                case 3:
                  for (m = d; z < m; ) {
                    if (0 === A)
                      return (
                        (e.bitb = S),
                        (e.bitk = z),
                        (y.avail_in = A),
                        (y.total_in += D - y.next_in_index),
                        (y.next_in_index = D),
                        (e.write = R),
                        e.inflate_flush(y, x)
                      );
                    (x = 0),
                      A--,
                      (S |= (255 & y.read_byte(D++)) << z),
                      (z += 8);
                  }
                  if (
                    ((k = 3 * (l + (S & r[m]))),
                    (S >>= a[k + 1]),
                    (z -= a[k + 1]),
                    (v = a[k]),
                    0 != (16 & v))
                  ) {
                    (f = 15 & v), (h = a[k + 2]), (i = 4);
                    break;
                  }
                  if (0 == (64 & v)) {
                    (d = v), (l = k / 3 + a[k + 2]);
                    break;
                  }
                  return (
                    (i = 9),
                    (y.msg = 'invalid distance code'),
                    (x = n),
                    (e.bitb = S),
                    (e.bitk = z),
                    (y.avail_in = A),
                    (y.total_in += D - y.next_in_index),
                    (y.next_in_index = D),
                    (e.write = R),
                    e.inflate_flush(y, x)
                  );
                case 4:
                  for (m = f; z < m; ) {
                    if (0 === A)
                      return (
                        (e.bitb = S),
                        (e.bitk = z),
                        (y.avail_in = A),
                        (y.total_in += D - y.next_in_index),
                        (y.next_in_index = D),
                        (e.write = R),
                        e.inflate_flush(y, x)
                      );
                    (x = 0),
                      A--,
                      (S |= (255 & y.read_byte(D++)) << z),
                      (z += 8);
                  }
                  (h += S & r[m]), (S >>= m), (z -= m), (i = 5);
                case 5:
                  for (E = R - h; E < 0; ) E += e.end;
                  for (; 0 !== c; ) {
                    if (
                      0 === U &&
                      (R == e.end &&
                        0 !== e.read &&
                        ((R = 0),
                        (U = R < e.read ? e.read - R - 1 : e.end - R)),
                      0 === U &&
                        ((e.write = R),
                        (x = e.inflate_flush(y, x)),
                        (R = e.write),
                        (U = R < e.read ? e.read - R - 1 : e.end - R),
                        R == e.end &&
                          0 !== e.read &&
                          ((R = 0),
                          (U = R < e.read ? e.read - R - 1 : e.end - R)),
                        0 === U))
                    )
                      return (
                        (e.bitb = S),
                        (e.bitk = z),
                        (y.avail_in = A),
                        (y.total_in += D - y.next_in_index),
                        (y.next_in_index = D),
                        (e.write = R),
                        e.inflate_flush(y, x)
                      );
                    (e.window[R++] = e.window[E++]),
                      U--,
                      E == e.end && (E = 0),
                      c--;
                  }
                  i = 0;
                  break;
                case 6:
                  if (
                    0 === U &&
                    (R == e.end &&
                      0 !== e.read &&
                      ((R = 0), (U = R < e.read ? e.read - R - 1 : e.end - R)),
                    0 === U &&
                      ((e.write = R),
                      (x = e.inflate_flush(y, x)),
                      (R = e.write),
                      (U = R < e.read ? e.read - R - 1 : e.end - R),
                      R == e.end &&
                        0 !== e.read &&
                        ((R = 0),
                        (U = R < e.read ? e.read - R - 1 : e.end - R)),
                      0 === U))
                  )
                    return (
                      (e.bitb = S),
                      (e.bitk = z),
                      (y.avail_in = A),
                      (y.total_in += D - y.next_in_index),
                      (y.next_in_index = D),
                      (e.write = R),
                      e.inflate_flush(y, x)
                    );
                  (x = 0), (e.window[R++] = u), U--, (i = 0);
                  break;
                case 7:
                  if (
                    (z > 7 && ((z -= 8), A++, D--),
                    (e.write = R),
                    (x = e.inflate_flush(y, x)),
                    (R = e.write),
                    (U = R < e.read ? e.read - R - 1 : e.end - R),
                    e.read != e.write)
                  )
                    return (
                      (e.bitb = S),
                      (e.bitk = z),
                      (y.avail_in = A),
                      (y.total_in += D - y.next_in_index),
                      (y.next_in_index = D),
                      (e.write = R),
                      e.inflate_flush(y, x)
                    );
                  i = 8;
                case 8:
                  return (
                    (x = 1),
                    (e.bitb = S),
                    (e.bitk = z),
                    (y.avail_in = A),
                    (y.total_in += D - y.next_in_index),
                    (y.next_in_index = D),
                    (e.write = R),
                    e.inflate_flush(y, x)
                  );
                case 9:
                  return (
                    (x = n),
                    (e.bitb = S),
                    (e.bitk = z),
                    (y.avail_in = A),
                    (y.total_in += D - y.next_in_index),
                    (y.next_in_index = D),
                    (e.write = R),
                    e.inflate_flush(y, x)
                  );
                default:
                  return (
                    (x = t),
                    (e.bitb = S),
                    (e.bitk = z),
                    (y.avail_in = A),
                    (y.total_in += D - y.next_in_index),
                    (y.next_in_index = D),
                    (e.write = R),
                    e.inflate_flush(y, x)
                  );
              }
          }),
          (e.free = function () {});
      }
      u.inflate_trees_fixed = function (e, t, n, i) {
        return (e[0] = 9), (t[0] = 5), (n[0] = a), (i[0] = s), 0;
      };
      const h = [
        16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
      ];
      function _(e, a) {
        const s = this;
        let o,
          c = 0,
          l = 0,
          d = 0,
          _ = 0;
        const w = [0],
          p = [0],
          b = new f();
        let g = 0,
          y = new Int32Array(4320);
        const x = new u();
        (s.bitk = 0),
          (s.bitb = 0),
          (s.window = new Uint8Array(a)),
          (s.end = a),
          (s.read = 0),
          (s.write = 0),
          (s.reset = function (e, t) {
            t && (t[0] = 0),
              6 == c && b.free(e),
              (c = 0),
              (s.bitk = 0),
              (s.bitb = 0),
              (s.read = s.write = 0);
          }),
          s.reset(e, null),
          (s.inflate_flush = function (e, t) {
            let n, r, a;
            return (
              (r = e.next_out_index),
              (a = s.read),
              (n = (a <= s.write ? s.write : s.end) - a),
              n > e.avail_out && (n = e.avail_out),
              0 !== n && t == i && (t = 0),
              (e.avail_out -= n),
              (e.total_out += n),
              e.next_out.set(s.window.subarray(a, a + n), r),
              (r += n),
              (a += n),
              a == s.end &&
                ((a = 0),
                s.write == s.end && (s.write = 0),
                (n = s.write - a),
                n > e.avail_out && (n = e.avail_out),
                0 !== n && t == i && (t = 0),
                (e.avail_out -= n),
                (e.total_out += n),
                e.next_out.set(s.window.subarray(a, a + n), r),
                (r += n),
                (a += n)),
              (e.next_out_index = r),
              (s.read = a),
              t
            );
          }),
          (s.proc = function (e, i) {
            let a, f, m, k, v, A, R, U;
            for (
              k = e.next_in_index,
                v = e.avail_in,
                f = s.bitb,
                m = s.bitk,
                A = s.write,
                R = A < s.read ? s.read - A - 1 : s.end - A;
              ;

            ) {
              let E, S, z, D, T, F, C, O;
              switch (c) {
                case 0:
                  for (; m < 3; ) {
                    if (0 === v)
                      return (
                        (s.bitb = f),
                        (s.bitk = m),
                        (e.avail_in = v),
                        (e.total_in += k - e.next_in_index),
                        (e.next_in_index = k),
                        (s.write = A),
                        s.inflate_flush(e, i)
                      );
                    (i = 0),
                      v--,
                      (f |= (255 & e.read_byte(k++)) << m),
                      (m += 8);
                  }
                  switch (((a = 7 & f), (g = 1 & a), a >>> 1)) {
                    case 0:
                      (f >>>= 3),
                        (m -= 3),
                        (a = 7 & m),
                        (f >>>= a),
                        (m -= a),
                        (c = 1);
                      break;
                    case 1:
                      (E = []),
                        (S = []),
                        (z = [[]]),
                        (D = [[]]),
                        u.inflate_trees_fixed(E, S, z, D),
                        b.init(E[0], S[0], z[0], 0, D[0], 0),
                        (f >>>= 3),
                        (m -= 3),
                        (c = 6);
                      break;
                    case 2:
                      (f >>>= 3), (m -= 3), (c = 3);
                      break;
                    case 3:
                      return (
                        (f >>>= 3),
                        (m -= 3),
                        (c = 9),
                        (e.msg = 'invalid block type'),
                        (i = n),
                        (s.bitb = f),
                        (s.bitk = m),
                        (e.avail_in = v),
                        (e.total_in += k - e.next_in_index),
                        (e.next_in_index = k),
                        (s.write = A),
                        s.inflate_flush(e, i)
                      );
                  }
                  break;
                case 1:
                  for (; m < 32; ) {
                    if (0 === v)
                      return (
                        (s.bitb = f),
                        (s.bitk = m),
                        (e.avail_in = v),
                        (e.total_in += k - e.next_in_index),
                        (e.next_in_index = k),
                        (s.write = A),
                        s.inflate_flush(e, i)
                      );
                    (i = 0),
                      v--,
                      (f |= (255 & e.read_byte(k++)) << m),
                      (m += 8);
                  }
                  if (((~f >>> 16) & 65535) != (65535 & f))
                    return (
                      (c = 9),
                      (e.msg = 'invalid stored block lengths'),
                      (i = n),
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  (l = 65535 & f),
                    (f = m = 0),
                    (c = 0 !== l ? 2 : 0 !== g ? 7 : 0);
                  break;
                case 2:
                  if (0 === v)
                    return (
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  if (
                    0 === R &&
                    (A == s.end &&
                      0 !== s.read &&
                      ((A = 0), (R = A < s.read ? s.read - A - 1 : s.end - A)),
                    0 === R &&
                      ((s.write = A),
                      (i = s.inflate_flush(e, i)),
                      (A = s.write),
                      (R = A < s.read ? s.read - A - 1 : s.end - A),
                      A == s.end &&
                        0 !== s.read &&
                        ((A = 0),
                        (R = A < s.read ? s.read - A - 1 : s.end - A)),
                      0 === R))
                  )
                    return (
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  if (
                    ((i = 0),
                    (a = l),
                    a > v && (a = v),
                    a > R && (a = R),
                    s.window.set(e.read_buf(k, a), A),
                    (k += a),
                    (v -= a),
                    (A += a),
                    (R -= a),
                    0 != (l -= a))
                  )
                    break;
                  c = 0 !== g ? 7 : 0;
                  break;
                case 3:
                  for (; m < 14; ) {
                    if (0 === v)
                      return (
                        (s.bitb = f),
                        (s.bitk = m),
                        (e.avail_in = v),
                        (e.total_in += k - e.next_in_index),
                        (e.next_in_index = k),
                        (s.write = A),
                        s.inflate_flush(e, i)
                      );
                    (i = 0),
                      v--,
                      (f |= (255 & e.read_byte(k++)) << m),
                      (m += 8);
                  }
                  if (
                    ((d = a = 16383 & f), (31 & a) > 29 || ((a >> 5) & 31) > 29)
                  )
                    return (
                      (c = 9),
                      (e.msg = 'too many length or distance symbols'),
                      (i = n),
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  if (
                    ((a = 258 + (31 & a) + ((a >> 5) & 31)), !o || o.length < a)
                  )
                    o = [];
                  else for (U = 0; U < a; U++) o[U] = 0;
                  (f >>>= 14), (m -= 14), (_ = 0), (c = 4);
                case 4:
                  for (; _ < 4 + (d >>> 10); ) {
                    for (; m < 3; ) {
                      if (0 === v)
                        return (
                          (s.bitb = f),
                          (s.bitk = m),
                          (e.avail_in = v),
                          (e.total_in += k - e.next_in_index),
                          (e.next_in_index = k),
                          (s.write = A),
                          s.inflate_flush(e, i)
                        );
                      (i = 0),
                        v--,
                        (f |= (255 & e.read_byte(k++)) << m),
                        (m += 8);
                    }
                    (o[h[_++]] = 7 & f), (f >>>= 3), (m -= 3);
                  }
                  for (; _ < 19; ) o[h[_++]] = 0;
                  if (
                    ((w[0] = 7),
                    (a = x.inflate_trees_bits(o, w, p, y, e)),
                    0 != a)
                  )
                    return (
                      (i = a) == n && ((o = null), (c = 9)),
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  (_ = 0), (c = 5);
                case 5:
                  for (; (a = d), !(_ >= 258 + (31 & a) + ((a >> 5) & 31)); ) {
                    let t, l;
                    for (a = w[0]; m < a; ) {
                      if (0 === v)
                        return (
                          (s.bitb = f),
                          (s.bitk = m),
                          (e.avail_in = v),
                          (e.total_in += k - e.next_in_index),
                          (e.next_in_index = k),
                          (s.write = A),
                          s.inflate_flush(e, i)
                        );
                      (i = 0),
                        v--,
                        (f |= (255 & e.read_byte(k++)) << m),
                        (m += 8);
                    }
                    if (
                      ((a = y[3 * (p[0] + (f & r[a])) + 1]),
                      (l = y[3 * (p[0] + (f & r[a])) + 2]),
                      l < 16)
                    )
                      (f >>>= a), (m -= a), (o[_++] = l);
                    else {
                      for (
                        U = 18 == l ? 7 : l - 14, t = 18 == l ? 11 : 3;
                        m < a + U;

                      ) {
                        if (0 === v)
                          return (
                            (s.bitb = f),
                            (s.bitk = m),
                            (e.avail_in = v),
                            (e.total_in += k - e.next_in_index),
                            (e.next_in_index = k),
                            (s.write = A),
                            s.inflate_flush(e, i)
                          );
                        (i = 0),
                          v--,
                          (f |= (255 & e.read_byte(k++)) << m),
                          (m += 8);
                      }
                      if (
                        ((f >>>= a),
                        (m -= a),
                        (t += f & r[U]),
                        (f >>>= U),
                        (m -= U),
                        (U = _),
                        (a = d),
                        U + t > 258 + (31 & a) + ((a >> 5) & 31) ||
                          (16 == l && U < 1))
                      )
                        return (
                          (o = null),
                          (c = 9),
                          (e.msg = 'invalid bit length repeat'),
                          (i = n),
                          (s.bitb = f),
                          (s.bitk = m),
                          (e.avail_in = v),
                          (e.total_in += k - e.next_in_index),
                          (e.next_in_index = k),
                          (s.write = A),
                          s.inflate_flush(e, i)
                        );
                      l = 16 == l ? o[U - 1] : 0;
                      do {
                        o[U++] = l;
                      } while (0 != --t);
                      _ = U;
                    }
                  }
                  if (
                    ((p[0] = -1),
                    (T = []),
                    (F = []),
                    (C = []),
                    (O = []),
                    (T[0] = 9),
                    (F[0] = 6),
                    (a = d),
                    (a = x.inflate_trees_dynamic(
                      257 + (31 & a),
                      1 + ((a >> 5) & 31),
                      o,
                      T,
                      F,
                      C,
                      O,
                      y,
                      e,
                    )),
                    0 != a)
                  )
                    return (
                      a == n && ((o = null), (c = 9)),
                      (i = a),
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  b.init(T[0], F[0], y, C[0], y, O[0]), (c = 6);
                case 6:
                  if (
                    ((s.bitb = f),
                    (s.bitk = m),
                    (e.avail_in = v),
                    (e.total_in += k - e.next_in_index),
                    (e.next_in_index = k),
                    (s.write = A),
                    1 != (i = b.proc(s, e, i)))
                  )
                    return s.inflate_flush(e, i);
                  if (
                    ((i = 0),
                    b.free(e),
                    (k = e.next_in_index),
                    (v = e.avail_in),
                    (f = s.bitb),
                    (m = s.bitk),
                    (A = s.write),
                    (R = A < s.read ? s.read - A - 1 : s.end - A),
                    0 === g)
                  ) {
                    c = 0;
                    break;
                  }
                  c = 7;
                case 7:
                  if (
                    ((s.write = A),
                    (i = s.inflate_flush(e, i)),
                    (A = s.write),
                    (R = A < s.read ? s.read - A - 1 : s.end - A),
                    s.read != s.write)
                  )
                    return (
                      (s.bitb = f),
                      (s.bitk = m),
                      (e.avail_in = v),
                      (e.total_in += k - e.next_in_index),
                      (e.next_in_index = k),
                      (s.write = A),
                      s.inflate_flush(e, i)
                    );
                  c = 8;
                case 8:
                  return (
                    (i = 1),
                    (s.bitb = f),
                    (s.bitk = m),
                    (e.avail_in = v),
                    (e.total_in += k - e.next_in_index),
                    (e.next_in_index = k),
                    (s.write = A),
                    s.inflate_flush(e, i)
                  );
                case 9:
                  return (
                    (i = n),
                    (s.bitb = f),
                    (s.bitk = m),
                    (e.avail_in = v),
                    (e.total_in += k - e.next_in_index),
                    (e.next_in_index = k),
                    (s.write = A),
                    s.inflate_flush(e, i)
                  );
                default:
                  return (
                    (i = t),
                    (s.bitb = f),
                    (s.bitk = m),
                    (e.avail_in = v),
                    (e.total_in += k - e.next_in_index),
                    (e.next_in_index = k),
                    (s.write = A),
                    s.inflate_flush(e, i)
                  );
              }
            }
          }),
          (s.free = function (e) {
            s.reset(e, null), (s.window = null), (y = null);
          }),
          (s.set_dictionary = function (e, t, n) {
            s.window.set(e.subarray(t, t + n), 0), (s.read = s.write = n);
          }),
          (s.sync_point = function () {
            return 1 == c ? 1 : 0;
          });
      }
      const w = 13,
        p = [0, 0, 255, 255];
      function b() {
        const e = this;
        function r(e) {
          return e && e.istate
            ? ((e.total_in = e.total_out = 0),
              (e.msg = null),
              (e.istate.mode = 7),
              e.istate.blocks.reset(e, null),
              0)
            : t;
        }
        (e.mode = 0),
          (e.method = 0),
          (e.was = [0]),
          (e.need = 0),
          (e.marker = 0),
          (e.wbits = 0),
          (e.inflateEnd = function (t) {
            return e.blocks && e.blocks.free(t), (e.blocks = null), 0;
          }),
          (e.inflateInit = function (n, i) {
            return (
              (n.msg = null),
              (e.blocks = null),
              i < 8 || i > 15
                ? (e.inflateEnd(n), t)
                : ((e.wbits = i), (n.istate.blocks = new _(n, 1 << i)), r(n), 0)
            );
          }),
          (e.inflate = function (e, r) {
            let a, s;
            if (!e || !e.istate || !e.next_in) return t;
            const o = e.istate;
            for (r = 4 == r ? i : 0, a = i; ; )
              switch (o.mode) {
                case 0:
                  if (0 === e.avail_in) return a;
                  if (
                    ((a = r),
                    e.avail_in--,
                    e.total_in++,
                    8 != (15 & (o.method = e.read_byte(e.next_in_index++))))
                  ) {
                    (o.mode = w),
                      (e.msg = 'unknown compression method'),
                      (o.marker = 5);
                    break;
                  }
                  if (8 + (o.method >> 4) > o.wbits) {
                    (o.mode = w),
                      (e.msg = 'invalid window size'),
                      (o.marker = 5);
                    break;
                  }
                  o.mode = 1;
                case 1:
                  if (0 === e.avail_in) return a;
                  if (
                    ((a = r),
                    e.avail_in--,
                    e.total_in++,
                    (s = 255 & e.read_byte(e.next_in_index++)),
                    ((o.method << 8) + s) % 31 != 0)
                  ) {
                    (o.mode = w),
                      (e.msg = 'incorrect header check'),
                      (o.marker = 5);
                    break;
                  }
                  if (0 == (32 & s)) {
                    o.mode = 7;
                    break;
                  }
                  o.mode = 2;
                case 2:
                  if (0 === e.avail_in) return a;
                  (a = r),
                    e.avail_in--,
                    e.total_in++,
                    (o.need =
                      ((255 & e.read_byte(e.next_in_index++)) << 24) &
                      4278190080),
                    (o.mode = 3);
                case 3:
                  if (0 === e.avail_in) return a;
                  (a = r),
                    e.avail_in--,
                    e.total_in++,
                    (o.need +=
                      ((255 & e.read_byte(e.next_in_index++)) << 16) &
                      16711680),
                    (o.mode = 4);
                case 4:
                  if (0 === e.avail_in) return a;
                  (a = r),
                    e.avail_in--,
                    e.total_in++,
                    (o.need +=
                      ((255 & e.read_byte(e.next_in_index++)) << 8) & 65280),
                    (o.mode = 5);
                case 5:
                  return 0 === e.avail_in
                    ? a
                    : ((a = r),
                      e.avail_in--,
                      e.total_in++,
                      (o.need += 255 & e.read_byte(e.next_in_index++)),
                      (o.mode = 6),
                      2);
                case 6:
                  return (
                    (o.mode = w), (e.msg = 'need dictionary'), (o.marker = 0), t
                  );
                case 7:
                  if (((a = o.blocks.proc(e, a)), a == n)) {
                    (o.mode = w), (o.marker = 0);
                    break;
                  }
                  if ((0 == a && (a = r), 1 != a)) return a;
                  (a = r), o.blocks.reset(e, o.was), (o.mode = 12);
                case 12:
                  return 1;
                case w:
                  return n;
                default:
                  return t;
              }
          }),
          (e.inflateSetDictionary = function (e, n, i) {
            let r = 0,
              a = i;
            if (!e || !e.istate || 6 != e.istate.mode) return t;
            const s = e.istate;
            return (
              a >= 1 << s.wbits && ((a = (1 << s.wbits) - 1), (r = i - a)),
              s.blocks.set_dictionary(n, r, a),
              (s.mode = 7),
              0
            );
          }),
          (e.inflateSync = function (e) {
            let a, s, o, c, l;
            if (!e || !e.istate) return t;
            const d = e.istate;
            if (
              (d.mode != w && ((d.mode = w), (d.marker = 0)),
              0 === (a = e.avail_in))
            )
              return i;
            for (s = e.next_in_index, o = d.marker; 0 !== a && o < 4; )
              e.read_byte(s) == p[o]
                ? o++
                : (o = 0 !== e.read_byte(s) ? 0 : 4 - o),
                s++,
                a--;
            return (
              (e.total_in += s - e.next_in_index),
              (e.next_in_index = s),
              (e.avail_in = a),
              (d.marker = o),
              4 != o
                ? n
                : ((c = e.total_in),
                  (l = e.total_out),
                  r(e),
                  (e.total_in = c),
                  (e.total_out = l),
                  (d.mode = 7),
                  0)
            );
          }),
          (e.inflateSyncPoint = function (e) {
            return e && e.istate && e.istate.blocks
              ? e.istate.blocks.sync_point()
              : t;
          });
      }
      function g() {}
      g.prototype = {
        inflateInit: function (e) {
          const t = this;
          return (
            (t.istate = new b()), e || (e = 15), t.istate.inflateInit(t, e)
          );
        },
        inflate: function (e) {
          const n = this;
          return n.istate ? n.istate.inflate(n, e) : t;
        },
        inflateEnd: function () {
          const e = this;
          if (!e.istate) return t;
          const n = e.istate.inflateEnd(e);
          return (e.istate = null), n;
        },
        inflateSync: function () {
          const e = this;
          return e.istate ? e.istate.inflateSync(e) : t;
        },
        inflateSetDictionary: function (e, n) {
          const i = this;
          return i.istate ? i.istate.inflateSetDictionary(i, e, n) : t;
        },
        read_byte: function (e) {
          return this.next_in[e];
        },
        read_buf: function (e, t) {
          return this.next_in.subarray(e, e + t);
        },
      };
      const y = {
          chunkSize: 524288,
          maxWorkers:
            ('undefined' != typeof navigator &&
              navigator.hardwareConcurrency) ||
            2,
          terminateWorkerTimeout: 5e3,
          useWebWorkers: !0,
          workerScripts: void 0,
        },
        x = Object.assign({}, y);
      function m(e) {
        if (
          (void 0 !== e.chunkSize && (x.chunkSize = e.chunkSize),
          void 0 !== e.maxWorkers && (x.maxWorkers = e.maxWorkers),
          void 0 !== e.terminateWorkerTimeout &&
            (x.terminateWorkerTimeout = e.terminateWorkerTimeout),
          void 0 !== e.useWebWorkers && (x.useWebWorkers = e.useWebWorkers),
          void 0 !== e.Deflate && (x.Deflate = e.Deflate),
          void 0 !== e.Inflate && (x.Inflate = e.Inflate),
          void 0 !== e.workerScripts)
        ) {
          if (e.workerScripts.deflate) {
            if (!Array.isArray(e.workerScripts.deflate))
              throw new Error('workerScripts.deflate must be an array');
            x.workerScripts || (x.workerScripts = {}),
              (x.workerScripts.deflate = e.workerScripts.deflate);
          }
          if (e.workerScripts.inflate) {
            if (!Array.isArray(e.workerScripts.inflate))
              throw new Error('workerScripts.inflate must be an array');
            x.workerScripts || (x.workerScripts = {}),
              (x.workerScripts.inflate = e.workerScripts.inflate);
          }
        }
      }
      const k = 'Abort error';
      function v(e, t) {
        if (e && e.aborted) throw (t.flush(), new Error(k));
      }
      async function A(e, t) {
        return t.length && (await e.writeUint8Array(t)), t.length;
      }
      const R = 'HTTP error ',
        U = 'HTTP Range not supported',
        E = 'text/plain',
        S = 'Content-Length',
        z = 'Accept-Ranges',
        D = 'Range',
        T = 'HEAD',
        F = 'GET',
        C = 'bytes';
      class O {
        constructor() {
          this.size = 0;
        }
        init() {
          this.initialized = !0;
        }
      }
      class I extends O {}
      class W extends O {
        writeUint8Array(e) {
          this.size += e.length;
        }
      }
      class M extends I {
        constructor(e) {
          super(), (this.blob = e), (this.size = e.size);
        }
        async readUint8Array(e, t) {
          const n = new FileReader();
          return new Promise((i, r) => {
            (n.onload = (e) => i(new Uint8Array(e.target.result))),
              (n.onerror = () => r(n.error)),
              n.readAsArrayBuffer(this.blob.slice(e, e + t));
          });
        }
      }
      class H extends I {
        constructor(e, t) {
          super(),
            (this.url = e),
            (this.preventHeadRequest = t.preventHeadRequest),
            (this.useRangeHeader = t.useRangeHeader),
            (this.forceRangeRequests = t.forceRangeRequests),
            (this.options = Object.assign({}, t)),
            delete this.options.preventHeadRequest,
            delete this.options.useRangeHeader,
            delete this.options.forceRangeRequests,
            delete this.options.useXHR;
        }
        async init() {
          if ((super.init(), V(this.url) && !this.preventHeadRequest)) {
            const e = await L(T, this.url, this.options);
            if (
              ((this.size = Number(e.headers.get(S))),
              !this.forceRangeRequests &&
                this.useRangeHeader &&
                e.headers.get(z) != C)
            )
              throw new Error(U);
            void 0 === this.size && (await B(this, this.options));
          } else await B(this, this.options);
        }
        async readUint8Array(e, t) {
          if (this.useRangeHeader) {
            const n = await L(
              F,
              this.url,
              this.options,
              Object.assign({}, this.options.headers, {
                [D]: 'bytes=' + e + '-' + (e + t - 1),
              }),
            );
            if (206 != n.status) throw new Error(U);
            return new Uint8Array(await n.arrayBuffer());
          }
          return (
            this.data || (await B(this, this.options)),
            new Uint8Array(this.data.subarray(e, e + t))
          );
        }
      }
      async function B(e, t) {
        const n = await L(F, e.url, t);
        (e.data = new Uint8Array(await n.arrayBuffer())),
          e.size || (e.size = e.data.length);
      }
      async function L(e, t, n, i) {
        i = Object.assign({}, n.headers, i);
        const r = await fetch(t, Object.assign({}, n, {method: e, headers: i}));
        if (r.status < 400) return r;
        throw new Error(R + (r.statusText || r.status));
      }
      class N extends I {
        constructor(e, t) {
          super(),
            (this.url = e),
            (this.preventHeadRequest = t.preventHeadRequest),
            (this.useRangeHeader = t.useRangeHeader),
            (this.forceRangeRequests = t.forceRangeRequests);
        }
        async init() {
          if ((super.init(), V(this.url) && !this.preventHeadRequest))
            return new Promise((e, t) =>
              j(
                T,
                this.url,
                (n) => {
                  (this.size = Number(n.getResponseHeader(S))),
                    this.useRangeHeader
                      ? this.forceRangeRequests || n.getResponseHeader(z) == C
                        ? e()
                        : t(new Error(U))
                      : void 0 === this.size
                      ? P(this, this.url)
                          .then(() => e())
                          .catch(t)
                      : e();
                },
                t,
              ),
            );
          await P(this, this.url);
        }
        async readUint8Array(e, t) {
          if (this.useRangeHeader) {
            const n = await new Promise((n, i) =>
              j(F, this.url, (e) => n(e), i, [
                [D, 'bytes=' + e + '-' + (e + t - 1)],
              ]),
            );
            if (206 != n.status) throw new Error(U);
            return new Uint8Array(n.response);
          }
          return (
            this.data || (await P(this, this.url)),
            new Uint8Array(this.data.subarray(e, e + t))
          );
        }
      }
      function P(e, t) {
        return new Promise((n, i) =>
          j(
            F,
            t,
            (t) => {
              (e.data = new Uint8Array(t.response)),
                e.size || (e.size = e.data.length),
                n();
            },
            i,
          ),
        );
      }
      function j(e, t, n, i, r = []) {
        const a = new XMLHttpRequest();
        return (
          a.addEventListener(
            'load',
            () => {
              a.status < 400 ? n(a) : i(R + (a.statusText || a.status));
            },
            !1,
          ),
          a.addEventListener('error', i, !1),
          a.open(e, t),
          r.forEach((e) => a.setRequestHeader(e[0], e[1])),
          (a.responseType = 'arraybuffer'),
          a.send(),
          a
        );
      }
      class q extends I {
        constructor(e, t = {}) {
          super(),
            (this.url = e),
            t.useXHR
              ? (this.reader = new N(e, t))
              : (this.reader = new H(e, t));
        }
        set size(e) {}
        get size() {
          return this.reader.size;
        }
        async init() {
          super.init(), await this.reader.init();
        }
        async readUint8Array(e, t) {
          return this.reader.readUint8Array(e, t);
        }
      }
      function V(e) {
        if ('undefined' != typeof document) {
          const t = document.createElement('a');
          return (t.href = e), 'http:' == t.protocol || 'https:' == t.protocol;
        }
        return /^https?:\/\//i.test(e);
      }
      const Z = 4294967295,
        G = 33639248,
        K = 101075792,
        X =
          '\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '.split(
            '',
          ),
        Y = [];
      for (let e = 0; e < 256; e++) {
        let t = e;
        for (let e = 0; e < 8; e++)
          1 & t ? (t = (t >>> 1) ^ 3988292384) : (t >>>= 1);
        Y[e] = t;
      }
      class J {
        constructor(e) {
          this.crc = e || -1;
        }
        append(e) {
          let t = 0 | this.crc;
          for (let n = 0, i = 0 | e.length; n < i; n++)
            t = (t >>> 8) ^ Y[255 & (t ^ e[n])];
          this.crc = t;
        }
        get() {
          return ~this.crc;
        }
      }
      const Q = {
          concat(e, t) {
            if (0 === e.length || 0 === t.length) return e.concat(t);
            const n = e[e.length - 1],
              i = Q.getPartial(n);
            return 32 === i
              ? e.concat(t)
              : Q._shiftRight(t, i, 0 | n, e.slice(0, e.length - 1));
          },
          bitLength(e) {
            const t = e.length;
            if (0 === t) return 0;
            const n = e[t - 1];
            return 32 * (t - 1) + Q.getPartial(n);
          },
          clamp(e, t) {
            if (32 * e.length < t) return e;
            const n = (e = e.slice(0, Math.ceil(t / 32))).length;
            return (
              (t &= 31),
              n > 0 &&
                t &&
                (e[n - 1] = Q.partial(
                  t,
                  e[n - 1] & (2147483648 >> (t - 1)),
                  1,
                )),
              e
            );
          },
          partial: (e, t, n) =>
            32 === e ? t : (n ? 0 | t : t << (32 - e)) + 1099511627776 * e,
          getPartial: (e) => Math.round(e / 1099511627776) || 32,
          _shiftRight(e, t, n, i) {
            for (void 0 === i && (i = []); t >= 32; t -= 32) i.push(n), (n = 0);
            if (0 === t) return i.concat(e);
            for (let r = 0; r < e.length; r++)
              i.push(n | (e[r] >>> t)), (n = e[r] << (32 - t));
            const r = e.length ? e[e.length - 1] : 0,
              a = Q.getPartial(r);
            return (
              i.push(Q.partial((t + a) & 31, t + a > 32 ? n : i.pop(), 1)), i
            );
          },
        },
        $ = {
          bytes: {
            fromBits(e) {
              const t = Q.bitLength(e) / 8,
                n = new Uint8Array(t);
              let i;
              for (let r = 0; r < t; r++)
                0 == (3 & r) && (i = e[r / 4]), (n[r] = i >>> 24), (i <<= 8);
              return n;
            },
            toBits(e) {
              const t = [];
              let n,
                i = 0;
              for (n = 0; n < e.length; n++)
                (i = (i << 8) | e[n]), 3 == (3 & n) && (t.push(i), (i = 0));
              return 3 & n && t.push(Q.partial(8 * (3 & n), i)), t;
            },
          },
        },
        ee = {
          sha1: function (e) {
            e
              ? ((this._h = e._h.slice(0)),
                (this._buffer = e._buffer.slice(0)),
                (this._length = e._length))
              : this.reset();
          },
        };
      ee.sha1.prototype = {
        blockSize: 512,
        reset: function () {
          const e = this;
          return (
            (e._h = this._init.slice(0)), (e._buffer = []), (e._length = 0), e
          );
        },
        update: function (e) {
          const t = this;
          'string' == typeof e && (e = $.utf8String.toBits(e));
          const n = (t._buffer = Q.concat(t._buffer, e)),
            i = t._length,
            r = (t._length = i + Q.bitLength(e));
          if (r > 9007199254740991)
            throw new Error('Cannot hash more than 2^53 - 1 bits');
          const a = new Uint32Array(n);
          let s = 0;
          for (
            let e = t.blockSize + i - ((t.blockSize + i) & (t.blockSize - 1));
            e <= r;
            e += t.blockSize
          )
            t._block(a.subarray(16 * s, 16 * (s + 1))), (s += 1);
          return n.splice(0, 16 * s), t;
        },
        finalize: function () {
          const e = this;
          let t = e._buffer;
          const n = e._h;
          t = Q.concat(t, [Q.partial(1, 1)]);
          for (let e = t.length + 2; 15 & e; e++) t.push(0);
          for (
            t.push(Math.floor(e._length / 4294967296)), t.push(0 | e._length);
            t.length;

          )
            e._block(t.splice(0, 16));
          return e.reset(), n;
        },
        _init: [1732584193, 4023233417, 2562383102, 271733878, 3285377520],
        _key: [1518500249, 1859775393, 2400959708, 3395469782],
        _f: function (e, t, n, i) {
          return e <= 19
            ? (t & n) | (~t & i)
            : e <= 39
            ? t ^ n ^ i
            : e <= 59
            ? (t & n) | (t & i) | (n & i)
            : e <= 79
            ? t ^ n ^ i
            : void 0;
        },
        _S: function (e, t) {
          return (t << e) | (t >>> (32 - e));
        },
        _block: function (e) {
          const t = this,
            n = t._h,
            i = Array(80);
          for (let t = 0; t < 16; t++) i[t] = e[t];
          let r = n[0],
            a = n[1],
            s = n[2],
            o = n[3],
            c = n[4];
          for (let e = 0; e <= 79; e++) {
            e >= 16 &&
              (i[e] = t._S(1, i[e - 3] ^ i[e - 8] ^ i[e - 14] ^ i[e - 16]));
            const n =
              (t._S(5, r) +
                t._f(e, a, s, o) +
                c +
                i[e] +
                t._key[Math.floor(e / 20)]) |
              0;
            (c = o), (o = s), (s = t._S(30, a)), (a = r), (r = n);
          }
          (n[0] = (n[0] + r) | 0),
            (n[1] = (n[1] + a) | 0),
            (n[2] = (n[2] + s) | 0),
            (n[3] = (n[3] + o) | 0),
            (n[4] = (n[4] + c) | 0);
        },
      };
      const te = 'Invalid pasword',
        ne = 16,
        ie = {name: 'PBKDF2'},
        re = Object.assign({hash: {name: 'HMAC'}}, ie),
        ae = Object.assign({iterations: 1e3, hash: {name: 'SHA-1'}}, ie),
        se = ['deriveBits'],
        oe = [8, 12, 16],
        ce = [16, 24, 32],
        le = 10,
        de = [0, 0, 0, 0],
        ue = $.bytes,
        fe = class {
          constructor(e) {
            const t = this;
            (t._tables = [
              [[], [], [], [], []],
              [[], [], [], [], []],
            ]),
              t._tables[0][0][0] || t._precompute();
            const n = t._tables[0][4],
              i = t._tables[1],
              r = e.length;
            let a,
              s,
              o,
              c = 1;
            if (4 !== r && 6 !== r && 8 !== r)
              throw new Error('invalid aes key size');
            for (
              t._key = [(s = e.slice(0)), (o = [])], a = r;
              a < 4 * r + 28;
              a++
            ) {
              let e = s[a - 1];
              (a % r == 0 || (8 === r && a % r == 4)) &&
                ((e =
                  (n[e >>> 24] << 24) ^
                  (n[(e >> 16) & 255] << 16) ^
                  (n[(e >> 8) & 255] << 8) ^
                  n[255 & e]),
                a % r == 0 &&
                  ((e = (e << 8) ^ (e >>> 24) ^ (c << 24)),
                  (c = (c << 1) ^ (283 * (c >> 7))))),
                (s[a] = s[a - r] ^ e);
            }
            for (let e = 0; a; e++, a--) {
              const t = s[3 & e ? a : a - 4];
              o[e] =
                a <= 4 || e < 4
                  ? t
                  : i[0][n[t >>> 24]] ^
                    i[1][n[(t >> 16) & 255]] ^
                    i[2][n[(t >> 8) & 255]] ^
                    i[3][n[255 & t]];
            }
          }
          encrypt(e) {
            return this._crypt(e, 0);
          }
          decrypt(e) {
            return this._crypt(e, 1);
          }
          _precompute() {
            const e = this._tables[0],
              t = this._tables[1],
              n = e[4],
              i = t[4],
              r = [],
              a = [];
            let s, o, c, l;
            for (let e = 0; e < 256; e++)
              a[(r[e] = (e << 1) ^ (283 * (e >> 7))) ^ e] = e;
            for (let d = (s = 0); !n[d]; d ^= o || 1, s = a[s] || 1) {
              let a = s ^ (s << 1) ^ (s << 2) ^ (s << 3) ^ (s << 4);
              (a = (a >> 8) ^ (255 & a) ^ 99),
                (n[d] = a),
                (i[a] = d),
                (l = r[(c = r[(o = r[d])])]);
              let u = (16843009 * l) ^ (65537 * c) ^ (257 * o) ^ (16843008 * d),
                f = (257 * r[a]) ^ (16843008 * a);
              for (let n = 0; n < 4; n++)
                (e[n][d] = f = (f << 24) ^ (f >>> 8)),
                  (t[n][a] = u = (u << 24) ^ (u >>> 8));
            }
            for (let n = 0; n < 5; n++)
              (e[n] = e[n].slice(0)), (t[n] = t[n].slice(0));
          }
          _crypt(e, t) {
            if (4 !== e.length) throw new Error('invalid aes block size');
            const n = this._key[t],
              i = n.length / 4 - 2,
              r = [0, 0, 0, 0],
              a = this._tables[t],
              s = a[0],
              o = a[1],
              c = a[2],
              l = a[3],
              d = a[4];
            let u,
              f,
              h,
              _ = e[0] ^ n[0],
              w = e[t ? 3 : 1] ^ n[1],
              p = e[2] ^ n[2],
              b = e[t ? 1 : 3] ^ n[3],
              g = 4;
            for (let e = 0; e < i; e++)
              (u =
                s[_ >>> 24] ^
                o[(w >> 16) & 255] ^
                c[(p >> 8) & 255] ^
                l[255 & b] ^
                n[g]),
                (f =
                  s[w >>> 24] ^
                  o[(p >> 16) & 255] ^
                  c[(b >> 8) & 255] ^
                  l[255 & _] ^
                  n[g + 1]),
                (h =
                  s[p >>> 24] ^
                  o[(b >> 16) & 255] ^
                  c[(_ >> 8) & 255] ^
                  l[255 & w] ^
                  n[g + 2]),
                (b =
                  s[b >>> 24] ^
                  o[(_ >> 16) & 255] ^
                  c[(w >> 8) & 255] ^
                  l[255 & p] ^
                  n[g + 3]),
                (g += 4),
                (_ = u),
                (w = f),
                (p = h);
            for (let e = 0; e < 4; e++)
              (r[t ? 3 & -e : e] =
                (d[_ >>> 24] << 24) ^
                (d[(w >> 16) & 255] << 16) ^
                (d[(p >> 8) & 255] << 8) ^
                d[255 & b] ^
                n[g++]),
                (u = _),
                (_ = w),
                (w = p),
                (p = b),
                (b = u);
            return r;
          }
        },
        he = class {
          constructor(e, t) {
            (this._prf = e), (this._initIv = t), (this._iv = t);
          }
          reset() {
            this._iv = this._initIv;
          }
          update(e) {
            return this.calculate(this._prf, e, this._iv);
          }
          incWord(e) {
            if (255 == ((e >> 24) & 255)) {
              let t = (e >> 16) & 255,
                n = (e >> 8) & 255,
                i = 255 & e;
              255 === t
                ? ((t = 0),
                  255 === n ? ((n = 0), 255 === i ? (i = 0) : ++i) : ++n)
                : ++t,
                (e = 0),
                (e += t << 16),
                (e += n << 8),
                (e += i);
            } else e += 1 << 24;
            return e;
          }
          incCounter(e) {
            0 === (e[0] = this.incWord(e[0])) && (e[1] = this.incWord(e[1]));
          }
          calculate(e, t, n) {
            let i;
            if (!(i = t.length)) return [];
            const r = Q.bitLength(t);
            for (let r = 0; r < i; r += 4) {
              this.incCounter(n);
              const i = e.encrypt(n);
              (t[r] ^= i[0]),
                (t[r + 1] ^= i[1]),
                (t[r + 2] ^= i[2]),
                (t[r + 3] ^= i[3]);
            }
            return Q.clamp(t, r);
          }
        },
        _e = class {
          constructor(e) {
            const t = this,
              n = (t._hash = ee.sha1),
              i = [[], []],
              r = n.prototype.blockSize / 32;
            (t._baseHash = [new n(), new n()]), e.length > r && (e = n.hash(e));
            for (let t = 0; t < r; t++)
              (i[0][t] = 909522486 ^ e[t]), (i[1][t] = 1549556828 ^ e[t]);
            t._baseHash[0].update(i[0]),
              t._baseHash[1].update(i[1]),
              (t._resultHash = new n(t._baseHash[0]));
          }
          reset() {
            const e = this;
            (e._resultHash = new e._hash(e._baseHash[0])), (e._updated = !1);
          }
          update(e) {
            (this._updated = !0), this._resultHash.update(e);
          }
          digest() {
            const e = this,
              t = e._resultHash.finalize(),
              n = new e._hash(e._baseHash[1]).update(t).finalize();
            return e.reset(), n;
          }
        };
      class we {
        constructor(e, t, n) {
          Object.assign(this, {
            password: e,
            signed: t,
            strength: n - 1,
            pendingInput: new Uint8Array(0),
          });
        }
        async append(e) {
          const t = this;
          if (t.password) {
            const n = xe(e, 0, oe[t.strength] + 2);
            await (async function (e, t, n) {
              await ge(e, n, xe(t, 0, oe[e.strength]));
              const i = xe(t, oe[e.strength]),
                r = e.keys.passwordVerification;
              if (r[0] != i[0] || r[1] != i[1]) throw new Error(te);
            })(t, n, t.password),
              (t.password = null),
              (t.aesCtrGladman = new he(new fe(t.keys.key), Array.from(de))),
              (t.hmac = new _e(t.keys.authentication)),
              (e = xe(e, oe[t.strength] + 2));
          }
          return be(
            t,
            e,
            new Uint8Array(e.length - le - ((e.length - le) % ne)),
            0,
            le,
            !0,
          );
        }
        flush() {
          const e = this,
            t = e.pendingInput,
            n = xe(t, 0, t.length - le),
            i = xe(t, t.length - le);
          let r = new Uint8Array(0);
          if (n.length) {
            const t = ue.toBits(n);
            e.hmac.update(t);
            const i = e.aesCtrGladman.update(t);
            r = ue.fromBits(i);
          }
          let a = !0;
          if (e.signed) {
            const t = xe(ue.fromBits(e.hmac.digest()), 0, le);
            for (let e = 0; e < le; e++) t[e] != i[e] && (a = !1);
          }
          return {valid: a, data: r};
        }
      }
      class pe {
        constructor(e, t) {
          Object.assign(this, {
            password: e,
            strength: t - 1,
            pendingInput: new Uint8Array(0),
          });
        }
        async append(e) {
          const t = this;
          let n = new Uint8Array(0);
          t.password &&
            ((n = await (async function (e, t) {
              const n = crypto.getRandomValues(new Uint8Array(oe[e.strength]));
              return await ge(e, t, n), ye(n, e.keys.passwordVerification);
            })(t, t.password)),
            (t.password = null),
            (t.aesCtrGladman = new he(new fe(t.keys.key), Array.from(de))),
            (t.hmac = new _e(t.keys.authentication)));
          const i = new Uint8Array(n.length + e.length - (e.length % ne));
          return i.set(n, 0), be(t, e, i, n.length, 0);
        }
        flush() {
          const e = this;
          let t = new Uint8Array(0);
          if (e.pendingInput.length) {
            const n = e.aesCtrGladman.update(ue.toBits(e.pendingInput));
            e.hmac.update(n), (t = ue.fromBits(n));
          }
          const n = xe(ue.fromBits(e.hmac.digest()), 0, le);
          return {data: ye(t, n), signature: n};
        }
      }
      function be(e, t, n, i, r, a) {
        const s = t.length - r;
        let o;
        for (
          e.pendingInput.length &&
            ((t = ye(e.pendingInput, t)),
            (n = (function (e, t) {
              if (t && t > e.length) {
                const n = e;
                (e = new Uint8Array(t)).set(n, 0);
              }
              return e;
            })(n, s - (s % ne)))),
            o = 0;
          o <= s - ne;
          o += ne
        ) {
          const r = ue.toBits(xe(t, o, o + ne));
          a && e.hmac.update(r);
          const s = e.aesCtrGladman.update(r);
          a || e.hmac.update(s), n.set(ue.fromBits(s), o + i);
        }
        return (e.pendingInput = xe(t, o)), n;
      }
      async function ge(e, t, n) {
        const i = new TextEncoder().encode(t),
          r = await crypto.subtle.importKey('raw', i, re, !1, se),
          a = await crypto.subtle.deriveBits(
            Object.assign({salt: n}, ae),
            r,
            8 * (2 * ce[e.strength] + 2),
          ),
          s = new Uint8Array(a);
        e.keys = {
          key: ue.toBits(xe(s, 0, ce[e.strength])),
          authentication: ue.toBits(xe(s, ce[e.strength], 2 * ce[e.strength])),
          passwordVerification: xe(s, 2 * ce[e.strength]),
        };
      }
      function ye(e, t) {
        let n = e;
        return (
          e.length + t.length &&
            ((n = new Uint8Array(e.length + t.length)),
            n.set(e, 0),
            n.set(t, e.length)),
          n
        );
      }
      function xe(e, t, n) {
        return e.subarray(t, n);
      }
      class me {
        constructor(e, t) {
          Object.assign(this, {password: e, passwordVerification: t}),
            Re(this, e);
        }
        append(e) {
          const t = this;
          if (t.password) {
            const n = ve(t, e.subarray(0, 12));
            if (((t.password = null), n[11] != t.passwordVerification))
              throw new Error(te);
            e = e.subarray(12);
          }
          return ve(t, e);
        }
        flush() {
          return {valid: !0, data: new Uint8Array(0)};
        }
      }
      class ke {
        constructor(e, t) {
          Object.assign(this, {password: e, passwordVerification: t}),
            Re(this, e);
        }
        append(e) {
          const t = this;
          let n, i;
          if (t.password) {
            t.password = null;
            const r = crypto.getRandomValues(new Uint8Array(12));
            (r[11] = t.passwordVerification),
              (n = new Uint8Array(e.length + r.length)),
              n.set(Ae(t, r), 0),
              (i = 12);
          } else (n = new Uint8Array(e.length)), (i = 0);
          return n.set(Ae(t, e), i), n;
        }
        flush() {
          return {data: new Uint8Array(0)};
        }
      }
      function ve(e, t) {
        const n = new Uint8Array(t.length);
        for (let i = 0; i < t.length; i++) (n[i] = Ee(e) ^ t[i]), Ue(e, n[i]);
        return n;
      }
      function Ae(e, t) {
        const n = new Uint8Array(t.length);
        for (let i = 0; i < t.length; i++) (n[i] = Ee(e) ^ t[i]), Ue(e, t[i]);
        return n;
      }
      function Re(e, t) {
        (e.keys = [305419896, 591751049, 878082192]),
          (e.crcKey0 = new J(e.keys[0])),
          (e.crcKey2 = new J(e.keys[2]));
        for (let n = 0; n < t.length; n++) Ue(e, t.charCodeAt(n));
      }
      function Ue(e, t) {
        e.crcKey0.append([t]),
          (e.keys[0] = ~e.crcKey0.get()),
          (e.keys[1] = ze(e.keys[1] + Se(e.keys[0]))),
          (e.keys[1] = ze(Math.imul(e.keys[1], 134775813) + 1)),
          e.crcKey2.append([e.keys[1] >>> 24]),
          (e.keys[2] = ~e.crcKey2.get());
      }
      function Ee(e) {
        const t = 2 | e.keys[2];
        return Se(Math.imul(t, 1 ^ t) >>> 8);
      }
      function Se(e) {
        return 255 & e;
      }
      function ze(e) {
        return 4294967295 & e;
      }
      const De = 'inflate',
        Te = 'Invalid signature';
      class Fe {
        constructor(
          e,
          {
            signature: t,
            password: n,
            signed: i,
            compressed: r,
            zipCrypto: a,
            passwordVerification: s,
            encryptionStrength: o,
          },
          {chunkSize: c},
        ) {
          const l = Boolean(n);
          Object.assign(this, {
            signature: t,
            encrypted: l,
            signed: i,
            compressed: r,
            inflate: r && new e({chunkSize: c}),
            crc32: i && new J(),
            zipCrypto: a,
            decrypt: l && a ? new me(n, s) : new we(n, i, o),
          });
        }
        async append(e) {
          const t = this;
          return (
            t.encrypted && e.length && (e = await t.decrypt.append(e)),
            t.compressed && e.length && (e = await t.inflate.append(e)),
            (!t.encrypted || t.zipCrypto) &&
              t.signed &&
              e.length &&
              t.crc32.append(e),
            e
          );
        }
        async flush() {
          const e = this;
          let t,
            n = new Uint8Array(0);
          if (e.encrypted) {
            const t = e.decrypt.flush();
            if (!t.valid) throw new Error(Te);
            n = t.data;
          }
          if ((!e.encrypted || e.zipCrypto) && e.signed) {
            const n = new DataView(new Uint8Array(4).buffer);
            if (
              ((t = e.crc32.get()),
              n.setUint32(0, t),
              e.signature != n.getUint32(0, !1))
            )
              throw new Error(Te);
          }
          return (
            e.compressed &&
              ((n = (await e.inflate.append(n)) || new Uint8Array(0)),
              await e.inflate.flush()),
            {data: n, signature: t}
          );
        }
      }
      class Ce {
        constructor(
          e,
          {
            encrypted: t,
            signed: n,
            compressed: i,
            level: r,
            zipCrypto: a,
            password: s,
            passwordVerification: o,
            encryptionStrength: c,
          },
          {chunkSize: l},
        ) {
          Object.assign(this, {
            encrypted: t,
            signed: n,
            compressed: i,
            deflate: i && new e({level: r || 5, chunkSize: l}),
            crc32: n && new J(),
            zipCrypto: a,
            encrypt: t && a ? new ke(s, o) : new pe(s, c),
          });
        }
        async append(e) {
          const t = this;
          let n = e;
          return (
            t.compressed && e.length && (n = await t.deflate.append(e)),
            t.encrypted && n.length && (n = await t.encrypt.append(n)),
            (!t.encrypted || t.zipCrypto) &&
              t.signed &&
              e.length &&
              t.crc32.append(e),
            n
          );
        }
        async flush() {
          const e = this;
          let t,
            n = new Uint8Array(0);
          if (
            (e.compressed &&
              (n = (await e.deflate.flush()) || new Uint8Array(0)),
            e.encrypted)
          ) {
            n = await e.encrypt.append(n);
            const i = e.encrypt.flush();
            t = i.signature;
            const r = new Uint8Array(n.length + i.data.length);
            r.set(n, 0), r.set(i.data, n.length), (n = r);
          }
          return (
            (e.encrypted && !e.zipCrypto) || !e.signed || (t = e.crc32.get()),
            {data: n, signature: t}
          );
        }
      }
      const Oe = 'init',
        Ie = 'append',
        We = 'flush';
      let Me = !0;
      var He = (e, t, n, i, r, a, s) => (
        Object.assign(e, {
          busy: !0,
          codecConstructor: t,
          options: Object.assign({}, n),
          scripts: s,
          terminate() {
            e.worker && !e.busy && (e.worker.terminate(), (e.interface = null));
          },
          onTaskFinished() {
            (e.busy = !1), r(e);
          },
        }),
        a
          ? (function (e, t) {
              let n;
              const i = {type: 'module'};
              if (!e.interface) {
                if (Me)
                  try {
                    e.worker = r();
                  } catch (t) {
                    (Me = !1), (e.worker = r(i));
                  }
                else e.worker = r(i);
                e.worker.addEventListener(
                  'message',
                  function (t) {
                    const i = t.data;
                    if (n) {
                      const t = i.error,
                        r = i.type;
                      if (t) {
                        const i = new Error(t.message);
                        (i.stack = t.stack),
                          n.reject(i),
                          (n = null),
                          e.onTaskFinished();
                      } else if (r == Oe || r == We || r == Ie) {
                        const t = i.data;
                        r == We
                          ? (n.resolve({
                              data: new Uint8Array(t),
                              signature: i.signature,
                            }),
                            (n = null),
                            e.onTaskFinished())
                          : n.resolve(t && new Uint8Array(t));
                      }
                    }
                  },
                  !1,
                ),
                  (e.interface = {
                    append: (e) => a({type: Ie, data: e}),
                    flush: () => a({type: We}),
                  });
              }
              return e.interface;
              function r(t = {}) {
                return new Worker(
                  new URL(
                    e.scripts[0],
                    'undefined' == typeof document &&
                    'undefined' == typeof location
                      ? new (require('url').URL)('file:' + __filename).href
                      : 'undefined' == typeof document
                      ? location.href
                      : (document.currentScript &&
                          document.currentScript.src) ||
                        new URL(
                          'zip-no-worker-inflate.min.js',
                          document.baseURI,
                        ).href,
                  ),
                  t,
                );
              }
              async function a(i) {
                if (!n) {
                  const n = e.options,
                    i = e.scripts.slice(1);
                  await s({
                    scripts: i,
                    type: Oe,
                    options: n,
                    config: {chunkSize: t.chunkSize},
                  });
                }
                return s(i);
              }
              function s(t) {
                const i = e.worker,
                  r = new Promise((e, t) => (n = {resolve: e, reject: t}));
                try {
                  if (t.data)
                    try {
                      (t.data = t.data.buffer), i.postMessage(t, [t.data]);
                    } catch (e) {
                      i.postMessage(t);
                    }
                  else i.postMessage(t);
                } catch (t) {
                  n.reject(t), (n = null), e.onTaskFinished();
                }
                return r;
              }
            })(e, i)
          : (function (e, t) {
              const n = (function (e, t, n) {
                return t.codecType.startsWith('deflate')
                  ? new Ce(e, t, n)
                  : t.codecType.startsWith(De)
                  ? new Fe(e, t, n)
                  : void 0;
              })(e.codecConstructor, e.options, t);
              return {
                async append(t) {
                  try {
                    return await n.append(t);
                  } catch (t) {
                    throw (e.onTaskFinished(), t);
                  }
                },
                async flush() {
                  try {
                    return await n.flush();
                  } finally {
                    e.onTaskFinished();
                  }
                },
              };
            })(e, i)
      );
      let Be = [],
        Le = [];
      function Ne(e) {
        e.terminateTimeout &&
          (clearTimeout(e.terminateTimeout), (e.terminateTimeout = null));
      }
      const Pe = [
        'filename',
        'rawFilename',
        'directory',
        'encrypted',
        'compressedSize',
        'uncompressedSize',
        'lastModDate',
        'rawLastModDate',
        'comment',
        'rawComment',
        'signature',
        'extraField',
        'rawExtraField',
        'bitFlag',
        'extraFieldZip64',
        'extraFieldUnicodePath',
        'extraFieldUnicodeComment',
        'extraFieldAES',
        'filenameUTF8',
        'commentUTF8',
        'offset',
        'zip64',
        'compressionMethod',
        'extraFieldNTFS',
        'lastAccessDate',
        'creationDate',
        'extraFieldExtendedTimestamp',
        'version',
        'versionMadeBy',
        'msDosCompatible',
        'internalFileAttribute',
        'externalFileAttribute',
      ];
      class je {
        constructor(e) {
          Pe.forEach((t) => (this[t] = e[t]));
        }
      }
      const qe = 'File format is not recognized',
        Ve = 'End of central directory not found',
        Ze = 'End of Zip64 central directory not found',
        Ge = 'End of Zip64 central directory locator not found',
        Ke = 'Central directory header not found',
        Xe = 'Local file header not found',
        Ye = 'Zip64 extra field not found',
        Je = 'File contains encrypted entry',
        Qe = 'Encryption method not supported',
        $e = 'Compression method not supported',
        et = 'utf-8',
        tt = ['uncompressedSize', 'compressedSize', 'offset'];
      class nt {
        constructor(e, t, n) {
          Object.assign(this, {reader: e, config: t, options: n});
        }
        async getData(e, t, n = {}) {
          const i = this,
            {
              reader: r,
              offset: a,
              extraFieldAES: s,
              compressionMethod: o,
              config: c,
              bitFlag: l,
              signature: d,
              rawLastModDate: u,
              compressedSize: f,
            } = i,
            h = (i.localDirectory = {});
          r.initialized || (await r.init());
          let _ = await wt(r, a, 30);
          const w = _t(_);
          let p = st(i, n, 'password');
          if (
            ((p = p && p.length && p), s && 99 != s.originalCompressionMethod)
          )
            throw new Error($e);
          if (0 != o && 8 != o) throw new Error($e);
          if (67324752 != ft(w, 0)) throw new Error(Xe);
          it(h, w, 4),
            (_ = await wt(r, a, 30 + h.filenameLength + h.extraFieldLength)),
            (h.rawExtraField = _.subarray(30 + h.filenameLength)),
            rt(i, h, w, 4),
            (t.lastAccessDate = h.lastAccessDate),
            (t.creationDate = h.creationDate);
          const b = i.encrypted && h.encrypted,
            g = b && !s;
          if (b) {
            if (!g && void 0 === s.strength) throw new Error(Qe);
            if (!p) throw new Error(Je);
          }
          const y = await (function (e, t, n) {
            const i =
                !(!t.compressed && !t.signed && !t.encrypted) &&
                (t.useWebWorkers ||
                  (void 0 === t.useWebWorkers && n.useWebWorkers)),
              r = i && n.workerScripts ? n.workerScripts[t.codecType] : [];
            if (Be.length < n.maxWorkers) {
              const s = {};
              return Be.push(s), He(s, e, t, n, a, i, r);
            }
            {
              const s = Be.find((e) => !e.busy);
              return s
                ? (Ne(s), He(s, e, t, n, a, i, r))
                : new Promise((n) =>
                    Le.push({
                      resolve: n,
                      codecConstructor: e,
                      options: t,
                      webWorker: i,
                      scripts: r,
                    }),
                  );
            }
            function a(e) {
              if (Le.length) {
                const [
                  {
                    resolve: t,
                    codecConstructor: i,
                    options: r,
                    webWorker: s,
                    scripts: o,
                  },
                ] = Le.splice(0, 1);
                t(He(e, i, r, n, a, s, o));
              } else
                e.worker
                  ? (Ne(e),
                    Number.isFinite(n.terminateWorkerTimeout) &&
                      n.terminateWorkerTimeout >= 0 &&
                      (e.terminateTimeout = setTimeout(() => {
                        (Be = Be.filter((t) => t != e)), e.terminate();
                      }, n.terminateWorkerTimeout)))
                  : (Be = Be.filter((t) => t != e));
            }
          })(
            c.Inflate,
            {
              codecType: De,
              password: p,
              zipCrypto: g,
              encryptionStrength: s && s.strength,
              signed: st(i, n, 'checkSignature'),
              passwordVerification:
                g && (l.dataDescriptor ? (u >>> 8) & 255 : (d >>> 24) & 255),
              signature: d,
              compressed: 0 != o,
              encrypted: b,
              useWebWorkers: st(i, n, 'useWebWorkers'),
            },
            c,
          );
          e.initialized || (await e.init());
          const x = st(i, n, 'signal'),
            m = a + 30 + h.filenameLength + h.extraFieldLength;
          return (
            await (async function (e, t, n, i, r, a, s) {
              const o = Math.max(a.chunkSize, 64);
              return (async function a(c = 0, l = 0) {
                const d = s.signal;
                if (c < r) {
                  v(d, e);
                  const u = await t.readUint8Array(c + i, Math.min(o, r - c)),
                    f = u.length;
                  v(d, e);
                  const h = await e.append(u);
                  if ((v(d, e), (l += await A(n, h)), s.onprogress))
                    try {
                      s.onprogress(c + f, r);
                    } catch (e) {}
                  return a(c + o, l);
                }
                {
                  const t = await e.flush();
                  return (
                    (l += await A(n, t.data)),
                    {signature: t.signature, length: l}
                  );
                }
              })();
            })(y, r, e, m, f, c, {onprogress: n.onprogress, signal: x}),
            e.getData()
          );
        }
      }
      function it(e, t, n) {
        const i = (e.rawBitFlag = ut(t, n + 2)),
          r = 1 == (1 & i),
          a = ft(t, n + 6);
        Object.assign(e, {
          encrypted: r,
          version: ut(t, n),
          bitFlag: {
            level: (6 & i) >> 1,
            dataDescriptor: 8 == (8 & i),
            languageEncodingFlag: 2048 == (2048 & i),
          },
          rawLastModDate: a,
          lastModDate: ct(a),
          filenameLength: ut(t, n + 22),
          extraFieldLength: ut(t, n + 24),
        });
      }
      function rt(e, t, n, i) {
        const r = t.rawExtraField,
          a = (t.extraField = new Map()),
          s = _t(new Uint8Array(r));
        let o = 0;
        try {
          for (; o < r.length; ) {
            const e = ut(s, o),
              t = ut(s, o + 2);
            a.set(e, {type: e, data: r.slice(o + 4, o + 4 + t)}), (o += 4 + t);
          }
        } catch (e) {}
        const c = ut(n, i + 4);
        (t.signature = ft(n, i + 10)),
          (t.uncompressedSize = ft(n, i + 18)),
          (t.compressedSize = ft(n, i + 14));
        const l = a.get(1);
        l &&
          ((function (e, t) {
            t.zip64 = !0;
            const n = _t(e.data);
            e.values = [];
            for (let t = 0; t < Math.floor(e.data.length / 8); t++)
              e.values.push(ht(n, 0 + 8 * t));
            const i = tt.filter((e) => t[e] == Z);
            for (let t = 0; t < i.length; t++) e[i[t]] = e.values[t];
            tt.forEach((n) => {
              if (t[n] == Z) {
                if (void 0 === e[n]) throw new Error(Ye);
                t[n] = e[n];
              }
            });
          })(l, t),
          (t.extraFieldZip64 = l));
        const d = a.get(28789);
        d &&
          (at(d, 'filename', 'rawFilename', t, e),
          (t.extraFieldUnicodePath = d));
        const u = a.get(25461);
        u &&
          (at(u, 'comment', 'rawComment', t, e),
          (t.extraFieldUnicodeComment = u));
        const f = a.get(39169);
        f
          ? ((function (e, t, n) {
              const i = _t(e.data);
              (e.vendorVersion = dt(i, 0)), (e.vendorId = dt(i, 2));
              const r = dt(i, 4);
              (e.strength = r),
                (e.originalCompressionMethod = n),
                (t.compressionMethod = e.compressionMethod = ut(i, 5));
            })(f, t, c),
            (t.extraFieldAES = f))
          : (t.compressionMethod = c);
        const h = a.get(10);
        h &&
          ((function (e, t) {
            const n = _t(e.data);
            let i,
              r = 4;
            try {
              for (; r < e.data.length && !i; ) {
                const t = ut(n, r),
                  a = ut(n, r + 2);
                1 == t && (i = e.data.slice(r + 4, r + 4 + a)), (r += 4 + a);
              }
            } catch (e) {}
            try {
              if (i && 24 == i.length) {
                const n = _t(i),
                  r = n.getBigUint64(0, !0),
                  a = n.getBigUint64(8, !0),
                  s = n.getBigUint64(16, !0);
                Object.assign(e, {
                  rawLastModDate: r,
                  rawLastAccessDate: a,
                  rawCreationDate: s,
                });
                const o = {
                  lastModDate: lt(r),
                  lastAccessDate: lt(a),
                  creationDate: lt(s),
                };
                Object.assign(e, o), Object.assign(t, o);
              }
            } catch (e) {}
          })(h, t),
          (t.extraFieldNTFS = h));
        const _ = a.get(21589);
        _ &&
          ((function (e, t) {
            const n = _t(e.data),
              i = dt(n, 0),
              r = [],
              a = [];
            1 == (1 & i) && (r.push('lastModDate'), a.push('rawLastModDate')),
              2 == (2 & i) &&
                (r.push('lastAccessDate'), a.push('rawLastAccessDate')),
              4 == (4 & i) &&
                (r.push('creationDate'), a.push('rawCreationDate'));
            let s = 1;
            r.forEach((i, r) => {
              if (e.data.length >= s + 4) {
                const o = ft(n, s);
                t[i] = e[i] = new Date(1e3 * o);
                const c = a[r];
                e[c] = o;
              }
              s += 4;
            });
          })(_, t),
          (t.extraFieldExtendedTimestamp = _));
      }
      function at(e, t, n, i, r) {
        const a = _t(e.data);
        (e.version = dt(a, 0)), (e.signature = ft(a, 1));
        const s = new J();
        s.append(r[n]);
        const o = _t(new Uint8Array(4));
        o.setUint32(0, s.get(), !0),
          (e[t] = new TextDecoder().decode(e.data.subarray(5))),
          (e.valid =
            !r.bitFlag.languageEncodingFlag && e.signature == ft(o, 0)),
          e.valid && ((i[t] = e[t]), (i[t + 'UTF8'] = !0));
      }
      function st(e, t, n) {
        return void 0 === t[n] ? e.options[n] : t[n];
      }
      function ot(e, t) {
        return t && 'cp437' != t.trim().toLowerCase()
          ? new TextDecoder(t).decode(e)
          : ((e) => {
              let t = '';
              for (let n = 0; n < e.length; n++) t += X[e[n]];
              return t;
            })(e);
      }
      function ct(e) {
        const t = (4294901760 & e) >> 16,
          n = 65535 & e;
        try {
          return new Date(
            1980 + ((65024 & t) >> 9),
            ((480 & t) >> 5) - 1,
            31 & t,
            (63488 & n) >> 11,
            (2016 & n) >> 5,
            2 * (31 & n),
            0,
          );
        } catch (e) {}
      }
      function lt(e) {
        return new Date(Number(e / BigInt(1e4) - BigInt(116444736e5)));
      }
      function dt(e, t) {
        return e.getUint8(t);
      }
      function ut(e, t) {
        return e.getUint16(t, !0);
      }
      function ft(e, t) {
        return e.getUint32(t, !0);
      }
      function ht(e, t) {
        return Number(e.getBigUint64(t, !0));
      }
      function _t(e) {
        return new DataView(e.buffer);
      }
      function wt(e, t, n) {
        return e.readUint8Array(t, n);
      }
      m({
        Inflate: function (e) {
          const t = new g(),
            n = e && e.chunkSize ? Math.floor(2 * e.chunkSize) : 131072,
            r = new Uint8Array(n);
          let a = !1;
          t.inflateInit(),
            (t.next_out = r),
            (this.append = function (e, s) {
              const o = [];
              let c,
                l,
                d = 0,
                u = 0,
                f = 0;
              if (0 !== e.length) {
                (t.next_in_index = 0), (t.next_in = e), (t.avail_in = e.length);
                do {
                  if (
                    ((t.next_out_index = 0),
                    (t.avail_out = n),
                    0 !== t.avail_in || a || ((t.next_in_index = 0), (a = !0)),
                    (c = t.inflate(0)),
                    a && c === i)
                  ) {
                    if (0 !== t.avail_in)
                      throw new Error('inflating: bad input');
                  } else if (0 !== c && 1 !== c)
                    throw new Error('inflating: ' + t.msg);
                  if ((a || 1 === c) && t.avail_in === e.length)
                    throw new Error('inflating: bad input');
                  t.next_out_index &&
                    (t.next_out_index === n
                      ? o.push(new Uint8Array(r))
                      : o.push(r.slice(0, t.next_out_index))),
                    (f += t.next_out_index),
                    s &&
                      t.next_in_index > 0 &&
                      t.next_in_index != d &&
                      (s(t.next_in_index), (d = t.next_in_index));
                } while (t.avail_in > 0 || 0 === t.avail_out);
                return (
                  o.length > 1
                    ? ((l = new Uint8Array(f)),
                      o.forEach(function (e) {
                        l.set(e, u), (u += e.length);
                      }))
                    : (l = o[0] || new Uint8Array(0)),
                  l
                );
              }
            }),
            (this.flush = function () {
              t.inflateEnd();
            });
        },
      }),
        (e.BlobReader = M),
        (e.BlobWriter = class extends W {
          constructor(e) {
            super(), (this.contentType = e), (this.arrayBuffers = []);
          }
          async writeUint8Array(e) {
            super.writeUint8Array(e), this.arrayBuffers.push(e.buffer);
          }
          getData() {
            return (
              this.blob ||
                (this.blob = new Blob(this.arrayBuffers, {
                  type: this.contentType,
                })),
              this.blob
            );
          }
        }),
        (e.Data64URIReader = class extends I {
          constructor(e) {
            super(), (this.dataURI = e);
            let t = e.length;
            for (; '=' == e.charAt(t - 1); ) t--;
            (this.dataStart = e.indexOf(',') + 1),
              (this.size = Math.floor(0.75 * (t - this.dataStart)));
          }
          async readUint8Array(e, t) {
            const n = new Uint8Array(t),
              i = 4 * Math.floor(e / 3),
              r = atob(
                this.dataURI.substring(
                  i + this.dataStart,
                  4 * Math.ceil((e + t) / 3) + this.dataStart,
                ),
              ),
              a = e - 3 * Math.floor(i / 4);
            for (let e = a; e < a + t; e++) n[e - a] = r.charCodeAt(e);
            return n;
          }
        }),
        (e.Data64URIWriter = class extends W {
          constructor(e) {
            super(),
              (this.data = 'data:' + (e || '') + ';base64,'),
              (this.pending = []);
          }
          async writeUint8Array(e) {
            super.writeUint8Array(e);
            let t = 0,
              n = this.pending;
            const i = this.pending.length;
            for (
              this.pending = '', t = 0;
              t < 3 * Math.floor((i + e.length) / 3) - i;
              t++
            )
              n += String.fromCharCode(e[t]);
            for (; t < e.length; t++) this.pending += String.fromCharCode(e[t]);
            n.length > 2 ? (this.data += btoa(n)) : (this.pending = n);
          }
          getData() {
            return this.data + btoa(this.pending);
          }
        }),
        (e.ERR_ABORT = k),
        (e.ERR_BAD_FORMAT = qe),
        (e.ERR_CENTRAL_DIRECTORY_NOT_FOUND = Ke),
        (e.ERR_ENCRYPTED = Je),
        (e.ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND = Ge),
        (e.ERR_EOCDR_NOT_FOUND = Ve),
        (e.ERR_EOCDR_ZIP64_NOT_FOUND = Ze),
        (e.ERR_EXTRAFIELD_ZIP64_NOT_FOUND = Ye),
        (e.ERR_HTTP_RANGE = U),
        (e.ERR_INVALID_PASSWORD = te),
        (e.ERR_INVALID_SIGNATURE = Te),
        (e.ERR_LOCAL_FILE_HEADER_NOT_FOUND = Xe),
        (e.ERR_UNSUPPORTED_COMPRESSION = $e),
        (e.ERR_UNSUPPORTED_ENCRYPTION = Qe),
        (e.HttpRangeReader = class extends q {
          constructor(e, t = {}) {
            (t.useRangeHeader = !0), super(e, t);
          }
        }),
        (e.HttpReader = q),
        (e.Reader = I),
        (e.TextReader = class extends I {
          constructor(e) {
            super(), (this.blobReader = new M(new Blob([e], {type: E})));
          }
          async init() {
            super.init(),
              this.blobReader.init(),
              (this.size = this.blobReader.size);
          }
          async readUint8Array(e, t) {
            return this.blobReader.readUint8Array(e, t);
          }
        }),
        (e.TextWriter = class extends W {
          constructor(e) {
            super(), (this.encoding = e), (this.blob = new Blob([], {type: E}));
          }
          async writeUint8Array(e) {
            super.writeUint8Array(e),
              (this.blob = new Blob([this.blob, e.buffer], {type: E}));
          }
          getData() {
            const e = new FileReader();
            return new Promise((t, n) => {
              (e.onload = (e) => t(e.target.result)),
                (e.onerror = () => n(e.error)),
                e.readAsText(this.blob, this.encoding);
            });
          }
        }),
        (e.Uint8ArrayReader = class extends I {
          constructor(e) {
            super(), (this.array = e), (this.size = e.length);
          }
          async readUint8Array(e, t) {
            return this.array.slice(e, e + t);
          }
        }),
        (e.Uint8ArrayWriter = class extends W {
          constructor() {
            super(), (this.array = new Uint8Array(0));
          }
          async writeUint8Array(e) {
            super.writeUint8Array(e);
            const t = this.array;
            (this.array = new Uint8Array(t.length + e.length)),
              this.array.set(t),
              this.array.set(e, t.length);
          }
          getData() {
            return this.array;
          }
        }),
        (e.Writer = W),
        (e.ZipReader = class {
          constructor(e, t = {}) {
            Object.assign(this, {reader: e, options: t, config: x});
          }
          async getEntries(e = {}) {
            const t = this,
              n = t.reader;
            if ((n.initialized || (await n.init()), n.size < 22))
              throw new Error(qe);
            const i = await (async function (e, t, n, i, r) {
              const a = new Uint8Array(4);
              return (
                (function (e, t, n) {
                  e.setUint32(0, 101010256, !0);
                })(_t(a)),
                (await s(22)) || (await s(Math.min(1048582, n)))
              );
              async function s(t) {
                const i = n - t,
                  r = await wt(e, i, t);
                for (let e = r.length - 22; e >= 0; e--)
                  if (
                    r[e] == a[0] &&
                    r[e + 1] == a[1] &&
                    r[e + 2] == a[2] &&
                    r[e + 3] == a[3]
                  )
                    return {offset: i + e, buffer: r.slice(e, e + 22).buffer};
              }
            })(n, 0, n.size);
            if (!i) throw new Error(Ve);
            const r = _t(i);
            let a = ft(r, 12),
              s = ft(r, 16),
              o = ut(r, 8),
              c = 0;
            if (s == Z || a == Z || 65535 == o) {
              const e = _t(await wt(n, i.offset - 20, 20));
              if (117853008 != ft(e, 0)) throw new Error(Ze);
              s = ht(e, 8);
              let t = await wt(n, s, 56),
                r = _t(t);
              const l = i.offset - 20 - 56;
              if (ft(r, 0) != K && s != l) {
                const e = s;
                (s = l), (c = s - e), (t = await wt(n, s, 56)), (r = _t(t));
              }
              if (ft(r, 0) != K) throw new Error(Ge);
              (o = ht(r, 32)), (a = ht(r, 40)), (s -= a);
            }
            if (s < 0 || s >= n.size) throw new Error(qe);
            let l = 0,
              d = await wt(n, s, a),
              u = _t(d);
            const f = i.offset - a;
            if (ft(u, l) != G && s != f) {
              const e = s;
              (s = f), (c = s - e), (d = await wt(n, s, a)), (u = _t(d));
            }
            if (s < 0 || s >= n.size) throw new Error(qe);
            const h = [];
            for (let i = 0; i < o; i++) {
              const r = new nt(n, t.config, t.options);
              if (ft(u, l) != G) throw new Error(Ke);
              it(r, u, l + 6);
              const a = Boolean(r.bitFlag.languageEncodingFlag),
                s = l + 46,
                f = s + r.filenameLength,
                _ = f + r.extraFieldLength,
                w = ut(u, l + 4),
                p = 0 == (0 & w);
              Object.assign(r, {
                versionMadeBy: w,
                msDosCompatible: p,
                compressedSize: 0,
                uncompressedSize: 0,
                commentLength: ut(u, l + 32),
                directory: p && 16 == (16 & dt(u, l + 38)),
                offset: ft(u, l + 42) + c,
                internalFileAttribute: ft(u, l + 34),
                externalFileAttribute: ft(u, l + 38),
                rawFilename: d.subarray(s, f),
                filenameUTF8: a,
                commentUTF8: a,
                rawExtraField: d.subarray(f, _),
              });
              const b = _ + r.commentLength;
              (r.rawComment = d.subarray(_, b)),
                (r.filename = ot(
                  r.rawFilename,
                  r.filenameUTF8 ? et : st(t, e, 'filenameEncoding'),
                )),
                (r.comment = ot(
                  r.rawComment,
                  r.commentUTF8 ? et : st(t, e, 'commentEncoding'),
                )),
                !r.directory && r.filename.endsWith('/') && (r.directory = !0),
                rt(r, r, u, l + 6);
              const g = new je(r);
              if (
                ((g.getData = (e, t) => r.getData(e, g, t)),
                h.push(g),
                (l = b),
                e.onprogress)
              )
                try {
                  e.onprogress(i + 1, o, new je(r));
                } catch (e) {}
            }
            return h;
          }
          async close() {}
        }),
        (e.configure = m),
        (e.getMimeType = function () {
          return 'application/octet-stream';
        }),
        Object.defineProperty(e, '__esModule', {value: !0});
    }),
    'object' == typeof exports && 'undefined' != typeof module
      ? t(exports)
      : 'function' == typeof define && define.amd
      ? define(['exports'], t)
      : t(
          ((e = 'undefined' != typeof globalThis ? globalThis : e || self).zip =
            {}),
        );
})();
