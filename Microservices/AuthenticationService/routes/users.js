var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();
var db = require('../database');
var jwt = require('jsonwebtoken');

const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET env var is not defined.');
    process.exit(1); // Exit the process with an error code
}

// Login endpoint
router.post('/login', async function (req, res) {
    const { username, password } = req.body;
    if (!username) {
        return res.status(400).send({ status: 'fail', message: 'Missing username' });
    }
    if (!password) {
        return res.status(400).send({ status: 'fail', message: 'Missing password' });
    }

    try {
        const user = await db.user.findUserByUsername(username);
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username: user.username }, jwtSecret, { expiresIn: '1h' });
            res.send({ status: 'success', message: 'Login successful', token: token, expiresAt: Date.now() + 3600000 });
        } else {
            res.status(401).send({ status: 'fail', message: 'Invalid credentials' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({ status: 'fail', message: 'Server error' });
    }

});

// Registration endpoint
router.post('/register', async function (req, res) {
    const { username, firstname, lastname, password } = req.body;
    if (!username) {
        return res.status(400).send({ status: 'fail', message: 'Missing username' });
    }
    if (!firstname) {
        return res.status(400).send({ status: 'fail', message: 'Missing firstname' });
    }
    if (!lastname) {
        return res.status(400).send({ status: 'fail', message: 'Missing lastname' });
    }
    if (!password) {
        return res.status(400).send({ status: 'fail', message: 'Missing password' });
    }

    try {
        const userExists = await db.user.findUserByUsername(username);
        if (userExists) {
            res.status(409).send({ status: 'fail', message: 'Username already exists' });
        } else {
            const hashedPw = await bcrypt.hash(password, saltRounds);
            await db.user.addUser({ username: username, firstname: firstname, lastname: lastname, password: hashedPw });
            const token = jwt.sign({ username: username }, jwtSecret, { expiresIn: '1h' });
            res.send({ status: 'success', message: 'Registration successful', token: token, expiresAt: Date.now() + 3600000 });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({ status: 'fail', message: 'Server error' });
    }
});

module.exports = router;
