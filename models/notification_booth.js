var mongoose = require('mongoose');

var notificationBoothSchema = mongoose.Schema({
    title:{type:String, default:''},
    body:{type:String, default:''},
    type:{type:Number, default:0},
    read:{type:Boolean, default:false},
    other:{type:String, default:''},
    id:{type:mongoose.Schema.Types.ObjectId, ref:'booths', default:null},
    user:{type:mongoose.Schema.Types.ObjectId, ref:'users', default:null},
    // other:{type:String, default:''},
    created:{type:Date, default:null}

});

module.exports = mongoose.model('notfication_booth', notificationBoothSchema);