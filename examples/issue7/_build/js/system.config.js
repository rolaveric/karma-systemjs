System.config({
  baseURL: '/js/',
  paths: {
    'angular':          '/js/lib/angular.js',
    'angular-animate':  '/js/lib/angular-animate.js',
    'angular-aria':     '/js/lib/angular-aria.js',
    'angular-cookies':  '/js/lib/angular-cookies.js',
    'angular-material': '/js/lib/angular-material.js',
    'angular-messages': '/js/lib/angular-messages.js',
    'angular-mocks':    '/js/lib/angular-mocks.js',
    'angular-resource': '/js/lib/angular-resource.js',
    'angular-storage':  '/js/lib/angular-storage.js',
    'angular-ui-router':'/js/lib/angular-ui-router.js',
    'statehelper':      '/js/lib/statehelper.js'
  },
  meta: {
    'angular': {format: 'global', exports: 'angular'},
    'angular-ui-router': {format: 'global', deps: ['angular']},
    'statehelper': {format: 'global', deps: ['angular', 'angular-ui-router']}
  }
});