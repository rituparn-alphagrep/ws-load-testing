const io = require('socket.io');
const http = require('http');
const assert = require('assert');
const util = require('util');
const express = require('express');
const path = require('path');
const uniqid = require('uniqid');
const ejs = require('ejs')
const MAX_CLIENTS = 100;
const MAX_TOPICS_PER_CLIENT = 10;
const MIN_MESSAGES_PER_INTERVAL = 250;
const MAX_MESSAGES_PER_INTERVAL = 300;
const MAX_BUCKET_COUNT = 10;
const AVG_SIZE_BUFFER = 500; // size in bytes
const HTTP_PORT = 9000;
const WS_PORT = 9001;

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/',(req,res) => {
	res.render('index',{
		name : 'socketio benchmark'
	});
});
app.use('/scripts', express.static(path.join(__dirname, '../node_modules')));

var httpServer = http.Server(app);

httpServer.listen(HTTP_PORT,()=>{
	util.log('Server listening on port - ',HTTP_PORT);
});



/***************** DataPublisher ***********************/
class DataPublisher {

    constructor(options){
        this.isHandFulTopic = options.isHandFulTopic;
        this._bucket = new Array(MAX_CLIENTS).fill(0);
        this._currBucket = 0;
    }

    init(){
        this._topics = new Array(MAX_CLIENTS);
        for ( let i = 0 ; i < MAX_CLIENTS ; i++ )
            this._topics[i] = `Topic - ${uniqid()}`;

        this._publishIntervalRef = setInterval(this.publish.bind(this), 1000);
    }

    destroy(){
        clearInterval(this._publishIntervalRef);
    }

    matchClientToRooms(ws, cb) {

        if ( this.isHandFulTopic ) {
        
            if ( this._bucket[this._currBucket] < MAX_BUCKET_COUNT ){
                this._bucket[this._currBucket]++;
                console.log(`Adding client ${ws.id} in the subscription list of ${this._topics[this._currBucket]}`)
                ws.join(this._topics[this._currBucket]);
            }
            else if ( this._currBucket < MAX_CLIENTS ) {
                this._currBucket++;
                this._bucket[this._currBucket]++;
                console.log(`Adding client ${ws.id} in the subscription list of ${this._topics[this._currBucket]}`)
                ws.join(this._topics[this._currBucket]);
            }
            else{
                console.log('no space for any more clients in this test.');
            }

            ws.topics = [this._topics[this._currBucket]];
        
        }
        else {
        
            let topicsCountToSubscribe = getRandomInt(1, MAX_TOPICS_PER_CLIENT);
            let topics = [];

            for ( let  i = 0 ; i < topicsCountToSubscribe ; i++ ) {
            
                let randomTopicIndex = getRandomInt(0, MAX_CLIENTS - 1)
                let topic = this._topics[randomTopicIndex];
            
                console.log(`Adding client ${ws.id} in the subscription list of ${topic}`)
                ws.join(topic);
                topics.push(topic);
            }

            ws.topics = topics;
        
        }
    }

    unMatchClientToRooms(ws) {

        if ( ws.topics ) {
            for ( let i = 0 ; i < ws.topics.length ; i++ ) {
                let topic = ws.topics[i];
                if ( !ws.closed )
                    ws.leave(topic);
            }
        }
    }

    generateMessage(){
        let msgbuf = Buffer.alloc(AVG_SIZE_BUFFER);
        
        let dateObj = new Date();
        let originTime = dateObj.getTime();
        let str = dateObj.toLocaleTimeString();

        let hi = ~~(originTime / 0x0100000000);
        let lo = originTime % 0x0100000000;

        msgbuf.writeUInt32LE(hi,0);
        msgbuf.writeUInt32LE(lo, 4);
        msgbuf.writeUInt8(str.length, 9);
        msgbuf.write(str,10);

        assert(msgbuf.length == AVG_SIZE_BUFFER);
        
        return msgbuf
    }

    publish(){

        const messagesCount = getRandomInt(MIN_MESSAGES_PER_INTERVAL, MAX_MESSAGES_PER_INTERVAL);
        util.log(`Publishing ${messagesCount} messages`);
        
        if ( !this.isHandFulTopic ) {
            
            for ( let i = 0 ; i < messagesCount ; i++ ) {
                
                let messageBuffer = this.generateMessage();
                let topicCountToPublishInto = getRandomInt(1, MAX_CLIENTS);
                let cnt = 0,
                    topicset = {};
                
                while ( cnt < topicCountToPublishInto ) {
                    
                    let topicIndex = getRandomInt(1, MAX_CLIENTS);
                    let topic = this._topics[topicIndex];

                    if ( topicset[topic] )
                        continue;

                    socketIOServer.to(topic).compress(true).emit('message', messageBuffer);

                    topicset[topic] = true;
                    cnt++;
                }
            }

        }
        else {

            for ( let i = 0 ; i < messagesCount ; i++ ) {

                let messageBuffer = this.generateMessage();
                for ( let j = 0 ; j < MAX_BUCKET_COUNT ; j++ ) {
                    let topic = this._topics[j];
		            socketIOServer.to(topic).compress(true).emit('message', messageBuffer)
                }          
            }

        }
    }

}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}



const options = {
	WebSocketPort : WS_PORT,
	cors : {
		origin: `http://10.40.1.15/${HTTP_PORT}`,
		methods: ["GET", "POST"]
	},
	perMessageDeflate : true,
	httpCompression : true,
	pingTimeout : 60000
};

const namespace = {
    publisher : null
};

namespace.publisher = new DataPublisher({
    isHandFulTopic : false
});

const socketIOServer = io(options.WebSocketPort, options);

socketIOServer.on('connection', ( socket ) => {
    
    namespace.publisher.matchClientToRooms(socket);

    socket.on('close',()=>{
        namespace.publisher.unMatchClientToRooms(socket);
    });


});
namespace.publisher.init();
