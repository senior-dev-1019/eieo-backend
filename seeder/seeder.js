var mongoose = require('mongoose');
var constants = require('../app/constants');
var Admin = require('../models/admin');
var Country = require('../models/countries');
var City = require('../models/cities');
var Stas = require('../models/statistics');
mongoose.connect(constants.dburl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}, async (err) => {
    var admin = [{
        full_name: 'support',
        user_name: 'support',
        email: 'support@eieo.com',
        password: 'support',
        authority: 0
    }, {
        full_name: 'creator',
        user_name: 'creator',
        email: 'creator@eieo.com',
        password: 'creator',
        authority: 2
    }]
    var country = require('./countries.json');
    var city = require('./cities.json');
    var stat = require('./stats.json');
    await Admin.collection.deleteMany();
    await Country.collection.deleteMany();
    await City.collection.deleteMany();
    await Stas.collection.deleteMany();
    await Admin.collection.insertMany(admin);
    await Country.collection.insertMany(country);
    await City.collection.insertMany(city);
    await Stas.collection.insertMany(stat);
    process.exit(0);
});