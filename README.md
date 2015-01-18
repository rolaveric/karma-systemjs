# karma-systemjs    [![Build Status](https://travis-ci.org/rolaveric/karma-systemjs.png?branch=master)](https://travis-ci.org/rolaveric/karma-systemjs)
[Karma](http://karma-runner.github.io/) plugin for using [SystemJS](https://github.com/systemjs/systemjs) as a module loader.

# Installation

`npm install rolaveric/karma-systemjs`

# Karma Configuration

Add karma-systemjs to your list of plugins:

`plugins: ['karma-systemjs', ...]`

Add karma-systemjs to your list of frameworks:

`frameworks: ['systemjs', ...]`

Add systemjs configuration:

```js
systemjs: {
	// Path to your SystemJS configuration file
	configFile: 'app/system.conf.js',

	// File patterns for your application code, dependencies, and test suites
	files: [
		'app/bower_components/angular/angular.js',
		'app/bower_components/angular-route/angular-route.js',
		'app/bower_components/angular-mocks/angular-mocks.js',
		'app/*/**/*.js'
	],

	// SystemJS paths configuration specifically for tests
	paths: {
		'angular-mocks': 'bower_components/angular-mocks/angular-mocks.js'
	},

	// Specify the suffix used for test suite file names - default to '_test.js'
	testFileSuffix: '.spec.js'
}
```

Adding your file patterns under `systemjs.files` is a convenience so you don't need to specify that each file is 'served' but not 'included'.

```js
// These end up meaning the same thing
files: [
	{pattern: 'app/**/*.js, served: true, included: false, watched: true}
],

systemjs: {
	files: [
		'app/**/*.js'
	]
}
```