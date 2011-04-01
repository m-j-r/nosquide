var util=require('util');

exports.handleRequest = function(remoteAddress,remotePort,command,href,version,requestHeaders,stream){
   console.log(command + ' ' + href + ' ' + version + ' FROM: ' + remoteAddress + ':' + remotePort);
   console.log(util.inspect(requestHeaders));
   /*stream.on('data', function(chunk){
     console.log(chunk.toString());
   });*/
};
