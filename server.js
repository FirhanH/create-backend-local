const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const socketIo = require('socket.io');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Konfigurasi database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecommerce'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to database');
});

// Inisialisasi Socket.io
const server = require('http').createServer(app);
const io = socketIo(server);

// Fungsi untuk autentikasi
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'secretkey', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Endpoint untuk sign up
app.post('/signup', (req, res) => {
    const { username, password, email } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, email], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');
        res.status(200).send({ auth: true });
    });
});

// Endpoint untuk login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send('Error on the server.');
        if (results.length === 0) return res.status(404).send('No user found.');

        const user = results[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) return res.status(401).send({ auth: false, token: null });

        const token = jwt.sign({ id: user.id }, 'secretkey', { expiresIn: 86400 });
        res.status(200).send({ auth: true, token });
    });
});

// Endpoint untuk menampilkan daftar barang
app.get('/items', (req, res) => {
    const sql = 'SELECT * FROM items';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Error on the server.');
        res.status(200).send(results);
    });
});

// Endpoint untuk melihat detail barang
app.get('/items/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM items WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');
        if (result.length === 0) return res.status(404).send('No item found.');
        res.status(200).send(result[0]);
    });
});

// Konfigurasi multer untuk upload gambar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Endpoint untuk menambah barang
app.post('/items', upload.single('image'), (req, res) => {
    const { name, description, price } = req.body;
    const image = req.file.filename;

    const sql = 'INSERT INTO items (name, description, price, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, description, price, image], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');
        res.status(201).send({ id: result.insertId });
    });
});

// Endpoint untuk menyimpan barang ke cart
app.post('/cart', authenticateToken, (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;

    const sql = 'INSERT INTO cart (user_id, item_id) VALUES (?, ?)';
    db.query(sql, [userId, itemId], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');
        res.status(201).send({ id: result.insertId });
    });
});

// Endpoint untuk chat
io.on('connection', (socket) => {
    socket.on('sendMessage', (message) => {
        const userId = message.userId;
        const text = message.text;

        const sql = 'INSERT INTO chats (user_id, message) VALUES (?, ?)';
        db.query(sql, [userId, text], (err, result) => {
            if (err) return console.error('Error on the server.');
            io.emit('receiveMessage', { userId, text });
        });
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
