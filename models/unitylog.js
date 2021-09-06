var mongoose = require('mongoose');

var unityLogSchema = mongoose.Schema({
  time: {
    type: String,
    require: true,
    default: ''
  },
  img: {
    type: String,
    require: true,
    default: '',
  },
});

module.exports = mongoose.model('unitylog', unityLogSchema);