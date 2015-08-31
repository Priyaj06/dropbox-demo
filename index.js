let fs  = require('fs')
let path = require('path')
let express = require('express')
let morgan = require('morgan')
let nodeify = require('bluebird-nodeify')
let mime = require('mime-types')
let rimraf  = require('rimraf')
let mkdirp = require('mkdirp')
let chokidar = require('chokidar')
let archiver = require('archiver')
let argv = require('yargs')
    .default('dir', process.cwd())
        .argv

require('songbird')

const NODE_ENV = process.env.NODE_ENV
const PORT = process.env.PORT || 8000
const ROOT_DIR = path.resolve(argv.dir)

let app = express()

if (NODE_ENV === 'development') {
	app.use(morgan('dev'))
}

app.listen(PORT, ()=> console.log(`Listening @ http://127.0.0.1:8000`))

app.get('*', setFilePath, sendHeaders, (req, res) => {
	if(res.body) {
		let archive = archiver('zip')
	    archive.pipe(res);
	    archive.bulk([
	        { expand: true, cwd: 'source', src: ['**'], dest: 'source'}
	    ])
	    archive.finalize()
		return
	}
	
	fs.createReadStream(req.filePath).pipe(res)
})

app.head('*', setFilePath, sendHeaders, (req, res) => res.end())

app.delete('*', setFilePath, (req, res, next) => {
	async() => {
		if(!req.stat) return res.send('400', 'Invalid request')
		if(req.stat && req.stat.isDirectory()) {
			await rimraf.promise(req.filePath)
		} else {
			await fs.promise.unlink(req.filePath)
		}
		res.end()
	}().catch(next)
})

app.put('*', setFilePath, setDirDetails, (req, res, next) => {
	async() => {
		if(req.stat) return res.send(405, 'File exists')
		await mkdirp.promise(req.dirPath)

		if (!req.isDir) {
			req.pipe(fs.createWriteStream(req.filePath))
		}
		res.end()
	}().catch(next)
})

app.post('*', setFilePath, setDirDetails, (req, res, next) => {
	async() => {
		if(!req.stat) return res.send(405, 'File does not exist')
		if(req.isDir) return res.send(405, 'Path is a directory')
		
		await fs.promise.truncate(req.filePath, 0)
		req.pipe(fs.createWriteStream(req.filePath))
		
		res.end()
	}().catch(next)
})

function setDirDetails(req, res, next) {	
	let filePath = req.filePath
	let endWithSlash = filePath.charAt(filePath.length-1) === path.sep
	let hasExt = path.extname(filePath) !== ''
	req.isDir = endWithSlash || !hasExt
	req.dirPath = req.isDir ? filePath : path.dirname(filePath)
	next()
}

function setFilePath(req, res, next) {
	req.filePath = path.resolve(path.join(ROOT_DIR, req.url))
	if(req.filePath.indexOf(ROOT_DIR) !== 0) {
		res.send(400, 'Invalid path')
		return
	}
	fs.promise.stat(req.filePath)
		.then(stat => req.stat = stat, () => req.stat = null)
		.nodeify(next)
}

function sendHeaders(req, res, next) {
	nodeify(async () => {
		if(req.stat.isDirectory()) {
			let files = await fs.promise.readdir(req.filePath)
			res.body = JSON.stringify(files)
			res.setHeader('Content-Length', res.body.length)
			res.setHeader('Content-Type', 'application/json')
			return
		}

		res.setHeader('Content-Length', req.stat.size)
		let contentType = mime.contentType(path.extname(req.filePath))
		res.setHeader('Content-Type', contentType)
	}(), next)
}


var clientPort = 8001,
  jot = require('json-over-tcp');

var server = jot.createServer(clientPort);
server.on('listening', createConnection);
server.on('connection', newConnectionHandler);

// Triggered whenever something connects to the server 
function newConnectionHandler(socket){
  // Whenever a connection sends us an object... 
  socket.on('data', function(data){
		console.log(data)
  });
};
 
// Creates one connection to the server when the server starts listening 
function createConnection(){
  // Start a connection to the server 
  var socket = jot.connect(clientPort, function(){
    // One-liner for current directory, ignores .dotfiles 
	chokidar.watch('.', {ignored: /[\/\\]\./})
	.on('all', (event, path) => {
	    console.log('Event: ' +event + ', Path: '+ path)
	})
  });

}
 
// Start listening 
server.listen(clientPort);