var express      = require('express')
var cookieParser = require('cookie-parser')
var fs = require('fs');
var app = express();
// var wiki = require('./wiki.js');
var users = require('./routes/user');
var multer = require('multer');
var upload = multer();
var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost/EIEO';
mongoose.connect(mongoDB, {useNewUrlParser: true});
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error: '));

var schema = mongoose.Schema;
var someModelSchema = new schema({
   a_string: String,
   a_date: Date
});
var someModel = mongoose.model('someModel', someModelSchema);

var instance = new someModel({a_string: 'awesome'});

instance.save(function(err) {
   if(err) return handleError(err);
});
app.use('/users', users);
// app.use('/wiki', wiki);
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(upload.array());
user = {
   "user4" : {
      "name" : "mohit",
      "password" : "password4",
      "profession" : "teacher",
      "id": 4
   }
};
app.get('/', function(req, res) {
   res.sendFile(__dirname + '/' + 'index.htm');
});
app.get('/:id', function(req, res) {
   fs.readFile(__dirname + '/' + 'users.json', 'utf8', function(err, data) {
      data=JSON.parse(data);
      var user = data["user" + req.params.id];
      res.end(user);
   });
});
app.post('/addUser', function(req, res) {
   fs.readFile(__dirname + '/' + 'users.json', 'utf8', function (err, data) {
      data = JSON.parse(data);
      data['user4'] = user['user4'];
      res.end(JSON.stringify(data));
   });
});
app.get('/', function(req, res) {
   res.send(JSON.stringify({cookie:req.cookies}));
});

app.get('/listUsers', function( req, res) {
   fs.readFile(__dirname + "/" + "users.json", "utf8", function(err, data) {
      res.end(data);
   });
});

app.listen(8085);