var mongoose = require('mongoose');

var countriesSchema = mongoose.Schema({
    id: Number,
    code: String,
    iso3: String,
    iso2: String,
    name: String
});

module.exports = mongoose.model('countries', countriesSchema);