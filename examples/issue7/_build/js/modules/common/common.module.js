// Mock AMD module
define(['./masterTemplate/MasterTemplateController'], function() {
  var moduleName = 'common/common.module';
  console.log('Module from "_build/js/modules/' + moduleName + '.js" loaded');
  return moduleName;
});