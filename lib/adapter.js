(function (karma, System) {
	// Stop karma from starting automatically on load
	karma.loaded = function () {
	};

	// Karma serves files from '/base'
	System.baseURL = '/base' + System.baseURL;

	// Include path overrides from karma config
	if (karma.config.systemjs.paths) {
		for (var key in karma.config.systemjs.paths) {
			if (karma.config.systemjs.paths.hasOwnProperty(key)) {
				System.paths[key] = karma.config.systemjs.paths[key];
			}
		}
	}

	// Generate regexp for locating test suite files using config
	var testFileRegexp = new RegExp(karma.config.systemjs.testFileSuffix.replace(/\./g, '\\.') + '$');

	// Import each test suite using SystemJS
	var testSuitePromises = [];
	for (var filePath in karma.files) {
		if (karma.files.hasOwnProperty(filePath) && testFileRegexp.test(filePath)) {
			// Convert file paths to module name by stripping the baseURL and extension
			var moduleName = filePath
				.replace(/\.\w*$/, '')
				.replace(new RegExp('^' + System.baseURL.replace('/', '\/')), '');
			testSuitePromises.push(System.import(moduleName));
		}
	}

	// Once all imports are complete...
	Promise.all(testSuitePromises).then(function () {
		karma.start();
	});
})(window.__karma__, window.System);