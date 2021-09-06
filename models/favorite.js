var mongoose = require('mongoose');

var favoriteSchema = mongoose.Schema({
    user_id: {type:mongoose.Schema.Types.ObjectId, ref:'users', default: null},
    favorite_id: {type:mongoose.Schema.Types.ObjectId, ref:'users', default: null},
    status:{type:Number, default:0}
});

module.exports = mongoose.model('favorite', favoriteSchema);