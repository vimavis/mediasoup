import express from 'express';
import fs from 'fs';
import https from 'httpolyglot';
import { cert, nameApp, url, onlyServerMediaSoup } from './config.js';
import path from 'path';

const app = express();
if (onlyServerMediaSoup) {
    app.get('*', (req, res) => {
        res.status(200).send(nameApp);
    });
} else {
    const __dirname = path.resolve();
    app.get('*', (req, res, next) => {
        const path = '/sfu/';
        if (req.path.indexOf(path) == 0 && req.path.length > path.length) return next();
        res.send(`${nameApp}: You need to specify a room name in the path e.g. <a href="${url}/sfu/mainroom" >${url}/sfu/[nameroom] or click here!</a>`);
    });

    app.use('/sfu/:room', express.static(path.join(__dirname, 'public')));
}

// SSL
const options = {
    cert: fs.readFileSync(cert.fullchain, 'utf-8'),
    key: fs.readFileSync(cert.privkey, 'utf-8')
};

const httpsServer = https.createServer(options, app);

export default httpsServer;