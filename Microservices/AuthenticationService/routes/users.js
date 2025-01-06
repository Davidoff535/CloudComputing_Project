var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();
var db = require('../database');
var jwt = require('jsonwebtoken');
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('auth-service');

const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET env var is not defined.');
    process.exit(1); // Exit the process with an error code
}

// Login endpoint
router.post('/login', async function (req, res) {
    const span = tracer.startSpan('login');

    const { username, password } = req.body;
    if (!username) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing username' });
        return res.status(400).send({ status: 'fail', message: 'Missing username' });
    }
    if (!password) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing password' });
        return res.status(400).send({ status: 'fail', message: 'Missing password' });
    }

    try {
        const user = await db.user.findUserByUsername(username);
        span.setAttribute('user.name', user.username);

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username: user.username }, jwtSecret, { expiresIn: '1h' });
            span.setStatus({ code: SpanStatusCode.OK });
            res.send({ status: 'success', message: 'Login successful', token: token, expiresAt: Date.now() + 3600000 });
        } else {
            span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid credentials' });
            res.status(401).send({ status: 'fail', message: 'Invalid credentials' });
        }
    } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Server error' });
        console.log(error);
        res.status(500).send({ status: 'fail', message: 'Server error' });
    } finally {
        span.end();
    }

});

// Registration endpoint
router.post('/register', async function (req, res) {
    const { username, firstname, lastname, password } = req.body;
    const span = tracer.startSpan('register');

    span.setAttribute('user.name', username || 'none-provided');
    span.setAttribute('user.firstname', firstname || '');
    span.setAttribute('user.lastname', lastname || '');

    if (!username) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing username' });
        return res.status(400).send({ status: 'fail', message: 'Missing username' });
      }
      if (!firstname) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing firstname' });
        return res.status(400).send({ status: 'fail', message: 'Missing firstname' });
      }
      if (!lastname) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing lastname' });
        return res.status(400).send({ status: 'fail', message: 'Missing lastname' });
      }
      if (!password) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing password' });
        return res.status(400).send({ status: 'fail', message: 'Missing password' });
      }

    try {
        const userExists = await db.user.findUserByUsername(username);
        if (userExists) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: 'Username already exists' });
            res.status(409).send({ status: 'fail', message: 'Username already exists' });
        } else {
            const hashedPw = await bcrypt.hash(password, saltRounds);
            await db.user.addUser({ username: username, firstname: firstname, lastname: lastname, password: hashedPw });
            const token = jwt.sign({ username: username }, jwtSecret, { expiresIn: '1h' });
            span.setStatus({ code: SpanStatusCode.OK });
            res.send({ status: 'success', message: 'Registration successful', token: token, expiresAt: Date.now() + 3600000 });
        }
    } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Server error' });
        console.log(error);
        res.status(500).send({ status: 'fail', message: 'Server error' });
    } finally {
        span.end();
    }
});

module.exports = router;
