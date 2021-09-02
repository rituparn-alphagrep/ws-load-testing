const io = require('socket.io-client');
const Metric = require('../metric');
const 
	HOST = 'localhost',
	PORT = 9001,
	MAX_CLIENTS = 98;

const metric = new Metric('Lag computation for uws');

function setupListeners(socket) {

	socket.on('connect', function open() {
	  console.log('connected');
	});


	socket.on('close', function close() {
	    console.log('connection closed.');
		setTimeout( () => {
			let newsocket =  new WebSocket(url);
			setuplistener(newsocket);
			socket = null;
		}, 5000);
	});


	socket.on('message', function incoming(data) {
		let arrivalTime = new Date().getTime();
		
		let hi = data.readUInt32LE(0);
		let lo = data.readUInt32LE(4);

		let originTime = (hi * 0x0100000000)  + lo;
		let lag = arrivalTime - originTime;
		metric.addSample(lag);
		if ( metric.getSampleCount() % 10000 == 0 ) {
			metric.computeAvg();
			metric.computeMedian();
			metric.computePercentiles();
			metric.printResult();
		}
	});
}

function createWsClient(){
	let socket = io(`ws://${HOST}:${PORT}`,{ transports : [ 'websocket' ]});
	setupListeners(socket);
}


for ( let i = 0 ; i < MAX_CLIENTS ; i++ )
	createWsClient();
