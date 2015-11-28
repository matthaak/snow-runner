var Tail = require('node.tail');
var tailFile = new Tail(process.argv[2], {follow: true});
tailFile.on('line', console.log);
tailFile.on('error', console.error);
