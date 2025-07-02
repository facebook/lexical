export function buildMatcher(...toMatchers: any[]): IdentifierMatcher;
export type Node = any;
export type Identifier = any;
export type NameIdentifierMatcher = (name: string, node: Identifier) => boolean;
export type ToMatcher = NameIdentifierMatcher | string | RegExp | undefined;
export type IdentifierMatcher = (node: Identifier | undefined) => boolean;
//# sourceMappingURL=buildMatcher.d.ts.map