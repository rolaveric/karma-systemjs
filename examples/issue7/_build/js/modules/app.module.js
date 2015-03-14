// Mock AMD module
define(['./home/home.module', './common/common.module'], function() {
  var moduleName = 'app.module';
  console.log('Module from "_build/js/modules/' + moduleName + '.js" loaded');
  return moduleName;
});