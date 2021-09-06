var mongoose = require('mongoose');

var faqSchema = mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' }
});

module.exports = mongoose.model('FAQ', faqSchema);