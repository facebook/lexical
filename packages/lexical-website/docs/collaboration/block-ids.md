---
sidebar_position: 3
---

# Block IDs

[`BlockIdExtension`](/docs/extensions/block-ids) stores each block's id as
NodeState, so ids sync through any collaboration binding that synchronizes
NodeState.

- **Assignment.** The collaborator who creates a block assigns its id. A
  pasted or duplicated block is repaired in the update that creates it, so it
  reaches the others with its own id. Two clients that put the same initial
  content into empty editors give it the same ids.
- **Duplicates.** Duplicates that appear only when concurrent edits merge
  are repaired the same way on every replica: the earliest holder in
  document order keeps the id, and the others get ids
  [derived from it](/docs/extensions/block-ids#id-format). Every replica
  reaches the same result without coordination.

**Enable the extension on every client that writes.** A client without it
writes blocks without ids, which every collaborator then names by place
([positional ids](/docs/extensions/block-ids#documents-stored-without-ids)).
Positional ids come from the document a collaborator sees, so when such a
client writes between two collaborators' repairs (while one of them has
unsynced edits, or when they open the document at different moments), they
derive different ids for the same block. The shared document keeps one of
them, and on the other collaborator an id it already wrote changes once.
The collaborators converge, the ids stay unique, and nothing changes after
that, but an id read in between can stop naming its block.
