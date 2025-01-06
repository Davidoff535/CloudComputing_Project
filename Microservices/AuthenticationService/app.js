require('./tracing');

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');


var usersRouter = require('./routes/users');
require('console');

var app = express();
app.use(cors());
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

// Apply the verifyMiddleware middleware to all routes
// The order of our middlewares matters: If we put this before
// setting up our express.static middleware, JWT would even be checked
// for every static resource, which would introduce unncessary overhead.
app.use("/user", usersRouter);

module.exports = app;