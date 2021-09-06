var mongoose = require('mongoose');

var recurringServiceSchema = mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    description: { type: String, default: '' },
    repeated: { per: { type: Number, default: 0 }, unit: { type: Number, default: 0 } },
    startTime: { type: Date, },
    endTime: { type: Date },
    createdTime: {type: Date},
    schedule: { type: String, default: '' },
    provider: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
        status: { type: Number, default: 0 }, enter_method: { type: Number, default: 0 },
    },
    residential_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'residential' }
});

module.exports = mongoose.model('recurring_service', recurringServiceSchema);