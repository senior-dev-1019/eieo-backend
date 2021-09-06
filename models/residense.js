var mongoose = require('mongoose');

var residenseSchema = mongoose.Schema({
    user_id: {type:mongoose.Schema.Types.ObjectId, ref: 'users', default: null},
    residential_id: {type: mongoose.Schema.Types.ObjectId, ref: 'residential', default:null},
    house_id: {type: String, default: ''},
    default: {type: Boolean, default: false},
    comment: {type: String, default: ''},
    latitude: {type:Number,defult:0},
    longitude: {type:Number,defult:0}
});

module.exports = mongoose.model('residenses', residenseSchema);