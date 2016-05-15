// Used for testing config loading
System.config({
  transpiler: 'plugin-babel',
  paths: {
    'module-a': 'to-actual-src.js'
  },
  meta: {
    'module-b': {
      deps: ['fromConfigFile']
    }
  }
});