'use strict';
/* jscs: disable disallowMultipleVarDecl */
describe('karmaSystemjsAdapter()', function() {
  var karma, System, Promise, promiseSpy, adapter;
  beforeEach(function() {
    karma = {
      start: jasmine.createSpy('start'),
      config: {
        systemjs: {
          importPatterns: []
        }
      },
      files: {}
    };
    promiseSpy = {
      then: jasmine.createSpy('then').and.callFake(function() {
        return promiseSpy;
      })
    };
    System = {
      baseURL: '/base/app/',
      'import': jasmine.createSpy('import').and.returnValue(promiseSpy),
      config: jasmine.createSpy('config')
    };
    Promise = {
      all: jasmine.createSpy('all').and.returnValue(promiseSpy),
      resolve: jasmine.createSpy('resolve').and.returnValue(promiseSpy)
    };
    adapter = window.karmaSystemjsAdapter;
  });

  describe('getModuleNameFromPath()', function() {

    it('Removes baseURL prefix', function() {
      expect(adapter.getModuleNameFromPath('/base/app/lib/include.js', System.baseURL, System)).toBe('lib/include.js');
    });

    it('Removes .js extension if System.defaultJSExtensions is true', function() {
      System.defaultJSExtensions = true;
      expect(adapter.getModuleNameFromPath('/base/app/lib/include.js', System.baseURL, System)).toBe('lib/include');
    });
  });

  describe('getMatchingModulesToImport()', function() {

    it('Filters out filepaths which match a given regexp and returns their moduleName', function() {
      var files = {
        '/base/app/lib/include.js': 1,
        '/base/app/src/thing.js': 1,
        '/base/app/src/thing.spec.js': 1
      };
      var testFileRegexp = /^\/base\/.*\.spec\.js/;
      expect(adapter.getMatchingModulesToImport(files, testFileRegexp, System)).toEqual([
        'src/thing.spec.js'
      ]);
    });
  });

  describe('parallelImportFiles()', function() {

    it('Imports all matching files in parallel', function() {
      var files = {};
      var testFileRegexps = [/^\/base\/.*\.spec\.js/];
      spyOn(adapter, 'getMatchingModulesToImport').and.returnValue([
        'src/first.spec.js',
        'src/second.spec.js'
      ]);
      expect(adapter.parallelImportFiles(System, Promise, files, testFileRegexps)).toBe(promiseSpy);
      expect(Promise.all).toHaveBeenCalledWith([promiseSpy, promiseSpy]);
      expect(System.import).toHaveBeenCalledWith('src/first.spec.js');
      expect(System.import).toHaveBeenCalledWith('src/second.spec.js');
    });
  });
  
  describe('chainImport()', function() {
    
    it('Chains System.import() to a promise when it resolves', function() {
      expect(adapter.chainImport(promiseSpy, 'moduleName', System)).toBe(promiseSpy);
      expect(promiseSpy.then.calls.argsFor(0)[0]()).toBe(promiseSpy);
      expect(System.import).toHaveBeenCalledWith('moduleName');
    });
  });

  describe('sequentialImportFiles()', function() {

    it('Imports all matching files in sequence', function() {
      var files = {};
      var testFileRegexps = [/^\/base\/.*\.spec\.js/];
      spyOn(adapter, 'getMatchingModulesToImport').and.returnValue([
        'src/first.spec.js',
        'src/second.spec.js'
      ]);
      expect(adapter.sequentialImportFiles(System, Promise, files, testFileRegexps)).toBe(promiseSpy);

      // Initial State: System.import has not yet been called until the first promise resolves
      expect(System.import).not.toHaveBeenCalled();

      // First promise resolves: Only first module imported
      expect(promiseSpy.then.calls.argsFor(0)[0]()).toBe(promiseSpy);
      expect(System.import).toHaveBeenCalledWith('src/first.spec.js');
      expect(System.import).not.toHaveBeenCalledWith('src/second.spec.js');

      // Second promise resolves: Second module imported
      expect(promiseSpy.then.calls.argsFor(1)[0]()).toBe(promiseSpy);
      expect(System.import).toHaveBeenCalledWith('src/second.spec.js');
    });
  });

  describe('importFiles()', function() {

    it('Calls sequentialImportFiles() if strictImportSequence is true', function() {
      spyOn(adapter, 'sequentialImportFiles');
      adapter.importFiles(System, Promise, {}, [], true);
      expect(adapter.sequentialImportFiles).toHaveBeenCalledWith(System, Promise, {}, []);
    });

    it('Calls parallelImportFiles() if strictImportSequence is false', function() {
      spyOn(adapter, 'parallelImportFiles');
      adapter.importFiles(System, Promise, {}, [], false);
      expect(adapter.parallelImportFiles).toHaveBeenCalledWith(System, Promise, {}, []);
    });
  });

  describe('updateBaseURL()', function() {
    it('Adds "/base" to the start of System.baseURL, after calling System.config()', function() {
      expect(adapter.updateBaseURL('app')).toBe('/base/app');
    });

    it('Adds "/base" to the start of System.baseURL, after calling System.config()', function() {
      expect(adapter.updateBaseURL('/app/')).toBe('/base/app/');
    });

    it('Replaces "./" with "/base/"', function() {
      expect(adapter.updateBaseURL('./')).toBe('/base/');
      expect(adapter.updateBaseURL('./app/')).toBe('/base/app/');
    });
  });

  describe('run()', function() {

    it('Stops karma from loading automatically by changing karma.loaded to a noop', function() {
      karma.loaded = 123;
      adapter.run(karma, System, Promise);
      expect(typeof karma.loaded).toBe('function');
    });

    it('Passes in systemjs config to System.config(), if set', function() {
      karma.config.systemjs.config = '{"key": "value"}';
      adapter.run(karma, System, Promise);
      expect(System.config).toHaveBeenCalledWith({key: 'value', baseURL: '/base/'});
    });

    it('Only calls System.config() to set baseURL, if no config set', function() {
      karma.config.systemjs.config = null;
      adapter.run(karma, System, Promise);
      expect(System.config).toHaveBeenCalledWith({baseURL: '/base/'});
    });

    it('Adds "/base" to the start of System.baseURL, after calling System.config()', function() {
      System.config.and.callFake(function(config) {
        System.baseURL = config.baseURL;
      });
      karma.config.systemjs.config = JSON.stringify({baseURL: '/app/'});
      adapter.run(karma, System, Promise);
      expect(System.baseURL).toBe('/base/app/');
    });

    it('Imports karma.files that match one of the importPatterns', function() {
      karma.config.systemjs.importPatterns = ['test'];
      karma.config.systemjs.strictImportSequence = true;
      karma.files = {a: true, b: true, c: true};
      spyOn(adapter, 'importFiles').and.returnValue(promiseSpy);
      adapter.run(karma, System, Promise);
      expect(adapter.importFiles).toHaveBeenCalledWith(System, Promise, karma.files, [/test/], true);
      expect(promiseSpy.then).toHaveBeenCalled();
    });

    it('Starts karma once all import promises have resolved', function() {
      adapter.run(karma, System, Promise);
      expect(karma.start).not.toHaveBeenCalled();
      promiseSpy.then.calls.argsFor(0)[0]();
      expect(karma.start).toHaveBeenCalled();
    });
  });

  describe('decorateErrorWithHints()', function() {

    it('Converts error objects to strings', function() {
      expect(typeof adapter.decorateErrorWithHints(new Error('test'), System)).toBe('string');
    });

    it('Adds hints for Not Found .es6 files', function() {
      var err = 'Error loading "app/module.es6" at /base/app/module.es6.js';
      expect(adapter.decorateErrorWithHints(err, System)).toBe(
        'Error loading "app/module.es6" at /base/app/module.es6.js' +
        '\nHint: If you use ".es6" as an extension, add this to your SystemJS paths config: {"*.es6": "*.es6"}'
      );
    });

    it('Adds hints for Illegal module names starting with /base/', function() {
      var err = new TypeError('Illegal module name "/base/lib/module"');
      expect(adapter.decorateErrorWithHints(err, System)).toBe(
        'TypeError: Illegal module name "/base/lib/module"' +
        '\nHint: Is the working directory different when you run karma?' +
        '\nYou may need to change the baseURL of your SystemJS config inside your karma config.' +
        '\nIt\'s currently checking "/base/app/"' +
        '\nNote: "/base/" is where karma serves files from.'
      );
    });
  });
});