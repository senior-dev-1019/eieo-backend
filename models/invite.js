var mongoose = require('mongoose');
const { Timestamp } = require('mongodb');

var inviteSchema = mongoose.Schema({
    invitor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    visitors: [{
        id: {type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null},
        status: {type: Number, default: 0},
        saved: {type: Boolean, default: false},
        enter_method: {type:Number, default: 0}, // 0 = face, 1 = qr
        booth: {type: mongoose.Schema.Types.ObjectId,default: null,ref: 'booths'}
    }],
    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        ref: 'event'
    },
    event: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: ''
    },
    service_id : {
        type: mongoose.Schema.Types.ObjectId, default: null, ref:'recurring_service'
    },
    service: {type: Boolean, default:false},
    comment: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    direction: {
        type: String,
        default: ''
    },
    startTime: {
        type: mongoose.Schema.Types.Date,
        default: ''
    },
    endTime: {
        type: mongoose.Schema.Types.Date,
        default: ''
    },
    residential_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'residential',
        default: null
    },
    
});

module.exports = mongoose.model('invite', inviteSchema);