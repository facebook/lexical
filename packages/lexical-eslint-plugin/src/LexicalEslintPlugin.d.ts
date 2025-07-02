declare namespace all {
    export let plugins: string[];
    let rules_1: {
        '@lexical/rules-of-lexical': string;
    };
    export { rules_1 as rules };
}
import { name } from "../package.json";
import { version } from "../package.json";
export namespace configs {
    export { all };
    export { all as recommended };
}
export namespace meta {
    export { name };
    export { version };
}
export let rules: {
    'rules-of-lexical': import("eslint").Rule.RuleModule;
};
export {};
//# sourceMappingURL=LexicalEslintPlugin.d.ts.map