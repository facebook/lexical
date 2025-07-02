export type ModuleBuildDefinition = {
    outputFileName: string;
    sourceFileName: string;
};
export type PackageBuildDefinition = {
    modules: Array<ModuleBuildDefinition>;
    name: string;
    outputPath: string;
    packageName: string;
    sourcePath: string;
};
export type ModuleExportEntry = {
    name: string;
    sourceFileName: string;
};
export type ImportCondition = Record<"types" | "development" | "production" | "node" | "default", string>;
export type RequireCondition = Record<"types" | "development" | "production" | "default", string>;
export type NpmModuleExportEntry = readonly [string, {
    import: ImportCondition;
    require: RequireCondition;
}];
/**
 * Metadata abstraction for a package.json file
 */
export class PackageMetadata {
    /**
     * @param {string} packageJsonPath the path to the package.json file
     */
    constructor(packageJsonPath: string);
    /** @type {string} the path to the package.json file */
    packageJsonPath: string;
    /** @type {Record<string, any>} the parsed package.json */
    packageJson: Record<string, any>;
    /**
     * @param {...string} paths to resolve in this package's directory
     * @returns {string} Resolve a path in this package's directory
     */
    resolve(...paths: string[]): string;
    /**
     * @returns {string} the directory name of the package, e.g. 'lexical-rich-text'
     */
    getDirectoryName(): string;
    /**
     * @returns {string} the npm name of the package, e.g. '@lexical/rich-text'
     */
    getNpmName(): string;
    /**
     * @returns {boolean} whether the package is marked private (not published to npm)
     */
    isPrivate(): boolean;
    /**
     * Get an array of (fully qualified) exported module names and their
     * corresponding export map. Ignores the backwards compatibility '.js'
     * exports and replaces /^.[/]?/ with the npm name of the package.
     *
     * E.g. [['lexical', {...}]] or [['@lexical/react/LexicalComposer', {...}]
     *
     * @returns {Array<NpmModuleExportEntry>}
     */
    getNormalizedNpmModuleExportEntries(): Array<NpmModuleExportEntry>;
    /**
     * @returns {Array<string>} the npm module names that this package exports
     */
    getExportedNpmModuleNames(): Array<string>;
    /**
     * The entries of npm module names to their .tsx? source files
     *
     * @returns {Array<ModuleExportEntry>}
     */
    getExportedNpmModuleEntries(): Array<ModuleExportEntry>;
    /**
     * The map of import module names to their .tsx? source files
     * (for private modules such as shared)
     *
     * @returns {Array<ModuleExportEntry>}
     */
    getPrivateModuleEntries(): Array<ModuleExportEntry>;
    /**
     * @returns {PackageBuildDefinition}
     */
    getPackageBuildDefinition(): PackageBuildDefinition;
    /**
     * Writes this.packageJson back to this.packageJsonPath
     */
    writeSync(): void;
}
//# sourceMappingURL=PackageMetadata.d.ts.map