var mongoose = require('mongoose');

var notificationInvtieSchema = mongoose.Schema({
    title:{type:String, default:''},
    body:{type:String, default:''},
    other:{type:String, default:''},
    id:{type:mongoose.Schema.Types.ObjectId, ref:'users', default:null},
    created:{type:Date, default:null}
});

module.exports = mongoose.model('notfication_invite', notificationInvtieSchema);