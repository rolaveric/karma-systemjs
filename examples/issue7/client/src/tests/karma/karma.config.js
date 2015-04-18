module.exports = function(config) {
  config.set({
    basePath: '../../../../',
    urlRoot: '',
    hostname: 'localhost',
    frameworks: ['systemjs', 'mocha', 'chai', 'chai-as-promised', 'sinon-chai'],
    plugins: [
      'karma-mocha',
      'karma-chai',
      'karma-chai-plugins',
      'karma-systemjs',
      //'karma-traceur-preprocessor',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-spec-reporter',
      'karma-junit-reporter',
      'karma-failed-reporter'
    ],
    systemjs: {
      configFile: '_build/js/system.config.js',
      files: [
        '_build/js/lib/*.js',
        '_build/js/modules/**/*.js',
        'client/src/app/**/*.spec.es6'
      ],
      config: {
        transpiler: 'traceur',
        paths: {
          'angular': '_build/js/lib/angular.min.js',
          'angular-animate': '_build/js/lib/angular-animate.min.js',
          'angular-messages': '_build/js/lib/angular-messages.min.js',
          'angular-aria': '_build/js/lib/angular-aria.min.js',
          'angular-resource': '_build/js/lib/angular-resource.min.js',
          'angular-cookies': '_build/js/lib/angular-cookies.min.js',
          'angular-storage': '_build/js/lib/angular-storage.min.js',
          'angular-material': '_build/js/lib/angular-material.min.js',
          'angular-mocks': '_build/js/lib/angular-mocks.js',
          'angular-ui-router': '_build/js/lib/angular-ui-router.min.js',
          'statehelper': '_build/js/lib/statehelper.min.js',
          '*.es6': '*.es6'
        },
        baseURL: '/'
      },
      testFileSuffix: '.spec.es6'
    },
    //preprocessors: {
    //  'client/src/app/**/*.spec.es6': ['traceur']  // pre-compile tests
    //},
    //traceurPreprocessor: {
    //  options: {
    //    modules: 'amd',
    //  },
    //},
    client: {
      mocha: {
        reporter: 'html',
        ui: 'bdd'
      }
    },
    reporters: ['junit', 'spec', 'failed'],
    reportSlowerThan: 1000,
    junitReporter: {
      outputFile: 'reports/unit-test-results.xml',
      suite: ''
    },
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: [
      'Chrome'
    ],
    captureTimeout: 10000,
    port: 9876,
    runnerPort: 9100,
    singleRun: true,
    background: false
  });
};

/*
 List of differences
 - Disabled traceur preprocessor - let systemjs do that
 - Changed 'client/src/app/...*Spec.es6' to  'client/src/app/...*.spec.es6'
 - Added {'*.es6': '*.es6'} to systemjs.config.paths
 */