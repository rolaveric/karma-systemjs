// Used for testing config loading
System.config({
  transpiler: 'babel',
  paths: {
    'module-a': 'to-actual-src.js'
  },
  meta: {
    'module-b': {
      deps: ['fromConfigFile']
    }
  }
});