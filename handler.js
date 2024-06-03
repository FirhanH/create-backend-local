const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./dbhandler');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Access Denied: No Token Provided!');

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Access Denied: Invalid Token!');
        req.user = user;
        next();
    });
};

const signUp = (req, res) => {
    const { username, password, email } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, email], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');

        const response = {
            auth: true,
            message: 'User registered successfully',
            user: {
                id: result.insertId,
                username: username,
                email: email
            }
        };

        res.status(201).send(response);
    });
};

const login = (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send('Error on the server.');
        if (results.length === 0) return res.status(404).send('No user found.');

        const user = results[0];
        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) return res.status(401).send({ auth: false, token: null });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: 86400 });
        res.status(200).send({ auth: true, token });
    });
};

const getItems = (req, res) => {
    const sql = 'SELECT * FROM items';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Error on the server.');
        res.status(200).send(results);
    });
};

const getItemById = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM items WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');
        if (result.length === 0) return res.status(404).send('No item found.');
        res.status(200).send(result[0]);
    });
};

const addItem = (req, res) => {
    const { name, description, price } = req.body;
    const image = req.file.filename;

    const sql = 'INSERT INTO items (name, description, price, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, description, price, image], (err, result) => {
        if (err) return res.status(500).send('Error on the server.');
        res.status(201).send({ id: result.insertId });
    });
};

const addItemToCart = (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;

    const sql = 'INSERT INTO cart (user_id, item_id) VALUES (?, ?)';
    db.query(sql, [userId, itemId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error on the server.');
        }
        res.status(201).send({ message: 'Item added to cart successfully', cart_id: result.insertId });
    });
};

const handleChatMessage = (socket, message) => {
    const userId = message.userId;
    const text = message.text;

    const sql = 'INSERT INTO chats (user_id, message) VALUES (?, ?)';
    db.query(sql, [userId, text], (err, result) => {
        if (err) return console.error('Error on the server.');
        socket.emit('receiveMessage', { userId, text });
    });
};


module.exports = {
    authenticateToken,
    signUp,
    login,
    getItems,
    getItemById,
    addItem,
    addItemToCart,
    handleChatMessage
};
