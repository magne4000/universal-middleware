declare global {
  namespace Universal {
    interface Context {
      something?: string;
    }
  }
}

// By using export {}, we mark the file as an external module.
// When augmenting the global scope, you are required to make the file as a module
export {};
