
##  MediaSoup Example
Example application using [mediasoup](https://mediasoup.org/).
## Features

- Multiples rooms
- Multiples clients


## Deployment

To apply the initial settings run

```bash
  npm run init
```


#### Environment Variables

To run this project, you will need to add the following environment variables to your src/config.js file.
All variables are required

| Parameter | Type | Description
| :- | :- | :-
| `nameApp` | `string` | Your name app
| `url` | `string` | Your base url
| `onlyServerMediaSoup` | `boolean` | Server works only backend
| `cert` | `object` | { privkey: 'path', fullchain: 'path' }
| `port` | `number` | port used by express
| `rtcMinPort` | `number` | minimum port used for stream traffic
| `rtcMaxPort` | `number` | maximum port used for stream traffic
| `mediaCodecs` | `array` | [RtpCodecParameters](https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecParameters)
| `webRtcTransportOptions` | `object` | [WebRtcTransportOptions](https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions)

To start proyect run

```bash
  npm run start
```


## Fork
[mediasoup3](https://github.com/jamalag/mediasoup3)

