# karma-systemjs    [![Build Status](https://travis-ci.org/rolaveric/karma-systemjs.png?branch=master)](https://travis-ci.org/rolaveric/karma-systemjs)
[Karma](http://karma-runner.github.io/) plugin for using [SystemJS](https://github.com/systemjs/systemjs) as a module loader.

# Installation

`npm install karma-systemjs`

# Karma Configuration

Add karma-systemjs to your list of plugins:

`plugins: ['karma-systemjs', ...]`

Add systemjs to your list of frameworks:

`frameworks: ['systemjs', ...]`

Add SystemJS configuration:

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

	// SystemJS configuration specifically for tests, added after your config file.
	// Good for adding test libraries and mock modules
	config: {
		paths: {
			'angular-mocks': 'bower_components/angular-mocks/angular-mocks.js'
		}
	},

	// Specify the suffix used for test suite file names.  Defaults to .test.js, .spec.js, _test.js, and _spec.js
	testFileSuffix: '.spec.js'
}
```

Adding file patterns under `systemjs.files` saves you from specifying each file pattern as 'served' but not 'included'.

```js
// These are equivalent
files: [
	{pattern: 'app/**/*.js', served: true, included: false, watched: true}
],

systemjs: {
	files: [
		'app/**/*.js'
	]
}
```

# Examples

* [angular-seed](https://github.com/rolaveric/angular-seed/tree/es6)