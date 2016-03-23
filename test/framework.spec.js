'use strict';
var initSystemJs = require('../lib/framework.js');
var _ = require('lodash');
var Minimatch = require('minimatch').Minimatch;
var path = require('path');

describe('initSystemJs', function() {
  var config;
  beforeEach(function() {
    config = {
      files: [],
      client: {},
      systemjs: {
        config: {
          paths: {
            systemjs: 'js/system.src.js',
            traceur: 'js/traceur.js',
            babel: 'js/babel.js',
            'es6-module-loader': 'js/es6-module-loader.src.js',
            'system-polyfills': 'js/system-polyfills.js',
            'phantomjs-polyfill': 'js/phantomjs-polyfill.js'
          }
        }
      }
    };
  });

  it('Adds file patterns for traceur, es6-module-loader, SystemJS, and the SystemJS polyfills', function() {
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/[\/\\]traceur\.js$/);
    expect(config.files[1].pattern).toMatch(/[\/\\]es6-module-loader\.src\.js$/);
    expect(config.files[2].pattern).toMatch(/[\/\\]system-polyfills\.js$/);
    expect(config.files[3].pattern).toMatch(/[\/\\]system\.src\.js$/);
  });

  it('Adds Babel instead of Traceur if the transpiler option is set', function() {
    config.systemjs.config.transpiler = 'babel';
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/[\/\\]babel\.js$/);
    expect(config.files[1].pattern).toMatch(/[\/\\]es6-module-loader\.src\.js$/);
    expect(config.files[2].pattern).toMatch(/[\/\\]system-polyfills\.js$/);
    expect(config.files[3].pattern).toMatch(/[\/\\]system\.src\.js$/);
  });

  it('Adds Typescript instead of Traceur if the transpiler option is set', function() {
    config.systemjs.config.transpiler = 'typescript';
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/[\/\\]typescript[\/\\].*?[\/\\]typescript\.js$/);
    expect(config.files[1].pattern).toMatch(/[\/\\]es6-module-loader\.src\.js$/);
    expect(config.files[2].pattern).toMatch(/[\/\\]system-polyfills\.js$/);
    expect(config.files[3].pattern).toMatch(/[\/\\]system\.src\.js$/);
  });

  it('Omits adding a file pattern for a transpiler if the transpiler option is set to null', function() {
    config.systemjs.config.transpiler = null;
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/[\/\\]es6-module-loader\.src\.js$/);
    expect(config.files[1].pattern).toMatch(/[\/\\]system-polyfills\.js$/);
    expect(config.files[2].pattern).toMatch(/[\/\\]system\.src\.js$/);
  });

  it('Omits adding a file pattern for a transpiler if the transpiler option is set to false', function() {
    config.systemjs.config.transpiler = false;
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/[\/\\]es6-module-loader\.src\.js$/);
    expect(config.files[1].pattern).toMatch(/[\/\\]system-polyfills\.js$/);
    expect(config.files[2].pattern).toMatch(/[\/\\]system\.src\.js$/);
  });

  it('Omits adding a file pattern for a transpiler if the transpiler option is set to "none"', function() {
    config.systemjs.config.transpiler = 'none';
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/[\/\\]es6-module-loader\.src\.js$/);
    expect(config.files[1].pattern).toMatch(/[\/\\]system-polyfills\.js$/);
    expect(config.files[2].pattern).toMatch(/[\/\\]system\.src\.js$/);
  });

  it('Uses paths provided by the SystemJS config when possible', function() {
    config.systemjs.config = {
      transpiler: 'babel',
      paths: {
        'babel': 'myBabel.js',
        'es6-module-loader': 'myModuleLoader.js',
        'system-polyfills': 'myPolyfills.js',
        'systemjs': 'mySystem.js'
      }
    };
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/myBabel\.js$/);
    expect(config.files[1].pattern).toMatch(/myModuleLoader\.js$/);
    expect(config.files[2].pattern).toMatch(/myPolyfills\.js$/);
    expect(config.files[3].pattern).toMatch(/mySystem\.js$/);
  });

  it('Overrides paths provided by the external SystemJS config file with systemjs.config.paths', function() {
    config.systemjs.config = {
      paths: {
        'module-a': 'to-patched-version.js'
      }
    };
    config.systemjs.configFile = 'test/system.conf.js';
    initSystemJs(config);

    expect(JSON.parse(config.client.systemjs.config).paths['module-a']).toEqual('to-patched-version.js');
  });

  it('Does NOT adds file pattern for the SystemJS config file - only gets read and passed to adapter', function() {
    config.systemjs.configFile = 'test/system.conf.js';
    initSystemJs(config);
    var matchingFile = _.find(config.files, function(file) {
      return /[\/\\]system\.conf\.js$/.test(file.pattern);
    });
    expect(matchingFile).toBeUndefined();
  });

  it('Loads the external SystemJS config file and merges it with the karma config', function() {
    config.systemjs.configFile = 'test/system.conf.js';
    initSystemJs(config);
    expect(JSON.parse(config.client.systemjs.config).transpiler).toBe('babel');
    expect(JSON.parse(config.client.systemjs.config).meta['module-b'].deps).toEqual(['fromConfigFile']);
  });

  it('Overrides array values rather than merging', function() {
    config.systemjs.configFile = 'test/system.conf.js';
    config.systemjs.config = {meta: {'module-b': {deps: ['fromKarmaConfig']}}};
    initSystemJs(config);
    expect(JSON.parse(config.client.systemjs.config).transpiler).toBe('babel');
    expect(JSON.parse(config.client.systemjs.config).meta['module-b'].deps).toEqual(['fromKarmaConfig']);
  });

  it('Adds config.systemjs.serveFiles to config.files as served but not included file patterns', function() {
    config.systemjs.serveFiles = ['a.js', 'b.js'];
    initSystemJs(config);
    expect(config.files[4]).toEqual({pattern: './a.js', included: false, served: true, watched: true});
    expect(config.files[5]).toEqual({pattern: './b.js', included: false, served: true, watched: true});
  });

  it('Adds the basePath to the start of each systemjs.files', function() {
    config.basePath = 'app';
    config.files = [];
    config.systemjs.serveFiles = ['a.js', 'b.js'];
    initSystemJs(config);
    expect(config.files[4].pattern).toMatch('app/a.js');
  });

  it('Adds the plugin adapter to the end of the files list', function() {
    initSystemJs(config);
    expect(config.files[config.files.length - 1].pattern).toMatch(/adapter\.js/);
  });

  it('Sets patterns already added to config.files as {included: false}', function() {
    config.files = [
      {pattern: 'a.js', included: true},
      {pattern: 'b.js', included: true}
    ];
    config.systemjs.configFile = 'test/system.conf.js';
    config.systemjs.serveFiles = ['c.js', 'd.js'];
    initSystemJs(config);
    expect(config.files[4].included).toBe(false);
    expect(config.files[5].included).toBe(false);
    expect(config.files[6].pattern).toEqual('./c.js');
  });

  it('Sets patterns added to config.systemjs.includeFiles as {included: true}', function() {
    config.files = [
      {pattern: 'a.js', included: true},
      {pattern: 'b.js', included: true}
    ];
    config.systemjs.configFile = 'test/system.conf.js';
    config.systemjs.serveFiles = ['c.js', 'd.js'];
    config.systemjs.includeFiles = [
      'e.js',
      {
        pattern: './f.js',
        included: true,
        served: true,
        watched: true
      }
    ];
    initSystemJs(config);
    expect(config.files).toEqual([
      {
        pattern: './e.js',
        included: true,
        served: true,
        watched: false
      },
      {
        pattern: './f.js',
        included: true,
        served: true,
        watched: true
      },
      {
        pattern: path.join('js', 'babel.js'),
        included: false,
        served: true,
        watched: false
      },
      {
        pattern: path.join('js', 'es6-module-loader.src.js'),
        included: true,
        served: true,
        watched: false
      },
      {
        pattern: path.join('js', 'system-polyfills.js'),
        included: true,
        served: true,
        watched: false
      },
      {
        pattern: path.join('js', 'system.src.js'),
        included: true,
        served: true,
        watched: false
      },
      {
        pattern: 'a.js',
        included: false
      },
      {
        pattern: 'b.js',
        included: false
      },
      {
        pattern: './c.js',
        included: false,
        served: true,
        watched: true
      },
      {
        pattern: './d.js',
        included: false,
        served: true,
        watched: true
      },
      {
        pattern: path.join(process.cwd(), 'lib/adapter.js'),
        included: true,
        served: true,
        watched: false
      }
    ]);
  });

  it('override baseURL in config', function() {
    config.systemjs.config = {baseURL: 'abc'};
    config.systemjs.configFile = 'test/systemWithBaseURL.conf.js';
    initSystemJs(config);
    expect(config.systemjs.config.baseURL).toEqual('abc');
  });

  it('Relocates absolute paths in config', function() {
    config.systemjs.configFile = 'test/systemWithAbsolutePath.conf.js';
    initSystemJs(config);
    expect(config.systemjs.config.map.jquery).toEqual('/base/thirdparty/jquery.js');
    expect(config.systemjs.config.map['module-a']).toEqual('to-actual-src.js');
  });

  it('Encodes SystemJS config as a JSON string', function() {
    config.systemjs.config = {baseURL: 'abc'};
    initSystemJs(config);
    expect(config.client.systemjs.config)
      .toBe('{"baseURL":"abc"}');
  });

  it('Attaches importPatterns to client.systemjs', function() {
    config.files = [{pattern: '/app/**/*.js', included: true}];
    initSystemJs(config);
    var expected = (new Minimatch('/base/app/**/*.js')).makeRe().toString();
    expect(config.client.systemjs.importPatterns)
      .toEqual([expected.substring(1, expected.length - 1)]);
  });

  it('Creates importPatterns for absolute paths', function() {
    config.basePath = '/test';
    config.files = [{pattern: '/app/**/*.js', included: true}];
    initSystemJs(config);
    var expected = (new Minimatch('/absolute/app/**/*.js')).makeRe().toString();
    expect(config.client.systemjs.importPatterns)
      .toEqual([expected.substring(1, expected.length - 1)]);
  });
});
