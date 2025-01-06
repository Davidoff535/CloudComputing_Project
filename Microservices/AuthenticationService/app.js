const tracer = require("./tracing")("AuthenticationService");
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var usersRouter = require('./routes/users');

var app = express();
app.use(cors());
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.use("/user", usersRouter);

module.exports = app;