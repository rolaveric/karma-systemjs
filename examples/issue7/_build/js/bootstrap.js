System.import('modules/app.module').then(
  function (a) {
    console.log('Just imported "app.module" - would now bootstrap application');
  },
  function (a, b, c) {
    console.out('\na:', a, '\nb:', b, '\nc:', c);
  }
);