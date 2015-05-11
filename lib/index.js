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
var pathOrNpm = function(systemjsConfig, basePath, moduleName, npmPath) {
  var path = systemjsConfig.paths && systemjsConfig.paths[moduleName];
  if (path) {
    return basePath + systemjsConfig.baseURL + path;
  } else {
    return getDependencyPath(moduleName, npmPath);
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
    'es6-module-loader', '/dist/es6-module-loader.src.js');
  var systemjsPath = pathOrNpm(kSystemjsConfig.config, basePath,
    'systemjs', '/system.src.js');

  // Adds dependencies to start of config.files: es6-module-loader, and system.js
  // Don't watch, since these files should never change
  config.files.unshift(
    createIncludePattern(es6LoaderPath),
    createIncludePattern(systemjsPath)
  );

  // Default to use Traceur as transpiler, but make it possible to avoid using
  // a transpiler by setting the transpiler option to null.
  var useTranspiler = kSystemjsConfig.config.transpiler !== null;
  if (useTranspiler) {
    var transpilerPath = kSystemjsConfig.config.transpiler === 'babel' ?
      pathOrNpm(kSystemjsConfig.config, basePath, 'babel', '/node_modules/babel-core/browser.js') :
      pathOrNpm(kSystemjsConfig.config, basePath, 'traceur', '/../../bin/traceur.js');

    // Don't watch, since this file should never change
    config.files.unshift(
      createIncludePattern(transpilerPath)
    );
  }

  // system.js-0.16 uses Function.prototype.bind, which PhantomJS does not support.
  if (config.browsers && config.browsers.indexOf('PhantomJS') !== -1) {
    var phantomjsPolyfillPath = getDependencyPath('phantomjs-polyfill', '/bind-polyfill.js');
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
