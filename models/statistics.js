var mongoose = require('mongoose');

var stasSchema = mongoose.Schema({
    regd_user: {type:Number, default:0},
    app_user: {type:Number, default:0},
    rest_num: {type:Number, default:0},
    resl_num: {type:Number, default:0},
    no: {type: Number}
});

module.exports = mongoose.model('statistics', stasSchema);