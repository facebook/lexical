export = config;
/** @type {import('@docusaurus/types').Config} */
declare const config: any;
declare namespace config {
    export { SidebarItemsGenerator, NormalizedSidebarItem };
}
type SidebarItemsGenerator = import("@docusaurus/plugin-content-docs").PluginOptions["sidebarItemsGenerator"];
type NormalizedSidebarItem = Awaited<ReturnType<SidebarItemsGenerator>>[number];
//# sourceMappingURL=docusaurus.config.d.ts.map