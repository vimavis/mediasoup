import { Server } from 'socket.io';
import { port } from './config.js';
import httpsServer from "./httpsServer.js";
import mediaSoupApp from './mediaSoupApp.js';

httpsServer.listen(port, () => {
    console.log(`listening on port: ${port}`);
});
const io = new Server(httpsServer);

const connections = io.of('/mediasoup');
connections.on('connection', mediaSoupApp);