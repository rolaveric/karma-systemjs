'use strict';
/* jscs: disable disallowMultipleVarDecl */
describe('karmaSystemjsAdapter()', function() {
  var karma, System, Promise, promiseSpy, adapter;
  beforeEach(function() {
    karma = {
      start: jasmine.createSpy('start'),
      config: {
        systemjs: {}
      },
      files: {}
    };
    System = {
      baseURL: '/base/app/',
      'import': jasmine.createSpy('import').and.returnValue(1),
      config: jasmine.createSpy('config')
    };
    promiseSpy = {
      then: jasmine.createSpy('then').and.callFake(function() {
        return promiseSpy;
      })
    };
    Promise = {
      all: jasmine.createSpy('all').and.returnValue(promiseSpy)
    };
    adapter = window.karmaSystemjsAdapter;
  });

  describe('createTestFileRegexp()', function() {

    it('Builds a RegExp out of the testFileSuffix', function() {
      var result = adapter.createTestFileRegexp('.meep.js');
      expect(result.test('myApp.js')).toBe(false);
      expect(result.test('myApp.test.js')).toBe(false);
      expect(result.test('myApp.meep.js')).toBe(true);
    });

    it('Uses a common standard RegExp if no testFileSuffix is supplied', function() {
      var result = adapter.createTestFileRegexp();
      expect(result.test('myApp.js')).toBe(false);
      expect(result.test('myApp.test.js')).toBe(true);
      expect(result.test('myApp.meep.js')).toBe(false);
    });
  });

  describe('getModuleNameFromPath()', function() {

    it('Removes baseURL prefix and ".js" suffix from paths', function() {
      expect(adapter.getModuleNameFromPath('/base/app/lib/include.js', System.baseURL)).toBe('lib/include');
    });

    it('Ignores non-.js extensions', function() {
      expect(adapter.getModuleNameFromPath('/base/app/lib/include.es6', System.baseURL)).toBe('lib/include.es6');
    });
  });

  describe('importTestSuites()', function() {

    it('Filters out the test suites from the map of file names, and imports them as modules', function() {
      var files = {
        '/base/app/lib/include.js': 1,
        '/base/app/src/thing.js': 1,
        '/base/app/src/thing.spec.js': 1
      };
      var testFileRegexp = adapter.createTestFileRegexp();
      var result = adapter.importTestSuites(System, files, testFileRegexp);
      expect(result).toEqual([1]);
      expect(System.import).toHaveBeenCalledWith('src/thing.spec');
    });
  });

  describe('updatebaseURL()', function() {

    it('Adds "/base" to the start of System.baseURL, after calling System.config()', function() {
      expect(adapter.updatebaseURL('/app/')).toBe('/base/app/');
    });

    it('Replaces "./" with "/base/"', function() {
      expect(adapter.updatebaseURL('./')).toBe('/base/');
      expect(adapter.updatebaseURL('./app/')).toBe('/base/app/');
    });
  });

  describe('run()', function() {

    it('Stops karma from loading automatically by changing karma.loaded to a noop', function() {
      karma.loaded = 123;
      adapter.run(karma, System, Promise);
      expect(typeof karma.loaded).toBe('function');
    });

    it('Passes in systemjs config to System.config(), if set', function() {
      karma.config.systemjs.config = 123;
      adapter.run(karma, System, Promise);
      expect(System.config).toHaveBeenCalledWith(123);
    });

    it('Does not call System.config() if no config set', function() {
      karma.config.systemjs.config = null;
      adapter.run(karma, System, Promise);
      expect(System.config).not.toHaveBeenCalled();
    });

    it('Adds "/base" to the start of System.baseURL, after calling System.config()', function() {
      System.config.and.callFake(function(config) {
        System.baseURL = config.baseURL;
      });
      karma.config.systemjs.config = {baseURL: '/app/'};
      adapter.run(karma, System, Promise);
      expect(System.baseURL).toBe('/base/app/');
    });

    it('Imports karma.files that match as test suites', function() {
      karma.config.systemjs.testFileSuffix = '.test.js';
      karma.files = {a: true, b: true, c: true};
      spyOn(adapter, 'createTestFileRegexp').and.returnValue(123);
      spyOn(adapter, 'importTestSuites').and.returnValue(456);
      adapter.run(karma, System, Promise);
      expect(adapter.createTestFileRegexp).toHaveBeenCalledWith(karma.config.systemjs.testFileSuffix);
      expect(adapter.importTestSuites).toHaveBeenCalledWith(System, karma.files, 123);
      expect(Promise.all).toHaveBeenCalledWith(456);
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