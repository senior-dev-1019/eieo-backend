var mongoose = require('mongoose');

var boothsSchema = mongoose.Schema({
    full_name: {type:String, require: true, default: ''},
    user_name: {type:String, require: true, default: ''},
    email: {type:String, require: true, default: ''},
    password: {type:String, default: ''},
    type: {type:Number,default:0},
    device_token: {type:String, default:''},
    // login: {type:Boolean, default:false},
    residential_id: {type:mongoose.Schema.Types.ObjectId, ref : 'residential', default:null}  
});

module.exports = mongoose.model('booths', boothsSchema);