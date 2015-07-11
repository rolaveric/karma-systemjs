'use strict';
module.exports = function(config) {
  config.set({
    plugins: ['karma-firefox-launcher', 'karma-phantomjs-launcher', 'karma-jasmine'],

    frameworks: ['jasmine'],

    files: ['lib/adapter.js', 'test/adapter.spec.js'],

    browsers: ['Firefox', 'PhantomJS'],

    autoWatch: true
  });
};
