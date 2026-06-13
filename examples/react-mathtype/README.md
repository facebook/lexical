# React MathType example

This example demonstrates a standalone WIRIS MathType integration for a
Lexical React editor. It keeps MathType as an example dependency and stores
formulas in a custom Lexical node instead of allowing MathType to mutate the
Lexical contenteditable directly.

The bridge uses `@wiris/mathtype-generic` to open the MathType/ChemType UI,
converts the generated MathML image into `MathTypeNode` state inside
`editor.update`, and reopens MathType when a formula node is double-clicked.

MathType stores formulas as MathML. The rendered formula image is kept in node
state for the demo, while DOM export emits the same `img.Wirisformula` shape
that MathType's parser expects.

## Running

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run typecheck
```

MathType may require a WIRIS license or self-hosted services for production
use. See the MathType generic integration documentation for service
configuration details.
