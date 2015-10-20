'use strict';
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Minimatch = require("minimatch").Minimatch;

/**
 * Helper for mapping include file paths to karma file patterns - served, included, but not watched
 * @param path {string}
 * @returns {object}
 */
var createIncludePattern = function(path) {
  return {
    pattern: path,
    included: true,
    served: true,
    watched: false
  };
};

/**
 * Resolve paths for dependencies now
 * @param moduleName {string}
 * @param relativePath {string}
 * @returns {string}
 */
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

/**
 * Loads up a SystemJS config file and returns the configuration
 * Taken from how systemjs-builder loads config files inside node
 * @param filePath {string}
 * @returns {object}
 */
var readConfigFile = function(filePath) {
  var curSystem = global.System;
  var fileConfig = {};
  global.System = {
    config: function(cfg) {
      _.merge(fileConfig, cfg);
    }
  };
  // jshint evil:true
  new Function(fs.readFileSync(filePath).toString()).call(global);
  global.System = curSystem;
  return fileConfig;
};

/**
 * Returns a dependency path based on 'paths' configuration, or node_modules/ lookup
 * @param systemjsConfig {object} The SystemJS config object
 * @param basePath {string} Path that SystemJS paths are relative to
 * @param systemModuleName {string} Name of the module as the SystemJS config knows it.
 * @param npmModuleName {string} Name of module as npm knows it.
 * @param npmPath {string} Path to use relative to a `require.resolve()` call
 * @returns {string}
 */
var pathOrNpm = function(systemjsConfig, basePath, systemModuleName, npmModuleName, npmPath) {
  var filePath = systemjsConfig.paths && systemjsConfig.paths[systemModuleName];
  if (filePath) {
    return path.join(basePath, systemjsConfig.baseURL || '', filePath);
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
 * Returns the list of '{included: true}' file patterns before setting them to '{included: false}'
 * @param fileList {object[]}
 * @param basePath {string}
 * @returns {string[]}
 */
var processIncludedPatterns = function(fileList, basePath) {
  var included = _.filter(fileList, {included: true});
  _.forEach(included, function (file) {
    file.included = false;
  });
  return _.map(included, function(file) {
    // Rather than make Minimatch available in the browser,
    // it's simpler to use it within Karma and extract the RegExps as strings.
    // Also take into account the '/base' or '/absolute' path that Karma serves files from
    var path = !basePath || file.pattern.indexOf(basePath) === 0 ?
        '/base' + file.pattern.replace(basePath, '') :
        '/absolute' + file.pattern;
    var regexString = (new Minimatch(path)).makeRe().toString();
    return regexString.substring(1, regexString.length - 1); // Remove the "/" from the start and end, so it'll fit into 'new RegExp()'
  });
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
  // - 'files' - served, watched, and marked to be called with 'System.import()' (if {included: true})
  // - 'systemjs.serveFiles' - served only
  // - Plugin adapter - included

  // Create list of file patterns to load with 'System.import()'
  var importPatterns = processIncludedPatterns(config.files, config.basePath);

  var kSystemjsConfig = config.systemjs || {};
  kSystemjsConfig.config = kSystemjsConfig.config || {};
  var basePath = (config.basePath || '.') + '/';

  // If there's an external SystemJS configuration file...
  if (kSystemjsConfig.configFile) {
    // Load it, and merge it with the config
    // karma-systemjs.config should take precedence over external SystemJS configuration file
    var cfgPath = basePath + kSystemjsConfig.configFile;
    var kConfig = readConfigFile(cfgPath);

    _.merge(kConfig, kSystemjsConfig.config);

    kSystemjsConfig.config = kConfig;
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

  // Adds file patterns from config.systemjs.serveFiles to config.files, set to be served but not included
  if (kSystemjsConfig.serveFiles) {
    kSystemjsConfig.serveFiles.forEach(function(pathOrPattern) {
      if (typeof pathOrPattern === 'object') {
        config.files.push(pathOrPattern);
      } else {
        config.files.push({
          pattern: basePath + pathOrPattern,
          included: false,
          served: true,
          watched: true
        });
      }
    });
  }

  // Add file patterns to always be included back into files
  if (kSystemjsConfig.includeFiles) {
    var includedPatterns = kSystemjsConfig.includeFiles.map(function(pathOrPattern) {
      if (typeof pathOrPattern === 'object') {
        return pathOrPattern;
      }
      return createIncludePattern(basePath + pathOrPattern);
    });
    config.files = includedPatterns.concat(config.files);
  }

  // Adds karma-systemjs adapter.js to end of config.files
  config.files.push(createIncludePattern(__dirname + '/adapter.js'));

  // Adding configuration to be passed to the adapter running on the browser
  config.client.systemjs = {
    config: kSystemjsConfig.config,
    importPatterns: importPatterns
  };
};
initSystemjs.$inject = ['config'];

module.exports = initSystemjs;
