var mongoose = require('mongoose');

residentialSchema = mongoose.Schema({
    name: {type:String, default:''},
    address: {type:String, default:''},
    latitude: {type:Number, default:0},
    longitude: {type:Number, default:0},

    active: {type:Boolean, default:true},
    country: {type:String, default:''},
    city: {type:String, default:''},
    parks: [
        {
            park_type: {type:Number, default:0},
            name: {type:String, default:''},
            full_size: {type:Number, default:0},
            cur_size: {type:Number, default:0}
        }
    ],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'admins', default:null }],
    booths: [{ type: mongoose.Schema.Types.ObjectId, ref: 'booths', default:null }],
    favorite: {type:Boolean, default:false},
    rec_service: {type:Boolean, default:false},
    event: {type:Boolean, default:false},
    plates: {type:Boolean, default:false}
});

module.exports = mongoose.model('residential', residentialSchema);