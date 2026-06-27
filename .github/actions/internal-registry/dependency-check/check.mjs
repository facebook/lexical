/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Checks that every dependency version pinned in the lockfile is available from
// the configured registry, and fails if any pinned version is not served.
// Supports pnpm, npm and yarn lockfiles (auto-detected by filename); an
// unrecognized lockfile fails rather than passing silently. Auth is a
// short-lived token in $REGISTRY_TOKEN.

import {readFile} from 'node:fs/promises';

const REGISTRY = (
  process.env.REGISTRY_URL ?? 'https://registry.facebook.net'
).replace(/\/$/, '');
const LOCKFILE = process.env.LOCKFILE ?? 'pnpm-lock.yaml';
const CONCURRENCY = Number(process.env.CHECK_CONCURRENCY ?? 20);
const TOKEN = process.env.REGISTRY_TOKEN;

if (!TOKEN) {
  console.error('::error::REGISTRY_TOKEN is not set.');
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

// pnpm v9: `packages:` keys are bare `name@version` (peer suffixes live in
// `snapshots:`). Workspace packages link locally and don't appear here.
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
    const m = line.match(/^ {2}(?:'([^']+)'|([^'\s][^:]*?)):\s*$/);
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

// npm v2/v3: `packages` map keyed by node_modules paths; falls back to the v1
// nested `dependencies` tree. Only registry-resolved entries are checked.
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
// an indented `version "x"` / `version: x`. Name is the specifier minus range.
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
  const url = `${REGISTRY}/${name.replace(/\//g, '%2F')}`;
  try {
    const res = await fetch(url, {
      headers: {Accept: 'application/json', Authorization: `Bearer ${TOKEN}`},
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

// A recognized lockfile with content must yield packages; zero means the format
// drifted from what we parse, so fail rather than pass silently.
if (names.length === 0) {
  console.error(`::error::Parsed 0 packages from ${LOCKFILE}.`);
  process.exit(4);
}

const totalVersions = names.reduce((n, k) => n + byName.get(k).size, 0);
console.warn(
  `Checking ${totalVersions} version(s) across ${names.length} package(s) against ${REGISTRY} …`,
);

const missing = [];
const authErrors = [];
const otherErrors = [];

let idx = 0;
async function worker() {
  while (idx < names.length) {
    if (authErrors.length) {
      return;
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
          missing.push({name, version: v});
        }
        continue;
      }
      if (!res.ok) {
        otherErrors.push({detail: `HTTP ${res.status}`, name});
        continue;
      }
      const served = (await res.json()).versions ?? {};
      for (const v of byName.get(name)) {
        if (!(v in served)) {
          missing.push({name, version: v});
        }
      }
    } catch (e) {
      otherErrors.push({detail: String(e), name});
    }
  }
}

await Promise.all(
  Array.from({length: Math.min(CONCURRENCY, names.length)}, worker),
);

// Auth failure is a setup problem, not a dependency problem.
if (authErrors.length) {
  console.error(
    `::error::Registry returned ${authErrors[0].status} (not authorized) — check the CI registry credentials.`,
  );
  process.exit(2);
}

// Network errors fail closed rather than passing silently.
if (otherErrors.length) {
  console.error(
    `::error::Could not reach the registry for ${otherErrors.length} package(s):`,
  );
  for (const e of otherErrors.slice(0, 30)) {
    console.error(`  - ${e.name}: ${e.detail}`);
  }
  process.exit(3);
}

if (missing.length) {
  console.error(
    `::error::${missing.length} pinned version(s) are not available from the registry:`,
  );
  for (const m of missing.slice(0, 100)) {
    console.error(`  - ${m.name}@${m.version}`);
  }
  if (missing.length > 100) {
    console.error(`  … and ${missing.length - 100} more`);
  }
  process.exit(1);
}

console.warn(`OK — all ${totalVersions} pinned version(s) are available.`);
