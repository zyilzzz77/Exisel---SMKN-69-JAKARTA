/**
 * ESM loader shim for diagnostic tests ONLY.
 * Maps the `server-only` marker package to an empty module so real server
 * modules (rotating-qr, etc.) can be imported under node --test / tsx.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: "data:text/javascript,export {};" };
  }
  return nextResolve(specifier, context);
}
