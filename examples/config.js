// copy in: src/config.js
import os from 'os';
const systemCpuCores = os.cpus().length;

export const nameApp = 'SFU Mediasoup example';
export const url = '';
export const onlyServerMediaSoup = false;
export const cert = {
    privkey: '',
    fullchain: ''
};
export const port = 3000;
export const rtcMinPort = 8000;
export const rtcMaxPort = 9000;
export const nroWorkers = systemCpuCores > 4 ? systemCpuCores - 2 : systemCpuCores;
export const mediaCodecs = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
];
export const webRtcTransportOptions = {
    listenIps: [
        {
            ip: '0.0.0.0',
            // announcedIp: 'PUBLIC_IP',
        }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
};