// Mock AMD module
define(function() {
  var moduleName = 'home/greeting/GreetingController';
  console.log('Module from "_build/js/modules/' + moduleName + '.js" loaded');
  return moduleName;
});