/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Internal npm registry availability gate.
//
// Every third-party (name, version) pinned in the lockfile must be fetchable
// from Meta's internal npm registry (registry.facebook.net) *right now*. The
// internal registry withholds newly published third-party versions for a short
// window, so a freshly published version is absent from the metadata it serves
// even though it exists on public npm. A frozen install inside Meta would then
// fail on that version, even though it installs fine in public GitHub CI. This
// catches that gap before code lands.
//
// It checks metadata membership (is the version listed?), not tarball
// reachability: the withholding happens at the metadata layer, and third-party
// tarballs are not gated, so a tarball probe would give a false green. It is
// also window-agnostic — it just asks "is this version served?", so it needs no
// knowledge of the withholding window's length.
//
// Lockfiles: pnpm, npm, and yarn are supported, auto-detected by filename. An
// unrecognized format (or one that parses to zero packages) fails loudly rather
// than silently passing — a format mismatch must never look like "all clear".
//
// Auth: a short-lived bearer token in $REGISTRY_TOKEN (minted from this CI job's
// GitHub OIDC identity by the surrounding action). We talk to the registry over
// fetch() with an explicit Authorization header and deliberately do NOT write
// .npmrc.

import {readFile} from 'node:fs/promises';

const REGISTRY = (
  process.env.REGISTRY_URL ?? 'https://registry.facebook.net'
).replace(/\/$/, '');
const LOCKFILE = process.env.LOCKFILE ?? 'pnpm-lock.yaml';
const CONCURRENCY = Number(process.env.CHECK_CONCURRENCY ?? 20);
const TOKEN = process.env.REGISTRY_TOKEN;

if (!TOKEN) {
  console.error(
    '::error::REGISTRY_TOKEN is not set — the OIDC token-exchange step must run first.',
  );
  process.exit(1);
}

function add(byName, name, version) {
  if (!name || !version) {
    return;
  }
  if (!byName.has(name)) {
    byName.set(name, new Set());
  }
  byName.get(name).add(version);
}

// Dispatch on the lockfile name. Deliberately bounded to the three mainstream
// ecosystems; anything else throws (handled below as a hard failure).
function parsePinned(lockfilePath, text) {
  const base = lockfilePath.split('/').pop();
  if (base === 'pnpm-lock.yaml') {
    return parsePnpm(text);
  }
  if (base === 'package-lock.json') {
    return parseNpm(text);
  }
  if (base === 'yarn.lock') {
    return parseYarn(text);
  }
  throw new Error(
    `Unsupported lockfile "${base}". Supported: pnpm-lock.yaml, package-lock.json, yarn.lock.`,
  );
}

// pnpm v9: `packages:` section, keys are bare `name@version` (peer-dep suffixes
// live in `snapshots:`). Workspace packages link locally and don't appear here.
function parsePnpm(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('packages:');
  const byName = new Map();
  if (start === -1) {
    return byName;
  }
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      continue;
    }
    if (!/^\s/.test(line)) {
      break;
    }
    const m = line.match(/^  (?:'([^']+)'|([^'\s][^:]*?)):\s*$/);
    if (!m) {
      continue;
    }
    const key = m[1] ?? m[2];
    const at = key.lastIndexOf('@');
    if (at <= 0) {
      continue;
    }
    add(byName, key.slice(0, at), key.slice(at + 1));
  }
  return byName;
}

// npm v2/v3: `packages` map keyed by node_modules paths, each with `version`.
// Falls back to the v1 nested `dependencies` tree. Only registry-resolved
// entries are checked (skip workspace links and git/file/tarball specs).
function parseNpm(text) {
  const json = JSON.parse(text);
  const byName = new Map();
  if (json.packages) {
    for (const [path, info] of Object.entries(json.packages)) {
      if (!path || info.link || !info.version) {
        continue;
      }
      if (info.resolved && !/^https?:/.test(info.resolved)) {
        continue;
      }
      const i = path.lastIndexOf('node_modules/');
      const name = i === -1 ? path : path.slice(i + 'node_modules/'.length);
      add(byName, name, info.version);
    }
  } else if (json.dependencies) {
    const walk = deps => {
      for (const [name, info] of Object.entries(deps)) {
        if (
          info.version &&
          (!info.resolved || /^https?:/.test(info.resolved))
        ) {
          add(byName, name, info.version);
        }
        if (info.dependencies) {
          walk(info.dependencies);
        }
      }
    };
    walk(json.dependencies);
  }
  return byName;
}

// yarn classic + berry: a descriptor line lists comma-separated specifiers, then
// an indented `version "x"` (classic) or `version: x` (berry). The resolved
// version is that field; the name is the specifier minus its range.
function parseYarn(text) {
  const byName = new Map();
  let pending = null;
  for (const line of text.split('\n')) {
    if (/^[^\s#]/.test(line)) {
      pending = line
        .replace(/:\s*$/, '')
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .map(s => {
          const at = s.lastIndexOf('@');
          return at <= 0 ? s : s.slice(0, at);
        })
        .filter(n => n && n !== '__metadata');
    } else if (pending && /^\s+version[:\s]/.test(line)) {
      const m = line.match(/version[:\s]+"?([^"\s]+)"?/);
      if (m) {
        for (const n of pending) {
          add(byName, n, m[1]);
        }
      }
      pending = null;
    }
  }
  return byName;
}

async function fetchPackument(name, attempt = 0) {
  const url = `${REGISTRY}/${name.replace('/', '%2F')}`;
  try {
    const res = await fetch(url, {
      headers: {Authorization: `Bearer ${TOKEN}`, Accept: 'application/json'},
    });
    if (res.status >= 500 && attempt < 1) {
      return fetchPackument(name, attempt + 1);
    }
    return res;
  } catch (e) {
    if (attempt < 1) {
      return fetchPackument(name, attempt + 1);
    }
    throw e;
  }
}

const text = await readFile(LOCKFILE, 'utf8');
let byName;
try {
  byName = parsePinned(LOCKFILE, text);
} catch (e) {
  console.error(`::error::${e.message}`);
  process.exit(4);
}
const names = [...byName.keys()];

// Fail closed: a recognized lockfile with real content must yield packages. Zero
// means the format/version drifted from what we parse — never treat that as OK.
if (names.length === 0) {
  console.error(
    `::error::Parsed 0 packages from ${LOCKFILE} — unrecognized or unexpected lockfile format/version. Refusing to pass.`,
  );
  process.exit(4);
}

const totalVersions = names.reduce((n, k) => n + byName.get(k).size, 0);
console.log(
  `Checking ${totalVersions} pinned version(s) across ${names.length} package(s) from ${LOCKFILE} against ${REGISTRY} …`,
);

const missing = []; // {name, version, reason}
const authErrors = [];
const otherErrors = [];

let idx = 0;
async function worker() {
  while (idx < names.length) {
    if (authErrors.length) {
      return; // someone already hit an auth wall; stop early
    }
    const name = names[idx++];
    try {
      const res = await fetchPackument(name);
      if (res.status === 401 || res.status === 403) {
        authErrors.push({name, status: res.status});
        return;
      }
      if (res.status === 404) {
        for (const v of byName.get(name)) {
          missing.push({
            name,
            version: v,
            reason: 'package not found on the registry',
          });
        }
        continue;
      }
      if (!res.ok) {
        otherErrors.push({name, detail: `HTTP ${res.status}`});
        continue;
      }
      const served = (await res.json()).versions ?? {};
      for (const v of byName.get(name)) {
        if (!(v in served)) {
          missing.push({
            name,
            version: v,
            reason: 'absent from registry metadata (withheld/unavailable)',
          });
        }
      }
    } catch (e) {
      otherErrors.push({name, detail: String(e)});
    }
  }
}

await Promise.all(
  Array.from({length: Math.min(CONCURRENCY, names.length)}, worker),
);

// Auth failure is a misconfiguration, not a dependency problem — say so.
if (authErrors.length) {
  console.error(
    `::error::The registry returned ${authErrors[0].status} for ${authErrors[0].name} — this CI identity is not authorized to read. ` +
      `Confirm the registry read-auth onboarding for this repo (D109850078) is deployed. This is NOT a dependency problem.`,
  );
  process.exit(2);
}

// Network/5xx errors are a gate, so fail closed rather than pass silently.
if (otherErrors.length) {
  console.error(
    `::error::Could not verify ${otherErrors.length} package(s) against the registry (failing closed):`,
  );
  for (const e of otherErrors.slice(0, 30)) {
    console.error(`  - ${e.name}: ${e.detail}`);
  }
  process.exit(3);
}

if (missing.length) {
  console.error(
    `::error::${missing.length} pinned version(s) are not served by the internal registry (${REGISTRY}). A frozen install inside Meta would fail on these:`,
  );
  for (const m of missing.slice(0, 100)) {
    console.error(`  - ${m.name}@${m.version}  — ${m.reason}`);
  }
  if (missing.length > 100) {
    console.error(`  … and ${missing.length - 100} more`);
  }
  console.error(
    'A recently-published third-party version is most likely being withheld for the usual window and becomes available once it ages out; ' +
      'an older missing version may be unavailable/blocked. Options: wait out the window, pin an available version, or request an allowlist entry.',
  );
  process.exit(1);
}

console.log(
  `OK — all ${totalVersions} pinned version(s) are served by the internal registry.`,
);
