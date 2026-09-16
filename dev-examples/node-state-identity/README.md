# Application node identity

An executable application policy using NodeState and public Lexical APIs.
Run from the repository root after `pnpm install`:

```sh
pnpm run start:dev-example node-state-identity
```

Open the printed URL. Edit, save/load, duplicate the first paragraph, or use
the browser's copy/cut/paste commands and inspect the serialized IDs.
Saving keeps a snapshot in memory, not across browser reloads.

[`src/identity.ts`](src/identity.ts) is the policy; `src/main.ts` supplies
the editor and a random 128-bit ID allocator using `crypto.getRandomValues()`.
Integrating applications must allocate nonempty IDs unique across their identity domain, including
saved documents. Register the policy before creating content and use
`loadApplicationDocument` when restoring it.

The application-owned `$isAddressable` predicate selects non-root ElementNodes,
including custom elements and slots. TextNodes remain mergeable. Adapt that
predicate to your addressing needs; the policy has no dependency on the demo UI.
Save/load preserves IDs; new addressable nodes created by `$copyNode` or paste
receive fresh IDs, including after cut. Only `externalId` is cleared on paste.

The policy uses an O(N) RootNode scan and public, experimental `$dfsWithSlots`.
See the [NodeState identity guide](../../packages/lexical-website/docs/concepts/node-state.md#persistent-application-identity)
for load-time registration, ordinary state preservation, and application
boundaries (including cross-editor paste, imports and reference handling).

Run the focused tests from the repository root:

```sh
pnpm run test-unit dev-examples/node-state-identity/src/__tests__/unit/identity.test.ts
```
