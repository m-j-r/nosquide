var http = require('http');
var net = require('net');
var util = require('util');
var url = require('url');

process.on('uncaughtException', function (error) {
    console.log('Uncaught Exception ' + error);
});

var settings = {
    boundPort : 8124,
    boundHttpsPort : 8125,
    boundAddress : '127.0.0.1',
    useProxy : false,
    proxyAddress : 'mp2rs000.eskom.co.za',
    proxyPort : 8080,
    modules : ['./modules/logger.js', './testing/123', './tested.js']
};

var moduleInstances = [];

var requestmodule;
for (requestmodule in settings.modules) {
    try {
        if (!require(settings.modules[requestmodule]).handleRequest) {
            console.log('Module ' + settings.modules[requestmodule] + ' does not have function handleRequest. Module ignored.');
        }
        else moduleInstances.push(require(settings.modules[requestmodule]));
    }
    catch (exception) {
        console.log('Exception occurred trying to load module. Module ignored: ' + settings.modules[requestmodule] + '\n\r' + exception); 
    }
}

function handleHTTPRequest(command, href, version, headers, stream) {
    
    var URL = url.parse(href);
    var options = {
        host: headers.HOST || URL.hostname,
        port: URL.port || 80,
        path: URL.pathname + (URL.search ? URL.search:'') + (URL.hash ? URL.hash:''),
        method: command,
        headers: headers
    };
    //need to remove - just for debug
    console.log(util.inspect(options));

    try {
        var req = http.request(options, function (response) {
            stream.write('HTTP/' + response.httpVersion + ' ' + response.statusCode);
            var header;
            for (header in response.headers) {
                stream.write(header + ': ' + response.headers[header] + '\r\n');
            }
            stream.write('\r\n');
            response.pipe(stream);
        });
        req.end();
    }
    catch (exception) {
        console.log('Failed to make connection: need to now gracefully tell client');
        stream.end();
    }
}

function handleHTTPSRequest(command, href, version, headers, stream) {
    stream.write('HTTP/' + version + ' 404\r\n\r\n');
    stream.end();
}

var serverNet = net.createServer(function (stream) {
 
    stream.on('data', function (data) {
        
        var headers = data.toString().split(/\n\r|\n|\r/);

        //get the first 'command' line, and get it's individual parts
        var parameters = headers.shift().split(" ");

        var command = parameters[0];
        var href = parameters[1];
        var version = parameters[2];

        var requestHeaders = {};

        while (headers.length) {
            var header = headers.shift().split(': ');
            if (header[0] && header.length > 0 && header[0] !== '') {
                requestHeaders[header[0].toUpperCase()] = header[1];
            }
        }

        var moduleInstance;
        for (moduleInstance in moduleInstances) {
            try {
                moduleInstances[moduleInstance].handleRequest(stream.remoteAddress, stream.remotePort, command, href, version, requestHeaders, stream);
            }
            catch (exception) {
                console.log('Module did not handle request properly, unloading: ' + exception + '\n\r' + moduleInstances[moduleInstance]);
                moduleInstances.splice(moduleInstance, 1);
            }
        }

        switch (command) {

        case 'GET': 
            handleHTTPRequest(command, href, version, requestHeaders, stream);
            break;
        case 'PUT': 
            handleHTTPRequest(command, href, version, requestHeaders, stream);
            break;
        case 'CONNECT': 
            handleHTTPSRequest(command, href, version, requestHeaders, stream);
            break;
        default : 
            console.log('none');
        }
    });
 
}).listen(settings.boundPort, settings.boundAddress);

console.log('running on port ' + settings.boundPort);
