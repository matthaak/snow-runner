var Tail = require('node.tail');
var tailFile = new Tail(process.argv[2], {follow: true});
var ignoredOnce = false;

// Due to an issue with node.tail erroring on empty files, the Windows
// batch file that uses tailf.js (snow-runner-console.bat) will create
// a file with a single space in it to use for piping script and 
// tailf.js will ignore that first line

tailFile.on('line', function(ln) {
   if (!ignoredOnce) {
      ignoredOnce = true;
   } else {
     console.log(ln);
   }
});

tailFile.on('error', console.error);
