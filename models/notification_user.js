var mongoose = require('mongoose');

var notificationUserSchema = mongoose.Schema({
    title:{type:String, default:''},
    body:{type:String, default:''},
    type:{type:Number, default:0},
    read:{type:Boolean, default:false},
    other:{type:String, default:''},
    img_url:{type:String, default:''},
    id:{type:mongoose.Schema.Types.ObjectId, ref:'users', default:null},
    booth:{type:mongoose.Schema.Types.ObjectId, ref:'booths', default:null},
    created:{type:Date, default:null}
});

module.exports = mongoose.model('notfication_user', notificationUserSchema);