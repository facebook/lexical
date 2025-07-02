export const packagesManager: PackagesManager;
/** Cache of all PackageMetadata for the packages directory */
declare class PackagesManager {
    /**
     * @param {Array<string>} packagePaths
     */
    constructor(packagePaths: Array<string>);
    /** @type {Array<PackageMetadata>} */
    packages: Array<PackageMetadata>;
    /** @type {Map<string, PackageMetadata>} */
    packagesByNpmName: Map<string, PackageMetadata>;
    /** @type {Map<string, PackageMetadata>} */
    packagesByDirectoryName: Map<string, PackageMetadata>;
    /**
     * Get the PackageMetadata for a package by its npm name.
     * @param {string} name
     * @returns {PackageMetadata}
     */
    getPackageByNpmName(name: string): PackageMetadata;
    /**
     * Get the PackageMetadata for a package by its npm name.
     * @param {string} name
     * @returns {PackageMetadata}
     */
    getPackageByDirectoryName(name: string): PackageMetadata;
    /**
     * Get the cached metadata for all packages in the packages directory,
     * sorted by directory name.
     * @returns {Array<PackageMetadata>}
     */
    getPackages(): Array<PackageMetadata>;
    /**
     * Get the cached metadata for packages in the packages directory
     * where the private field is not set to true, sorted by directory
     * name ('lexical' will come before 'lexical-*').
     * @returns {Array<PackageMetadata>}
     */
    getPublicPackages(): Array<PackageMetadata>;
    /**
     * Given an array of npm dependencies (may include non-Lexical names),
     * return all required transitive monorepo dependencies to have those
     * packages (in a topologically ordered Map).
     *
     * @param {Array<string>} npmDependencies
     * @returns {Map<string, PackageMetadata>}
     */
    computedMonorepoDependencyMap(npmDependencies: Array<string>): Map<string, PackageMetadata>;
}
import { PackageMetadata } from "./PackageMetadata";
export {};
//# sourceMappingURL=packagesManager.d.ts.map