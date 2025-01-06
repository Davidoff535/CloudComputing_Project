const tracer = require("./tracing")("MessagingService");
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
var jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET env var is not defined.');
    process.exit(1); // Exit the process with an error code
}

var messageRouter = require('./routes/api');

var app = express();
app.use(cors());
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

function verifyRequest(req) {
    let token = req.headers['authorization'];
    req.jwtProvided = false;
    req.jwtVerifyError = false;
    req.jwtExpired = false;
    req.jwtPayload = null;

    if (token) {
        console.log(`> Authorization: Token "${token}" provided as Authorization-header`)
        token = token.replace("Bearer ", "")
        req.jwtProvided = true;
        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                req.jwtVerifyError = true;
                // Check if the error is because the JWT has expired
                if (err.name === 'TokenExpiredError') {
                    req.jwtExpired = true; // You can add this line to indicate specifically that the JWT expired
                }
            } else {
                // console.log("JWT: ", decoded)
                req.jwtPayload = decoded;
            }
        });
    } else {
        console.log("> Authorization: No token provided as Authorization-header")
    }
}

function verifyMiddleware(req, res, next) {
    console.log(`Verify token on request to ${req.url}`)
    verifyRequest(req)
    if (!req.jwtProvided) {
        console.log(`>>> Not authorized, no token provided`)
    } else if (req.jwtProvided && !req.jwtVerifyError) {
        console.log(`>>> Authorized`)
    } else if (req.jwtProvided && req.jwtVerifyError && req.jwtExpired) {
        console.log(`>>> Not authorized, token expired`)
    } else {
        console.log(`>>> Not authorized, error during token verification`)
    }
    next()
}

// Apply the verifyMiddleware middleware to all routes
// The order of our middlewares matters: If we put this before
// setting up our express.static middleware, JWT would even be checked
// for every static resource, which would introduce unncessary overhead.
app.use(verifyMiddleware);
app.use("/messages", messageRouter);

module.exports = app;