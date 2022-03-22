---
sidebar_position: 1
---

# Introduction

Lexical is an extensible JavaScript text-editor that provides reliable, accessible and performant typing experiences for the web.

The core of Lexical is a dependency-free text editor engine that allows for powerful, simple and complex,
editor implementations to be built on top. Lexical's engine provides three main parts:

- editor instances that each attach to a single content editable element.
- a set of editor states that represent the current and pending states of the editor at any given time.
- a DOM reconciler that takes a set of editor states, diffs the changes, and updates the DOM according to their state.

By design, the core of Lexical tries to be as minimal as possible.
Lexical doesn't directly concern itself with things that monolithic editors tend to do – such as UI components, toolbars or rich-text features and markdown. Instead
the logic for those features can be included via a plugin interface and used as and when they're needed. This ensures great extensibilty and keeps code-sizes
to a minimal – ensuring apps only pay the cost for what they actually import.

For React apps, Lexical has tight intergration with React 18+ via the optional `@lexical/react` package. This package provides
production-ready utility functions, helpers and React hooks that make it seemless to create text editors within React.
