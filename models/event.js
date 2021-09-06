var mongoose = require('mongoose');

var eventSchema = mongoose.Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref:'users'},
    comment: {type:String, default: ''},
    title:{type: String, default: ''},
    description: {type:String, default: ''}
});

module.exports = mongoose.model('event', eventSchema);