'use strict';
var path = require('path');
var fs = require('fs');

// Helper for mapping include file paths to karma file patterns - served, included, but not watched
var createIncludePattern = function(path) {
  return {
    pattern: path,
    included: true,
    served: true,
    watched: false
  };
};

// Resolve paths for dependencies now
var getDependencyPath = function(moduleName, relativePath) {
  try {
    return path.dirname(require.resolve(moduleName)) + relativePath;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' && e.message.indexOf(moduleName) !== -1) {
      console.warn('Cannot find "%s".\n  Did you forget to install it ?\n' +
        '  npm install %s --save-dev', moduleName, moduleName);
    } else {
      console.warn('Error during loading "%s":\n  %s', moduleName, e.message);
    }
  }
};

// Loads up a SystemJS config file and returns the configuration
// Taken from how systemjs-builder loads config files inside node
var readConfigFile = function(filePath) {
  var curSystem = global.System;
  var fileConfig = {};
  global.System = {
    config: function(cfg) {
      merge(cfg, fileConfig);
    }
  };
  // jshint evil:true
  new Function(fs.readFileSync(filePath).toString()).call(global);
  global.System = curSystem;
  return fileConfig;
};

// Takes properties from one object and applies them to another IF they don't already exist
var merge = function(source, into) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      if (!into.hasOwnProperty(key)) {
        into[key] = source[key];
      }
    }
  }
};

// Merges 2 SystemJS configs
var mergeConfigs = function(source, into) {
  merge(source, into);
  merge(source.paths, into.paths);
  merge(source.map, into.map);
  merge(source.meta, into.meta);
};

// Returns a dependency path based on 'paths' configuration, or node_modules/ lookup
var pathOrNpm = function(systemjsConfig, basePath, systemModuleName, npmModuleName, npmPath) {
  var path = systemjsConfig.paths && systemjsConfig.paths[systemModuleName];
  if (path) {
    return basePath + systemjsConfig.baseURL + path;
  } else {
    console.warn('[WARNING] Looking up paths with require.resolve() is deprecated.\n' +
      'Please add "' + systemModuleName + '" to your SystemJS config paths.');
    return getDependencyPath(npmModuleName, npmPath);
  }
};

/**
 * Returns the path to the transpiler.
 * @param config {object} SystemJS config
 * @param basePath {string}
 * @returns {string}
 */
var getTranspilerPath = function(config, basePath) {
  // Path should come from SystemJS, but for backwards compatibility will also check for a known npm path
  switch (config.transpiler) {
  case null: // If null, no transpiler in use
    return '';
  case 'babel':
    return pathOrNpm(config, basePath, 'babel', 'babel-core', '/../../../browser.js');
  case undefined: // Traceur is still the default transpiler if undefined
  case 'traceur':
    return pathOrNpm(config, basePath, 'traceur', 'traceur', '/../../bin/traceur.js');
  case 'typescript':
    return pathOrNpm(config, basePath, 'typescript', 'typescript', '/typescript.js');
  default:
    return pathOrNpm(config, basePath, config.transpiler, config.transpiler, config.transpiler + '.js');
  }
};

/**
 * Run during karma initialisation.
 * Alters the karma configuration to use SystemJS.
 * @param config {object}
 */
var initSystemjs = function(config) {
  // Final files array should look like this:
  // - SystemJS libraries - included
  // - SystemJS config - included & watched
  // - App code and tests - served and watched
  // - Plugin adapter - included

  var kSystemjsConfig = config.systemjs || {};
  kSystemjsConfig.config = kSystemjsConfig.config || {};
  var basePath = (config.basePath || '.') + '/';

  // If there's an external SystemJS configuration file...
  if (kSystemjsConfig.configFile) {
    // Add it's path to config.files
    var cfgPath = basePath + kSystemjsConfig.configFile;
    config.files.unshift({
      pattern: cfgPath,
      included: true,
      served: true,
      watched: true
    });

    // Load it, and merge it with the config
    mergeConfigs(readConfigFile(cfgPath), kSystemjsConfig.config);
  }

  // Resolve the paths for es6-module-loader and systemjs
  // Check the System config for the paths, or revert to looking them up in node_modules/
  var es6LoaderPath = pathOrNpm(kSystemjsConfig.config, basePath,
    'es6-module-loader', 'es6-module-loader', '/dist/es6-module-loader.src.js');
  var systemjsPath = pathOrNpm(kSystemjsConfig.config, basePath,
    'systemjs', 'systemjs', '/dist/system.src.js');
  var polyfillsPath = pathOrNpm(kSystemjsConfig.config, basePath,
    'system-polyfills', 'systemjs', '/dist/system-polyfills.js');

  // Adds dependencies to start of config.files: es6-module-loader, and system.js
  // Don't watch, since these files should never change
  config.files.unshift(
    createIncludePattern(es6LoaderPath),
    createIncludePattern(polyfillsPath),
    createIncludePattern(systemjsPath)
  );

  // If a transpiler is being used, include it in the files
  var transpilerPath = getTranspilerPath(kSystemjsConfig.config, basePath);
  if (transpilerPath) {
    // Don't watch, since this file should never change
    config.files.unshift(
      createIncludePattern(transpilerPath)
    );
  }

  // system.js-0.16+ uses Function.prototype.bind, which PhantomJS does not support.
  if (config.browsers && config.browsers.indexOf('PhantomJS') !== -1) {
    var phantomjsPolyfillPath = pathOrNpm(kSystemjsConfig.config, basePath,
      'phantomjs-polyfill', 'phantomjs-polyfill', '/bind-polyfill.js');
    config.files.unshift(
      createIncludePattern(phantomjsPolyfillPath)
    );
  }

  // Adds file patterns from config.systemjs.files to config.files, set to be served but not included
  if (kSystemjsConfig.files) {
    kSystemjsConfig.files.forEach(function(filePath) {
      config.files.push({
        pattern: basePath + filePath,
        included: false,
        served: true,
        watched: true
      });
    });
  }

  // Adds karma-systemjs adapter.js to end of config.files
  config.files.push(createIncludePattern(__dirname + '/adapter.js'));

  // Adding configuration to be passed to the adapter running on the browser
  config.client.systemjs = {
    testFileSuffix: kSystemjsConfig.testFileSuffix,
    config: kSystemjsConfig.config
  };
};
initSystemjs.$inject = ['config'];

module.exports = {
  'framework:systemjs': ['factory', initSystemjs]
};
