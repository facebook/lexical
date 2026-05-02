// onnxruntime-node ships a large prebuilt binary and is only reachable through
// the Node entrypoint of @huggingface/transformers, which we never use - the
// website build aliases @huggingface/transformers to transformers.web.js and
// stubs onnxruntime-node to `false` (see packages/lexical-website/docusaurus.config.ts).
// Strip it from the manifest so pnpm does not download it.
function readPackage(pkg) {
  if (pkg.name === '@huggingface/transformers' && pkg.dependencies) {
    delete pkg.dependencies['onnxruntime-node'];
  }
  return pkg;
}

module.exports = {hooks: {readPackage}};
