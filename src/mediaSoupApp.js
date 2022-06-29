import { init, createRouter, stopRouter } from './workers.js';
import { webRtcTransportOptions } from './config.js';

init(); // create workers
let transports = [];     // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = [];      // [ { socketId1, roomName1, producer, }, ... ]
let consumers = [];      // [ { socketId1, roomName1, consumer, }, ... ]
const peers = {};        // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
const rooms = {};        // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}

const createRoom = async (rooms, roomName, socketId) => {
    let router;
    let peers = [];

    if (rooms[roomName]) {
        router = rooms[roomName].router;
        peers = rooms[roomName].peers || [];
    } else {
        router = await createRouter();
    }

    rooms[roomName] = {
        router,
        peers: [...peers, socketId],
    };

    return router;
};

const userLeaveRoom = (roomName, socketId) => {
    if (rooms[roomName]) {
        rooms[roomName] = {
            router: rooms[roomName].router,
            peers: rooms[roomName].peers.filter(sId => sId !== socketId)
        };
        if (rooms[roomName].peers.length === 0) {
            stopRouter(rooms[roomName].router).then(() => {
                delete rooms[roomName];
            });
        }
    } else {
        console.error(`[mediaSoupApp/userLeave]: ${roomName} does not exist`);
    }
};

const removeClients = (array, socketId, type) => {
    array.forEach(client => {
        try {
            if (client.socketId === socketId) {
                client[type].close();
            }
        } catch (error) {
            console.error(`[mediaSoupApp/removeClients] error on close ${type}: ${socketId}`);
        }
    });
    array = array.filter(client => client.socketId !== socketId);
    return array;
};

const addTransport = (transport, roomName, consumer, socketId) => {
    transports = [
        ...transports,
        {
            socketId,
            transport,
            roomName,
            consumer
        }
    ];

    peers[socketId] = {
        ...peers[socketId],
        transports: [
            ...peers[socketId].transports,
            transport.id,
        ]
    };
};

const addProducer = (producer, roomName, socketId) => {
    producers = [
        ...producers,
        {
            socketId,
            producer,
            roomName
        }
    ];
    peers[socketId] = {
        ...peers[socketId],
        producers: [
            ...peers[socketId].producers,
            producer.id,
        ]
    };
};

const addConsumer = (consumer, roomName, socketId) => {
    consumers = [
        ...consumers,
        {
            socketId,
            consumer,
            roomName
        }
    ];
    peers[socketId] = {
        ...peers[socketId],
        consumers: [
            ...peers[socketId].consumers,
            consumer.id,
        ]
    };
};

const createWebRtcTransport = async (router) => {
    return new Promise(async (resolve, reject) => {
        try {
            const transport = await router.createWebRtcTransport(webRtcTransportOptions);
            transport.on('dtlsstatechange', dtlsState => {
                if (dtlsState === 'closed') {
                    transport.close();
                }
            });
            // transport.on('close', () => {
            //     console.log('transport closed');
            // });
            resolve(transport);
        } catch (error) {
            reject(error);
        }
    });
};

const getTransport = (socketId) => {
    const [producerTransport] = transports.filter(transport => transport.socketId === socketId && !transport.consumer);
    return producerTransport.transport;
};

const informConsumers = (roomName, socketId, id) => {
    producers.forEach(producerData => {
        if (producerData.socketId !== socketId && producerData.roomName === roomName) {
            const producerSocket = peers[producerData.socketId].socket;
            producerSocket.emit('new-producer', { producerId: id });
        }
    });
};

const mediaSoupApp = (socket) => {
    socket.emit('connection-success', {
        socketId: socket.id,
    });

    socket.on('disconnect', () => {
        // delete routes between clients and server
        consumers = removeClients(consumers, socket.id, 'consumer');
        producers = removeClients(producers, socket.id, 'producer');
        transports = removeClients(transports, socket.id, 'transport');
        if (peers[socket.id]) {
            const { roomName } = peers[socket.id];
            delete peers[socket.id];
            if (roomName) {
                userLeaveRoom(roomName, socket.id);
            }
        }
    });

    socket.on('joinRoom', async ({ roomName }, callback) => {
        const router = await createRoom(rooms, roomName, socket.id)
        peers[socket.id] = {
            socket,
            roomName,
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: {
                name: ''
            }
        };
        const rtpCapabilities = router.rtpCapabilities;
        callback({ rtpCapabilities });
    });

    socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
        if (peers[socket.id]) {
            const roomName = peers[socket.id].roomName;
            const router = rooms[roomName].router;
            createWebRtcTransport(router).then(transport => {
                callback({
                    params: {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    }
                });
                addTransport(transport, roomName, consumer, socket.id);
            },
            error => {
                console.error('[mediaSoupApp/createWebRtcTransport]');
                console.error(error);
            });
        } else {
            console.error(`[mediaSoupApp/createWebRtcTransport]: fail create transport, ${socket.id}} does not exist`);
        }
    });

    socket.on('getProducers', callback => {
        if (peers[socket.id]) {
            const { roomName } = peers[socket.id];
            let producerList = [];
            producers.forEach(producerData => {
                if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
                    producerList = [...producerList, producerData.producer.id];
                }
            })
            callback(producerList);
        } else {
            console.error(`[mediaSoupApp/getProducers]: ${socket.id}} does not exist`);
        }
    });

    socket.on('transport-connect', ({ dtlsParameters }) => {
        getTransport(socket.id).connect({ dtlsParameters });
    });

    socket.on('transport-produce', async ({ kind, rtpParameters }, callback) => {
        const producer = await getTransport(socket.id).produce({
            kind,
            rtpParameters
        });

        const { roomName } = peers[socket.id];
        addProducer(producer, roomName, socket.id);
        informConsumers(roomName, socket.id, producer.id);
        producer.on('transportclose', () => {
            producer.close();
        });

        callback({
            id: producer.id,
            producersExist: (producers.length > 1) ? true : false
        });
    });

    socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
        const consumerTransport = transports.find(transportData => (
            transportData.consumer && transportData.transport.id == serverConsumerTransportId
        ));
        if (consumerTransport) {
            await consumerTransport.transport.connect({ dtlsParameters });
        }
    })

    socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
        if (peers[socket.id]) {
            try {
                const { roomName } = peers[socket.id];
                const router = rooms[roomName].router;
                let consumerTransport = transports.find(transportData => (
                    transportData.consumer && transportData.transport.id == serverConsumerTransportId
                ));

                if (consumerTransport) {
                    consumerTransport = consumerTransport.transport;
                    const canConsume = router.canConsume({
                        producerId: remoteProducerId,
                        rtpCapabilities
                    });

                    if (canConsume) {
                        const consumer = await consumerTransport.consume({
                            producerId: remoteProducerId,
                            rtpCapabilities,
                            paused: true,
                        });

                        // consumer.on('transportclose', () => {
                        //     console.log('transport close from consumer');
                        // });

                        consumer.on('producerclose', () => {
                            socket.emit('producer-closed', { remoteProducerId });
                            consumerTransport.close([]);
                            transports = transports.filter(transportData => transportData.transport.id !== consumerTransport.id);
                            consumer.close();
                            consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumer.id);
                        });

                        addConsumer(consumer, roomName, socket.id);

                        const params = {
                            id: consumer.id,
                            producerId: remoteProducerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters,
                            serverConsumerId: consumer.id
                        };

                        callback({ params });
                    }
                }
            } catch (error) {
                console.error(error.message)
                callback({
                    params: {
                        error: error
                    }
                });
            }
        }
    })

    socket.on('consumer-resume', async ({ serverConsumerId }) => {
        const { consumer } = consumers.find(consumerData => consumerData.consumer.id === serverConsumerId);
        await consumer.resume();
    });
};

export default mediaSoupApp;