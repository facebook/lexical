# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Instructions

For detailed architectural guidance, build commands, and development workflows, see **[AGENTS.md](./AGENTS.md)**.

## Backwards Compatibility

**All changes MUST be backwards compatible.** Do not remove or rename existing public APIs, change their signatures/behavior, or break the `EditorState`/node JSON serialization format. Add new APIs alongside old ones and deprecate rather than delete. See the [Backwards Compatibility section in AGENTS.md](./AGENTS.md#backwards-compatibility) for details.
