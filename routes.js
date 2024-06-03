const express = require('express');
const multer = require('multer');
const handlers = require('./handler');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.post('/signup', handlers.signUp);
router.post('/login', handlers.login);
router.get('/items', handlers.getItems);
router.get('/items/:id', handlers.getItemById);
router.post('/items', upload.single('image'), handlers.addItem);
router.post('/cart', handlers.authenticateToken, handlers.addItemToCart);

module.exports = router;
