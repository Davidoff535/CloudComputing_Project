const tracer = require("./tracing")("ResourceProvider");
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var app = express();
app.use(cors());
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get(["/login"], function (req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get(["/register"], function (req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get(["/"], function (req, res, next) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;