import mediasoup from 'mediasoup';
import { nroWorkers, rtcMinPort, rtcMaxPort, mediaCodecs } from './config.js';

const workers = [];
let workerPointer = 0;

export const init = async () => {
    console.info(`mediasoup using ports ${rtcMinPort} - ${rtcMaxPort}`);
    for (let index = 0; index < nroWorkers; index++) {
        workers.push(await createWorker());
    }
};

const createWorker = async () => {
    const worker = await mediasoup.createWorker({
        rtcMinPort,
        rtcMaxPort
    });

    worker.on('died', error => {
        console.error('##### mediasoup worker has died! #####');
        console.error(error);
        console.error('##### -------------------------- #####');
    });

    console.info(`----- mediasoup created a worker! - PID: #${worker.pid} -----`);
    return worker;
}

// Router(room) creation rotation in workers for simple load balancing
export const createRouter = async () => {
    const router = await workers[workerPointer].createRouter({ mediaCodecs });
    workerPointer = (workerPointer + 1) % nroWorkers;
    return router;
};

export const stopRouter = async (router) => {
   return await router.close();
};
