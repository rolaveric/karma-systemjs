(function(window) {
  'use strict';
  var adapter = {
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
     * Checks a set of filePaths to see if they match a given regexp.  If they do, they get imported by SystemJS.
     * @param filePaths {string[]}
     * @param importRegexp {RegExp}
     * @param System {object}
     * @returns {promise[]}
     */
    importIfMatching: function(filePaths, importRegexp, System) {
      var importPromises = [];
      for (var filePath in filePaths) {
        if (filePaths.hasOwnProperty(filePath) && importRegexp.test(filePath)) {
          importPromises.push(System.import(adapter.getModuleNameFromPath(filePath, System.baseURL, System)));
        }
      }
      return importPromises;
    },

    /**
     * Calls System.import on all the files that match one of the importPatterns.
     * Returns an array of promises for each import call.
     * @param System {object}
     * @param files {object} key/value map of filePaths to change counters
     * @param importRegexps {RegExp[]}
     * @returns {promise[]}
     */
    importFiles: function(System, files, importRegexps) {
      var importPromises = [];
      // We need to make sure files are imported in the same order as the patterns were added
      // eg. angular-route comes after angular
      for (var x = 0; x < importRegexps.length; x++) {
        importPromises = importPromises.concat(adapter.importIfMatching(files, importRegexps[x], System));
      }
      return importPromises;
    },

    /**
     * Changes the 'baseURL' to include the '/base/' path that karma
     * serves files from.
     * @param originalBaseURL {string}
     * @returns {string}
     */
    updateBaseURL: function(originalBaseURL) {
      if (!originalBaseURL) {
        return '/base/';
      } else if (originalBaseURL.indexOf('./') === 0) {
        return originalBaseURL.replace('./', '/base/');
      } else if (originalBaseURL.indexOf('/') !== 0) {
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
      // Fail fast if any of the dependencies are undefined
      if (!karma) {
        (console.error || console.log)('Error: Not setup properly.  window.__karma__ is undefined');
        return;
      }
      if (!System) {
        (console.error || console.log)('Error: Not setup properly.  window.System is undefined');
        return;
      }
      if (!Promise) {
        (console.error || console.log)('Error: Not setup properly.  window.Promise is undefined');
        return;
      }

      // Stop karma from starting automatically on load
      karma.loaded = function() {
      };

      // Load SystemJS configuration from karma config
      // And update baseURL with '/base', where Karma serves files from
      if (karma.config.systemjs.config) {
        // SystemJS config is converted to a JSON string by the framework
        // https://github.com/rolaveric/karma-systemjs/issues/44
        karma.config.systemjs.config = JSON.parse(karma.config.systemjs.config);

        karma.config.systemjs.config.baseURL = this.updateBaseURL(karma.config.systemjs.config.baseURL);
        System.config(karma.config.systemjs.config);
      } else {
        System.config({baseURL: '/base/'});
      }

      // Convert the 'importPatterns' into 'importRegexps'
      var importPatterns = karma.config.systemjs.importPatterns;
      var importRegexps = [];
      for (var x = 0; x < importPatterns.length; x++) {
        importRegexps.push(new RegExp(importPatterns[x]));
      }

      // Import each test suite using SystemJS
      var testSuitePromises;
      try {
        testSuitePromises = adapter.importFiles(System, karma.files, importRegexps);
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