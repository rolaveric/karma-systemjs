(function(window) {
  'use strict';
  var adapter = {
    /**
     * Creates a regular expression for finding test suites from file paths.
     * Uses either the provided suffix, or a default regexp
     * @param testFileSuffix {string}
     * @returns {RegExp}
     */
    createTestFileRegexp: function(testFileSuffix) {
      if (testFileSuffix) {
        return new RegExp(testFileSuffix.replace(/\./g, '\\.') + '$');
      } else {
        // If a suffix isn't specified, try the usual suspects
        return /[\._]((test)|(spec))\.js$/i;
      }
    },

    /**
     * Takes a file path and the baseURL and returns the module name
     * to pass to System.import()
     * @param filePath {string}
     * @param baseURL {string}
     * @param System {object}
     * @returns {string}
     */
    getModuleNameFromPath: function(filePath, baseURL, System) {
      // Convert file paths to module name by stripping the baseURL and the ".js" extension
      if (System.defaultJSExtensions) {
        filePath = filePath.replace(/\.js$/, '');
      }
      return filePath
        .replace(new RegExp('^' + baseURL.replace('/', '\/')), '');
    },

    /**
     * Calls System.import on all the files that match the test suite regexp.
     * Returns an array of promises for each import call.
     * @param System {object}
     * @param files {string[]}
     * @param testFileRegexp {RegExp}
     * @returns {promise[]}
     */
    importTestSuites: function(System, files, testFileRegexp) {
      var testSuitePromises = [];
      for (var filePath in files) {
        if (files.hasOwnProperty(filePath) && testFileRegexp.test(filePath)) {
          testSuitePromises.push(System.import(adapter.getModuleNameFromPath(filePath, System.baseURL, System)));
        }
      }
      return testSuitePromises;
    },

    /**
     * Changes the 'baseURL' to include the '/base/' path that karma
     * serves files from.
     * @param originalBaseURL {string}
     * @returns {string}
     */
    updatebaseURL: function(originalBaseURL) {
      if (!originalBaseURL) {
        return '/base/';
      } else if (originalBaseURL.indexOf('./') === 0) {
        return originalBaseURL.replace('./', '/base/');
      } else if (originalBaseURL.indexOf("/") !== 0) {
        return '/base/' + originalBaseURL;
      } else {
        return '/base' + originalBaseURL;
      }
    },

    /**
     * Has SystemJS load each test suite, then starts Karma
     * @param karma {object}
     * @param System {object}
     * @param Promise {object}
     */
    run: function(karma, System, Promise) {
      // Stop karma from starting automatically on load
      karma.loaded = function() {
      };

      // Load SystemJS configuration from karma config
      // And update baseURL with '/base', where Karma serves files from
      if (karma.config.systemjs.config) {
        karma.config.systemjs.config.baseURL = this.updatebaseURL(karma.config.systemjs.config.baseURL);
        System.config(karma.config.systemjs.config);
      } else {
        System.config({baseURL: '/base/'});
      }

      // Generate regexp for locating test suite files using config
      var testFileRegexp = adapter.createTestFileRegexp(karma.config.systemjs.testFileSuffix);

      // Import each test suite using SystemJS
      var testSuitePromises;
      try {
        testSuitePromises = adapter.importTestSuites(System, karma.files, testFileRegexp);
      } catch (e) {
        karma.error(adapter.decorateErrorWithHints(e, System));
        return;
      }

      // Once all imports are complete...
      Promise.all(testSuitePromises).then(function() {
        karma.start();
      }, function(e) {
        karma.error(adapter.decorateErrorWithHints(e, System));
      });
    },

    /**
     * Checks errors to see if they match known issues, and tries to decorate them
     * with hints on how to resolve them.
     * @param err {string}
     * @param System {object}
     * @returns {string}
     */
    decorateErrorWithHints: function(err, System) {
      err = String(err);
      // Look for common issues in the error message, and try to add hints to them
      switch (true) {
        // Some people use ".es6" instead of ".js" for ES6 code
      case /^Error loading ".*\.es6" at .*\.es6\.js/.test(err):
        return err + '\nHint: If you use ".es6" as an extension, ' +
          'add this to your SystemJS paths config: {"*.es6": "*.es6"}';
      case /^TypeError: Illegal module name "\/base\//.test(err):
        return err + '\nHint: Is the working directory different when you run karma?' +
          '\nYou may need to change the baseURL of your SystemJS config inside your karma config.' +
          '\nIt\'s currently checking "' + System.baseURL + '"' +
          '\nNote: "/base/" is where karma serves files from.';
      }

      return err;
    }
  };

  if (window.System) {
    adapter.run(window.__karma__, window.System, window.Promise);
  } else {
    //if no System global, expose global for unit testing
    window.karmaSystemjsAdapter = adapter;
  }
})(window);