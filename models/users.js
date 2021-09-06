var mongoose = require('mongoose');

var usersSchema = mongoose.Schema({
    full_name:      {type: String, require: true, default:''},
    birth_day:      {type: String, require: true, default:''},
    uid:            {type: String, default:''},
    country_code:   {type:String, default:''},
    country_abbr:   {type:String, default:''},
    phone_number:   {type:String, default:''},
    email:          {type:String, default:''},
    bio_data:       {type:String, default:''},
    img_url:        {type:String, default:''},
    is_user:        {type:Boolean, default:true},
    tags:           [{name: String,tagID: String}],
    favorite_access:{type: Boolean, default:false},
    event_access:{type: Boolean, default:false},
    provider_access:{type: Boolean, default:false},
    tiemstamps:     {createdAt: Date,updatedAt: Date},
    plate:          {name:{type:String},number: {type:String},region: {type:String},type: {type:String}},

    device_token:   {type:String, default:''}
});

module.exports = mongoose.model('users', usersSchema);