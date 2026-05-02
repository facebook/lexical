// onnxruntime-node and sharp ship large prebuilt native binaries that are
// only reachable through the Node entrypoint of @huggingface/transformers.
// This example loads transformers.js in a browser web worker (see
// src/ai/ai-worker.ts), so the Node entrypoint is unreachable. Strip them
// from the manifest so `pnpm i` does not download them.
function readPackage(pkg) {
  if (pkg.name === '@huggingface/transformers' && pkg.dependencies) {
    delete pkg.dependencies['onnxruntime-node'];
    delete pkg.dependencies.sharp;
  }
  return pkg;
}

module.exports = {hooks: {readPackage}};
