const WebSocket = require('ws').WebSocket;
const Metric = require('../metric');
const 
	// HOST = '10.40.1.15',
	HOST = 'localhost',
	PORT = 9003,
	MAX_CLIENTS = 100;

const metric = new Metric('Lag computation for uws');

function setupListeners(socket) {

	socket.on('open', function open() {
		console.log('connected');
	});


	socket.on('close', function close() {
	    console.log('connection closed.');
		setTimeout( () => {
			let newsocket =  new WebSocket(`ws://${HOST}:${PORT}`);
			setupListeners(newsocket);
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
	let socket = new WebSocket(`ws://${HOST}:${PORT}`);
	setupListeners(socket);
}


for ( let i = 0 ; i < MAX_CLIENTS ; i++ )
	createWsClient();
