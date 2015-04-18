'use strict';
var initSystemJs = require('../lib/index.js')['framework:systemjs'][1];

describe('initSystemJs', function() {
  var config;
  beforeEach(function() {
    config = {
      files: [],
      client: {},
      systemjs: {}
    };
  });

  it('Adds file patterns for traceur, es6-module-loader, and SystemJS', function() {
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/\/traceur\.js$/);
    expect(config.files[1].pattern).toMatch(/\/es6-module-loader\.src\.js$/);
    expect(config.files[2].pattern).toMatch(/\/system\.src\.js$/);
  });

  it('Adds Babel instead of Traceur if the transpiler option is set', function() {
    config.systemjs.config = {transpiler: 'babel'};
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/\/babel\/.*?\/browser\.js$/);
    expect(config.files[1].pattern).toMatch(/\/es6-module-loader\.src\.js$/);
    expect(config.files[2].pattern).toMatch(/\/system\.src\.js$/);
  });

  it('Omits adding a file pattern for a transpiler if the transpiler option is set to null', function() {
    config.systemjs.config = {transpiler: null};
    initSystemJs(config);
    expect(config.files[0].pattern).toMatch(/\/es6-module-loader\.src\.js$/);
    expect(config.files[1].pattern).toMatch(/\/system\.src\.js$/);
  });

  it('Adds file pattern for the SystemJS config file, after the SystemJS libraries', function() {
    config.systemjs.configFile = 'test/system.conf.js';
    initSystemJs(config);
    expect(config.files[3].pattern).toMatch(/\/system\.conf\.js$/);
  });

  it('Loads the external SystemJS config file and merges it with the karma config', function() {
    config.systemjs.configFile = 'test/system.conf.js';
    initSystemJs(config);
    expect(config.client.systemjs.config.transpiler).toBe('babel');
  });

  it('Adds config.systemjs.files to config.files as served but not included file patterns', function() {
    config.systemjs.files = ['a.js', 'b.js'];
    initSystemJs(config);
    expect(config.files[3]).toEqual({pattern: './a.js', included: false, served: true, watched: true});
    expect(config.files[4]).toEqual({pattern: './b.js', included: false, served: true, watched: true});
  });

  it('Adds the basePath to the start of each systemjs.files', function() {
    config.basePath = 'app';
    config.systemjs.files = ['a.js', 'b.js'];
    initSystemJs(config);
    expect(config.files[3].pattern).toMatch('app/a.js');
  });

  it('Adds the plugin adapter to the end of the files list', function() {
    initSystemJs(config);
    expect(config.files[config.files.length - 1].pattern).toMatch(/adapter\.js/);
  });

  it('Preserves patterns already addded to config.files', function() {
    config.files = [
      'a.js',
      'b.js'
    ];
    config.systemjs.configFile = 'test/system.conf.js';
    config.systemjs.files = ['c.js', 'd.js'];
    initSystemJs(config);
    expect(config.files[4]).toEqual('a.js');
    expect(config.files[5]).toEqual('b.js');
    expect(config.files[6].pattern).toEqual('./c.js');
  });

  it('Attaches systemjs.testFileSuffix and systemjs.config to client.systemjs', function() {
    config.systemjs.config = 123;
    config.systemjs.testFileSuffix = '.test.js';
    initSystemJs(config);
    expect(config.client.systemjs).toEqual({
      testFileSuffix: '.test.js',
      config: 123
    });
  });
});
