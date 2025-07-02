export const rulesOfLexical: RuleModule;
export type NodeParentExtension = import("eslint").Rule.NodeParentExtension;
export type CallExpression = any & NodeParentExtension;
export type Identifier = any & NodeParentExtension;
export type RuleContext = import("eslint").Rule.RuleContext;
export type Fix = import("eslint").Rule.Fix;
export type Node = import("eslint").Rule.Node;
export type RuleModule = import("eslint").Rule.RuleModule;
export type ReportFixer = import("eslint").Rule.ReportFixer;
export type SourceCode = import("eslint").SourceCode;
export type Variable = import("eslint").Scope.Variable;
export type Scope = import("eslint").Scope.Scope;
export type RulesOfLexicalOptions = Partial<BaseMatchers<ToMatcher | ToMatcher[]>>;
export type Matchers = BaseMatchers<IdentifierMatcher>;
export type ToMatcher = import("../util/buildMatcher.js").ToMatcher;
export type IdentifierMatcher = import("../util/buildMatcher.js").IdentifierMatcher;
/**
 * <T>
 */
export type BaseMatchers<T> = {
    /**
     * Catch all identifiers that begin with '$' or 'INTERNAL_$' followed by a lowercase Latin character or underscore
     */
    isDollarFunction: T;
    /**
     * These functions may call any $functions even though they do not have the isDollarFunction naming convention
     */
    isIgnoredFunction: T;
    /**
     * Certain calls through the editor or editorState allow for implicit access to call $functions: read, registerCommand, registerNodeTransform, update.
     */
    isLexicalProvider: T;
    /**
     * It's usually safe to call $isNode functions, so any '$is' or 'INTERNAL_$is' function may be called in any context.
     */
    isSafeDollarFunction: T;
};
//# sourceMappingURL=rules-of-lexical.d.ts.map