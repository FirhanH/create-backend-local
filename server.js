require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;
const host = 'localhost';

app.use(cors({
    origin: ['*'],
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(routes);

const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
    socket.on('sendMessage', (message) => {
        require('./handler').handleChatMessage(socket, message);
    });
});

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
