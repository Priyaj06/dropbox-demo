let net = require('net')
let JsonSocket = require('json-socket');
let fs = require('fs')
let path = require('path')
let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let request = require('request')

const ROOT_DIR = path.resolve(process.cwd()) + '/server'
const HTTP_SERVER = 'http://127.0.0.1:8000'

var port = 8001; 
var host = '127.0.0.1';
var socket = new JsonSocket(new net.Socket()); 
socket.connect(port, host);
socket.on('connect', function() { 

    socket.on('message', function(payload) {
        console.log(payload)
        let action = payload.action
        let p = payload.path
        let fileName = 'client/' + path.relative(ROOT_DIR, p);
        console.log('File name >>>>> ' + fileName);
        switch (action) {
            case 'add':
                let url = HTTP_SERVER + p
                request(url).pipe(fs.createWriteStream(fileName))
                break;
            case 'addDir':
                mkdirp(fileName)
                break;
            case 'unlink':
                fs.unlink(fileName)
                break;
            case 'unlinkDir':
                fs.rmdir(fileName)
                break;
        }
    });
});