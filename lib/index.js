var path = require('path');

// Helper for mapping include file paths to karma file patterns - served, included, but not watched
var createIncludePattern = function (path) {
	return {pattern: path, included: true, served: true, watched: false};
};

// Resolve paths for dependencies now
var traceurPath = path.dirname(require.resolve('traceur')) + '/../../bin/traceur.js';
var es6ModuleLoaderPath = path.dirname(require.resolve('es6-module-loader')) + '/../dist/es6-module-loader.src.js';
var systemjsPath = path.dirname(require.resolve('systemjs')) + '/system.src.js';

/**
 * Run during karma initialisation.
 * Alters the karma configuration to use SystemJS.
 * @param config {object}
 */
var initSystemJs = function (config) {
	// Final files array should look like this: SystemJS libraries - included; SystemJS config - included & watched; App code and tests - served and watched; Plugin adapter - included
	var systemjsConfig = config.systemjs || {};
	var basePath = (config.basePath || '.') + '/';

	// Adds config file specified by config.systemjs to config.files
	if (systemjsConfig.configFile) {
		config.files.unshift({
			pattern: basePath + systemjsConfig.configFile,
			included: true,
			served: true,
			watched: true
		});
	}

	// Adds dependencies to start of config.files: traceur, es6-module-loader, and system.js
	// Don't watch, since these files should never change
	config.files.unshift(createIncludePattern(traceurPath), createIncludePattern(es6ModuleLoaderPath), createIncludePattern(systemjsPath));

	// Adds file patterns from config.systemjs.files to config.files, set to be served but not included
	if (systemjsConfig.files) {
		systemjsConfig.files.forEach(function (filePath) {
			config.files.push({pattern: basePath + filePath, included: false, served: true, watched: true});
		});
	}

	// Adds karma-systemjs adapter.js to end of config.files
	config.files.push(createIncludePattern(__dirname + '/adapter.js'));

	// Adding configuration to be passed to the adapter running on the browser
	config.client.systemjs = {
		testFileSuffix: systemjsConfig.testFileSuffix || '_test.js',
		paths: systemjsConfig.paths || {}
	};
};
initSystemJs.$inject = ['config'];

module.exports = {
	'framework:systemjs': ['factory', initSystemJs]
};