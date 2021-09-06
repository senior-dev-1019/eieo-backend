var mongoose = require('mongoose');

var adminSchema = mongoose.Schema({
    full_name: {
        type: String,
        require: true,
        default: ''
    },
    user_name: {
        type: String,
        require: true,
        default: '',
        unique: true
    },
    password: {
        type: String,
        require: true,
        default: ''
    },
    email: {
        type: String,
        require: true,
        default: ''
    },
    authority: {
        type: Number,
        default: 3
    },
    img_url: {
        type: String,
        default: ''
    },
});

module.exports = mongoose.model('admins', adminSchema);