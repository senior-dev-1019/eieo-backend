var mongoose = require('mongoose');

var citiesSchema = mongoose.Schema({
   
    name: String,
    iso2: String,
    lat: Number,
    lng: Number
});

module.exports = mongoose.model('cities', citiesSchema);