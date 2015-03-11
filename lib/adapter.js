(function (window) {
  'use strict';
	var adapter = {
		createTestFileRegexp: function (testFileSuffix) {
			if (testFileSuffix) {
        return new RegExp(testFileSuffix.replace(/\./g, '\\.') + '$');
			} else {
				// If a suffix isn't specified, try the usual suspects
				return /[\._]((test)|(spec))\.js$/i;
			}
		},

		importTestSuites: function (System, files, testFileRegexp) {
			var testSuitePromises = [];
			for (var filePath in files) {
				if (files.hasOwnProperty(filePath) && testFileRegexp.test(filePath)) {
					// Convert file paths to module name by stripping the baseURL and extension
					var moduleName = filePath
						.replace(/\.\w*$/, '')
						.replace(new RegExp('^' + System.baseURL.replace('/', '\/')), '');
					testSuitePromises.push(System.import(moduleName));
				}
			}
			return testSuitePromises;
		},

    updatebaseURL: function (originalBaseURL) {
      if (originalBaseURL.indexOf('./') === 0) {
        return originalBaseURL.replace('./', '/base/');
      } else {
        return '/base' + originalBaseURL;
      }
    },

		run: function (karma, System, Promise) {
			// Stop karma from starting automatically on load
			karma.loaded = function () {
			};

			// Load SystemJS configuration from karma config
			if (karma.config.systemjs.config) {
				System.config(karma.config.systemjs.config);
			}

			// Update baseURL with '/base', where Karma serves files from
      System.baseURL = adapter.updatebaseURL(System.baseURL);

			// Generate regexp for locating test suite files using config
			var testFileRegexp = adapter.createTestFileRegexp(karma.config.systemjs.testFileSuffix);

			// Import each test suite using SystemJS
			var testSuitePromises = adapter.importTestSuites(System, karma.files, testFileRegexp);

			// Once all imports are complete...
			Promise.all(testSuitePromises).then(function () {
				karma.start();
			}, function (e) {
				karma.error(e);
			});
		}
	};

	if (window.System) {
		adapter.run(window.__karma__, window.System, window.Promise);
	} else {
		//if no System global, expose global for unit testing
		window.karmaSystemjsAdapter = adapter;
	}
})(window);