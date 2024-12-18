var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();
var jwt = require('jsonwebtoken');
var db = require('../database');
const ws = require('../websocketManager');

const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;

function isLoggedIn(req, res, next) {
    if (!req.jwtProvided) {
        console.log("Denied: Authentication required");
        return res.status(401).send('Authentication required');
    } else if (req.jwtVerifyError || req.jwtExpired) {
        console.log("Denied: Invalid authentication token");
        return res.status(401).send('Invalid authentication token');
    }
    next();
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
        res.status(500).send({ status: 'fail', message: 'Server error' });
    }
});

router.get('/getInfo', isLoggedIn, async function (req, res) {
    try {
        const user = await db.user.findUserByUsername(req.jwtPayload.username);
        if (!user) {
            return res.status(404).send({ status: 'fail', message: 'User not found' });
        }

        const { password, ...userInfo } = user;
        res.send({ status: 'success', user: userInfo });
    } catch (error) {
        res.status(500).send({ status: 'fail', message: 'Server error' });
    }
});

module.exports = router;

router.put('/update', isLoggedIn, async function (req, res) {
    const { firstname, lastname, newPW, oldPW, profilePicture } = req.body;





    try {
        const user = await db.user.findUserByUsername(req.jwtPayload.username);
        if (!user) {
            return res.status(404).send({ status: 'fail', message: 'User not found' });
        }
        if (!oldPW) {
            return res.status(400).send({ status: 'fail', message: 'No old password provided' });
        }
        if (!(await bcrypt.compare(oldPW, user.password))) {
            return res.status(401).send({ status: 'fail', message: 'Invalid old password' });
        }


        const updatedData = {};
        if (firstname) updatedData.firstname = firstname;
        if (lastname) updatedData.lastname = lastname;
        if (profilePicture) updatedData.profilePicture = profilePicture;
        if (newPW) updatedData.password = await bcrypt.hash(newPW, saltRounds);

        await db.user.updateUserByUsername(user.username, updatedData);
        await notifyAllFriends(user);
        res.send({ status: 'success', message: 'User information updated successfully' });
    } catch (error) {
        res.status(500).send({ status: 'fail', message: 'Server error' });
    }
});

async function notifyAllFriends(user) {
    try {
        const { password, ...userInfo } = await db.user.findUserByUsername(user.username);
        const friends = await db.friends.findAllFriendsOfUser(user.username);
        friends.forEach(friend => {
            ws.sendUserUpdatedToClient(userInfo, friend.username);
        });
    } catch (error) {
        console.error(error);
    }
}