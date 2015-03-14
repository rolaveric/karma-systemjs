// Mock AMD module
define(['./greeting/GreetingController'], function() {
  var moduleName = 'home/home.module';
  console.log('Module from "_build/js/modules/' + moduleName + '.js" loaded');
  return moduleName;
});