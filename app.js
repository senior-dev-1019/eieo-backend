var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var constants = require('./app/constants');
var session = require('express-session');
var common = require('./app/common');
var admin = require('./routes/admin');
var user = require('./routes/user');
var booth = require('./routes/booth');
var visitor = require('./routes/visitor');

var unity = require('./routes/unity');

var app = express();
var cors = require('cors');
var cors_options = {
  origin: ['https://eieo-visit.live/', 'https://eieo-admin.com', 'localhost:5000'],
  optionsSuccessStatus: 200
};
mongoose.connect(constants.dburl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/admin/', admin);
app.use('/api/user/', user);
app.use('/api/booth/', booth);
app.use('/api/visitor', cors(cors_options), visitor);

app.use('/api/unity/', unity);
module.exports = app;
