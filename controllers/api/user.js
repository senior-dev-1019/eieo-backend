var admin = require("firebase-admin");
var serviceAccount = require("../../app/firebase-server.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://loschaneques-mexico.firebaseio.com"
});
var jwt = require('jwt-simple');
var userKey = require('../../app/common').userCryptKey;
var Admin = require('../../models/admin');
var Residential = require('../../models/residential');
var Users = require('../../models/users');
var Residense = require('../../models/residense');
var Invite = require('../../models/invite');
var Favorite = require('../../models/favorite');
var Event = require('../../models/event');
var RecService = require('../../models/recurring_service');
var Booths = require('../../models/booths');
var NotificationUser = require('../../models/notification_user');
var NotificationBooth = require('../../models/notification_booth');
var Faqs = require('../../models/FAQ');
var NotificationInvite = require('../../models/notification_invite');
var notify = require('../notification');

var common = require('../../app/common');
var moment = require('moment');
var s3AWS = require('../s3');
var facialAWS = require('../facial');
var cron = require("node-cron");
var twilio = require('../twilio');
var schedule = require('node-schedule');
const {
    createConnection
} = require("mongoose");
const { provider } = require("firebase-functions/lib/providers/auth");
const countries = require("../../models/countries");



//completed
exports.login = async (req, res) => {
    try {
        // token = req.headers.authorization;
        var { uid, phone_number, device_token } = req.body;
        console.log(device_token)
        let firebase_token = await admin.auth().getUserByPhoneNumber(phone_number);
        let firebase_uid = firebase_token.uid;
        if (uid != firebase_uid)
            return res.status(400).json({ 'firebase_verified': false, 'message': 'Your phone is not verified by firebase.\nPlease vierify your phone number.', 'login': false });

        let user = await Users.findOne({ 'phone_number': phone_number, is_user: true });
        if (user) {
            user.uid = uid;
            if (user.device_token == '' || user.device_token == null) {
                user.device_token = device_token;
            } else {
                if (user.device_token != device_token) {
                    user.device_token = device_token;

                    // return res.json({ firebase_verified: true, login: false, multipleLogin: true });
                }
            }
            await Users.updateOne({ _id: user._id }, user);
            var residenses = await Residense.findOne({ user_id: user._id, default: true }).populate('residential_id');
            var device_token = user.device_token == null ? '' : user.device_token
            if (residenses == null) {
                return res.json({
                    token: jwt.encode({ _id: user._id, uid: uid, deviceToken: device_token.toString() }, userKey),
                    firebase_verified: true,
                    login: true,
                    resident: false,
                    img_url: user.img_url,
                    favorite: false,
                    event: false,
                    service: false,
                    plate: false
                });
            }
            var favorite = false;
            var service = false;
            var event = false;
            var plate = false;
            if (residenses.residential_id._id) {
                favorite = residenses.residential_id.favorite;
                service = residenses.residential_id.rec_service;
                event = residenses.residential_id.event;
                plate = residenses.residential_id.plates;
            }
            res.json({
                token: jwt.encode({ _id: user._id, uid: uid, deviceToken: device_token.toString() }, userKey),
                firebase_verified: true,
                login: true,
                resident: true,
                img_url: user.img_url,
                favorite: favorite,
                event: event,
                service: service,
                plate: plate
            });
        } else {
            res.status(400).json({
                login: false,
                firebase_verified: true,
                multipleLogin: false,
                message: 'Your phone number is not registered.\nPlease sign up.'
            });
        }
    } catch (e) {
        console.log(e)
        res.status(400).json({
            'login': false,
            'firebase_verified': false,
            'message': 'Something went wrong.\nPlease log in again or verify your phone number.'
        });
    }
}

exports.loginjwt = async (req, res) => {
    try {
        let user = req.body.user;
        if (user) {
            var residenses = await Residense.findOne({ user_id: user._id, default: true }).populate('residential_id');
            var is_resident = residenses ? true : false;
            var favorite = false,
                service = false,
                event = false,
                plate = false;
            try {
                if (residenses.residential_id._id) {
                    favorite = residenses.residential_id.favorite;
                    service = residenses.residential_id.rec_service;
                    event = residenses.residential_id.event;
                    plate = residenses.residential_id.plates;
                }
            } catch (error) {

            }
            res.json({
                success: true,
                token: jwt.encode({ _id: user._id, uid: user.uid, deviceToken: (user.device_token || '').toString() }, userKey),
                resident: is_resident,
                favorite: favorite,
                event: event,
                service: service,
                plate: plate,
                img_url: user.img_url || ''
            });
        } else {
            res.json({
                success: false,
                error: 'Something went wrong.',
                login: false,
                multipleLogin: false,
            });
        }
    } catch (e) {
        console.log(e)
        res.status(400).json({
            success: false,
            multipleLogin: false,
            error: e.message
        });
    }
}
exports.logout = async (req, res) => {
    try {
        var id = req.body.user._id;
        var user = await Users.findById(id);
        user.device_token = '';
        await user.save();
        return res.json({ success: true });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.update_device_token = async (req, res) => {
    try {
        var id = req.body.user._id;
        var token = req.body.device_token;
        var user = await Users.findById(id);
        if (user.device_token == '') {
            user.device_token = token;
        } else if (user.device_token != token) {
            return res.json({ success: false, error: 'Multiple log in' });
        }
        user.device_token = token;

        await user.save();
        res.json({ success: true });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: 'Something went wrong', message: e.message });
    }
}
//completed
exports.register = async (req, res) => {
    try {
        var { user, uid, img } = req.body;
        let firebase_token = await admin.auth().getUserByPhoneNumber(user.phone_number);

        let firebase_uid = firebase_token.uid;
        if (uid != firebase_uid) {
            return res.status(400).json({
                'firebase_verified': false,
                'message': 'Your phone is not verified by firebase.\nPlease vierify your phone number.',
                'register': false
            });
        }
        // firebase completed

        var result = await register_user(user, uid, img);
        if (result.register) {
            result.resident = false;
            res.json(result);
        } else {
            res.status(400).json({ register: false, firebase_verified: true, message: result.message });
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({ error: 'Something went wrong.' });
    }
}

const register_user = async (user_data, uid, img) => {
    let user1 = await Users.findOne({ 'phone_number': user_data.phone_number, 'is_user': true });
    let user2 = await Users.findOne({ 'email': user_data.email, 'is_user': true });
    if (user1) {
        return { 'firebase_verified': true, 'message': 1, 'register': false };
    }
    // phone number check done.
    if (user2) {
        return { 'firebase_verified': true, 'message': 2, 'register': false };
    }
    // email check done
    var new_user = {};
    new_user.uid = uid;
    let user = await Users.findOne({ 'phone_number': user_data.phone_number, is_user: false });
    if (user) {
        new_user = user_data;
        new_user._id = user._id;
        new_user.is_user = true;
        new_user.device_token = user_data.deviceToken;
    } else {
        new_user = await Users.create(user_data);
        new_user.uid = uid;
        new_user.device_token = user_data.deviceToken
    }
    // create or update user done
    var has_bio = false;
    if (img) {
        var result = await facialAWS.detect_face(img);
        has_bio = result.success;
        if (user)
            if (user.bio_data)
                await facialAWS.deleteFace([user.bio_data]);
        try {
            var obj = { photo: img, user_id: new_user._id };
            var result = await facialAWS.indexFaces(obj);
            if (result.success) { new_user.bio_data = result.face_id; }
        } catch (e) {
            console.log(e.message);
        }

        var result = await s3AWS.upload_image(img, true, new_user._id);
        if (result.success) { new_user.img_url = result.img_url; }
    }
    await Users.findByIdAndUpdate(new_user._id, new_user);
    return {
        'token': jwt.encode({ _id: new_user._id, uid: new_user.uid, deviceToken: new_user.device_token }, userKey),
        'firebase_verified': true,
        'register': true,
        'has_bio': has_bio
    };
}
exports.register_user = register_user;
exports.authenticate = async (req, res, next) => {

    var token = req.headers.authorization;
    try {
        var payload = jwt.decode(token, userKey);
        var user = await Users.findOne({
            _id: payload._id,
            is_user: true
        });
        req.body.user = user;
        console.log(payload, user.device_token)
        if ((user.device_token || '') != '' && (user.device_token || '').toString() != (payload.deviceToken || '').toString())
            return res.json({ success: false, multipleLogin: true });
        next();
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }

}
exports.checkApp = async (req, res, next) => {
    try {
        var user = Users.find({ 'phone_number': req.body.phone_number, is_user: true });
        if (user)
            res.json({ 'result': true });
        else
            res.json({ 'result': false });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.validateApp = async (req, res) => {
    try {
        var phone_number = req.body.phone_number;
        var user = await Users.findOne({
            phone_number: phone_number,
            is_user: true
        });
        if (user) {
            if (user.uid) {
                return res.json({
                    success: true
                });
            } else {
                return res.json({
                    success: false
                });
            }
        }
        return res.json({
            success: false
        });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.addInvite = async (req, res) => {
    try {
        var {
            invite,
            visitors,
            user
        } = req.body;
        if (visitors.length == 0) {
            return res.json([]);
        }
        let newInvite = await AddInvite(visitors, user._id, invite, true);

        // var time = newInvite.startTime.split(':');
        // var day = newInvite.startDate.split('/');
        // console.log(newInvite.startTime);
        // // console.log(cron);

        // var date = new Date(day[0], day[1], day[2], time[0], time[1], '0');
        // console.log(date);

        // schedule.scheduleJob(date, function(id){
        //     console.log(id);
        // }.bind(null, newInvite._id));
        res.json(newInvite);
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: e.message
        });
    }
}

const inviteTime = async () => {
    console.log('------------------->>>>>>>>>>>>>>>>>>>>>', 'invited', 'id: ', id);
}
const validateAppById = async (id) => {
    try {
        var user = await Users.findById(id);
        if (user.uid)
            return true;
        else
            return false;
    } catch (e) {
        return false;
    }
}
const AddInvite = async (visitors, user_id, invite, notify) => {
    let new_visitors = [];
    var isService = invite.service;
    for (var e of visitors) {
        var visitor = await Users.findOne({ phone_number: e.phone_number });
        if (!visitor) {
            e.is_user = false;
            visitor = await Users.create(e);
        }
        new_visitors.push({
            id: visitor._id,
            status: 0,
            enter_method: 0
        });
    }
    var invitor = await Users.findById(user_id);
    invite.invitor_id = user_id;
    invite.visitors = new_visitors;
    var residential = await Residense.findOne({ user_id: user_id, default: true }, 'residential_id comment');
    if (residential) {
        console.log('--------------------here-------------------------');
        invite.residential_id = residential.residential_id;
        invite.direction = residential.comment;
        var new_invite = await Invite.create(invite);
        // if (new_invite && !isService) {
        //     // for (var i = 0; i < new_invite.visitors.length; i++) {
        //     //     var e = new_invite.visitors[i];
        //     //     if (!(await validateAppById(e._id)))
        //     //         await twilio.sendSMS(`You have received an invitation from ${invitor.full_name}.\n
        //     //     Please click the link below to complete your registration.\n`, invitor.phone_number, visitors[i].phone_number);

        //     // }
        // }
        if (notify) {
            sendSMSinvite(new_invite._id);
            sendInviteNotification(new_invite._id);
        }
        return new_invite;
    } else {
        return [];
    }
}
const sendInviteNotification = async (invite_id) => {

}
const sendSMSinvite = async (invite_id) => {
    try {
        var invite = await Invite.findById(invite_id).populate('invitor_id', 'full_name').populate('visitors.id', 'phone_number').populate('invitor_id', 'full_name').populate('residential_id', 'name');
        var invitor = invite.invitor_id.full_name;
        console.log(invitor);
        if (invite.service) return;
        for (const visitor of invite.visitors) {
            var hasApp = await validateAppById(visitor.id._id);
            if (!hasApp) {
                var msg = `You have received an invitation from ${invitor}.\nPlease click the link below to complete your registration.\nhttps://eieo-visit.live?id1=${invite._id}&id2=${visitor.id._id}&id3=${invitor}`;
                console.log(msg);
                await twilio.sendSMS(msg, common.phone_number, visitor.id.phone_number);
            } else {
                var token = (await Users.findById(visitor.id._id)).device_token;
                var date = moment(invite.startTime).format('MM-DD-YYYY');
                var notification = {
                    title: invite.invitor_id.full_name,
                    type: 10,
                    body: `You have received an invitation from ${invite.invitor_id.full_name} for the ${date} to the residential ${invite.residential_id.name}.`,
                    id: invite.invitor_id._id,
                    created: moment().utc()
                };
                var description = invite.service ? invite.description : '';
                var title = invite.event ? invite.title : '';
                description = invite.event ? invite.description : '';
                var new_notification = await NotificationInvite.create(notification);
                var data = {
                    startTime: moment(invite.startTime).utc().format(),
                    endTime: moment(invite.endTime).utc().format(),
                    title: title,
                    description: description,
                    type: '10'
                };
                console.log(data);
                var result = await notify.notify_user(notification.title, notification.body, '1', token, data);
                console.log(result);
            }
        }
    } catch (e) {
        console.log(e.message);
    }
}
exports.removeInvite = async (req, res) => {
    try {
        var invite_id = req.params.id;
        var result = await Invite.deleteOne({
            _id: invite_id
        });
        if (result) {
            res.json({
                success: true,
                message: 'Successfully removed'
            });
        } else {
            res.json({
                success: false,
                message: 'Failed to remove'
            });
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};

exports.getInviteData = async (req, res) => {
    try {
        var time = req.body.time;
        var gte = moment(time);
        console.log(gte);
        inviteData = await Invite.find({ invitor_id: req.body.user._id, endTime: { '$gte': gte }, service: false }).populate('visitors.id').sort({ 'startTime': 1 });
        console.log(inviteData);
        if (inviteData.length == 0) {
            return res.json({ success: false, result: 'There is no invites you have sent nowadays.' });
        } else {
            res.json({ success: true, result: inviteData });
        }
    } catch (e) {
        console.log(e.message);
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getQR = async (req, res) => {
    try {
        var id = req.body.user._id;

        // var residential_id = req.body.residential_id;
        var user = await Users.findOne({ '_id': id, 'is_user': true });
        if (user) {
            // var qr = id.toString() + '_' + 'resident' + '_' + moment().format('YYYY/MM/DD/HH:mm:ss');
            var time = moment().add(3, 'minutes');
            var qr = id.toString() + '_' + time.format('YYYY/MM/DD/HH:mm:ss');

            qr = jwt.encode(qr, common.qrCryptKey);
            return res.json({
                success: true,
                result: qr
            });
        }
        return res.json({
            success: false,
            error: 'Invalid user'
        });

    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.getProviderQR = async (req, res) => {
    console.log('here');
    try {
        var service_id = req.body.service_id;
        var service = await RecService.findById(service_id);
        if (!service) {
            res.json({
                success: false,
                error: 'Invalid service provider.'
            });
        } else {
            service.provider.enter_method = 1;
            await service.save();
            // var qr = provider_id + '_' + 'provider' + '_' + user_id;
            var qr = service.provider.id + '_' + 'infinite';
            var invites = await Invite.find({ service: true, service_id: service_id });
            for (var invite of invites) {
                invite.visitors[0].enter_method = 1;
                await invite.save();
            }
            qr = jwt.encode(qr, common.qrCryptKey);
            return res.json({
                success: true,
                result: qr
            });
        }
    } catch (e) {
        console.log(e.message)
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.getUnsavedInvitation = async (req, res) => {
    try {
        var visitor_id = req.body.user._id;
        var invitations = await Invite.find({ 'visitors.id': visitor_id, 'visitors.saved': false }).populate('invitor_id', 'full_name');
        res.json({ success: true, result: invitations });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.saveUnsavedInvitation = async (req, res) => {
    try {
        var visitor_id = req.body.user._id;
        var invitations = await Invite.find({ 'visitors.id': visitor_id, 'visitors.saved': false });
        invitations.forEach(async (e) => {
            e.visitors = e.visitors.map((visitor) => {
                if (visitor.id.toString() == visitor_id.toString()) {
                    console.log('sdfsef');
                    visitor.saved = true;
                    return visitor;
                } else {
                    return visitor;
                }
            });
            await e.save();
        });
        res.json({ success: true });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getInvitationData = async (req, res) => {
    try {
        var visitor_id = req.body.user._id;
        console.log(visitor_id);
        var gte = moment()

        var invitations = await Invite.find({
            'visitors.id': visitor_id, service: false,
            'endTime': { '$gte': gte }
        }).populate('invitor_id', 'full_name _id img_url phone_number').populate('service_id').populate('event_id').populate('residential_id').sort({ 'startTime': 1 });
        var new_invitations = [];
        invitations = JSON.parse(JSON.stringify(invitations));

        for (var inv of invitations) {
            console.log(inv);
            var residense = await Residense.findOne({ user_id: inv.invitor_id._id, residential_id: inv.residential_id._id });
            inv.lat = residense.latitude || 0;
            inv.lng = residense.longitude || 0;
            inv.direction = residense.comment;
            new_invitations.push(inv);
        }
        // console.log(new_invitations);
        res.json({ success: true, result: new_invitations });

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getInvitationDetail = async (req, res) => {
    try {
        var invitor_id = req.body.invitor_id;
        var residential_id = req.body.residential_id;
        var residential = await Residential.findById(residential_id, 'latitude longitude');
        var residense = await Residense.find({ user_id: invitor_id, residential_id: residential_id }, 'latitude longitude');
        if (!residential_id || !reisdense)
            return res.json({ success: false, error: 'Something went wrong' });
        res.json({ success: true, residential, residense });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getFavorite = async (req, res) => {
    try {
        favorite = await Favorite.find({
            'user_id': req.body.user._id
        }).populate('favorite_id', 'full_name img_url');

        res.json({ success: true, result: favorite });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}

exports.addFavorite = async (req, res) => {
    try {
        var { user, favorites, send_invitation } = req.body;
        console.log(favorites, send_invitation);
        for (var favorite of favorites) {
            const phone = favorite.phone_number;
            if (favorite.is_member) {
                var fav_user = await Users.findOne({ phone_number: phone, is_user: true });
                if (fav_user == null) continue;
                if (phone == user.phone_number) continue;
                let f = await Favorite.findOne({ user_id: user._id, favorite_id: fav_user._id });
                if (f) continue;
                await Favorite.create({ user_id: user._id, favorite_id: fav_user._id, });
            } else if (send_invitation) {
                console.log('sending SMS');
                twilio.sendSMS('Some of the EIEO users want to add you as his favorite.\nPlease install EIEO app from', common.phone_number, phone);
            }
        }
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}

exports.removeFavorite = async (req, res) => {
    try {
        var id = req.params.id;
        await Favorite.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};

exports.getTags = async (req, res) => {
    try {
        const tags = await Users.findById(req.body.user._id, 'tags');
        res.json({ success: true, result: tags });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.createTag = async (req, res) => {
    try {
        var { user, tag } = req.body;
        console.log(tag);
        if (!tag.name || !tag.tagID) {
            return res.json({ success: false, error: 'Invalid tag' });
        } {
            let tags = (await Users.findById(user._id, 'tags')).tags || [];
            tags.push(tag);
            await Users.updateOne({ _id: req.body.user._id }, { tags: tags });
            console.log('here');

            return res.json({ success: true });
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.removeTag = async (req, res) => {
    try {
        const tag_id = req.params.id;
        let tags = (await Users.findById(req.body.user._id, 'tags')).tags;

        tags = tags.filter(tag => {
            if (tag._id != tag_id) return tag
        });
        await Users.updateOne({
            _id: req.body.user._id
        }, {
            tags: tags
        });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.createEvent = async (req, res) => {
    try {
        var {
            visitors,
            user,
            event
        } = req.body;
        event.user_id = user._id;
        const newEvent = await Event.create(event);

        event.event_id = newEvent._id;
        event.event = true;
        var result = await AddInvite(visitors, user._id, event, true);
        res.json({ success: true, result: result });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.updateEvent = async (req, res) => {
    try {
        var {
            visitors,
            user,
            event,
            id,
            invite_id
        } = req.body;
        console.log(id, invite_id);
        await Event.findByIdAndDelete(id);
        await Invite.findByIdAndDelete(invite_id);
        event.user_id = user._id;
        const newEvent = await Event.create(event);

        event.event_id = newEvent._id;
        event.event = true;
        var result = await AddInvite(visitors, user._id, event, true);
        res.json({ success: true, result: result });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getEvents = async (req, res) => {
    try {
        const events = await Invite.find({
            'invitor_id': req.body.user._id,
            'event': true
        }).populate('visitors.id', 'full_name img_url phone_number device_token').sort({ 'startTime': 1 });
        // for (var i = 0; i < events.length; i++) {
        //     var event = events[i];
        //     for (let j = 0; j < event.visitors.length; j++) {
        //         const visitor = event.visitors[j];
        //         if (visitor.id.device_token) {
        //             events[i].visitors[j].id.is_member = true;
        //         } else {
        //             events[i].visitors[j].id.is_member = false;
        //         }
        //     }
        // }
        res.json({ success: true, result: events });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getEvent = async (req, res) => {
    try {
        var event_id = req.params.id;
        var user = req.body.user;
        console.log(event_id, user._id);
        const invite = await Invite.findOne({
            event_id: event_id,
            invitor_id: user._id,
            event: true
        });
        res.json({ success: true, result: invite });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.removeEvent = async (req, res) => {
    try {
        var event_id = req.params.id;
        var invites = await Invite.find({ event: true, event_id: event_id });
        for (var invite of invites) {
            await invite.deleteOne();
        }
        const result = await Event.deleteOne({
            "_id": event_id
        });
        res.json({
            success: true,
            result,
        });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}

exports.addRecService = async (req, res) => {
    try {
        var service = req.body.service;
        var user_id = req.body.user._id;
        var update = req.body.update;
        var id = service.id;
        var provider_id;
        if (update) {
            if (id) {
                var rec = await RecService.findByIdAndDelete(id);
                console.log(rec);
                provider_id = rec.provider.id;
                var invites = await Invite.find({ service: true, service_id: id });
                for (var invite of invites) {
                    await invite.deleteOne();
                }
            }
        }
        var result = await addRecService(service, user_id, update, provider_id);
        res.json(result);
    } catch (e) {
        return res.status(400).json({
            error: e.message
        });
    }
};
const addRecService = async (service, user_id, update, provider_id) => {
    service.user_id = user_id;
    var provider = service.provider;
    var newProvider;
    if (!provider.full_name) {
        return { success: false, error: 'Invalid input' };
    }
    var residense = await Residense.findOne({ user_id: user_id, default: true });

    if (!residense) {
        return { success: false, error: 'No resident' };
    }
    var residential_id = residense.residential_id;
    if (update) {
        if (provider_id) {
            if (provider.phone_number) {
                var tmp_user = await Users.findOne({ "phone_number": provider.phone_number });
                if (tmp_user) {
                    if (tmp_user._id.toString() != provider_id.toString()) {
                        return { success: false, error: 'phone number used' };
                    }
                } else {
                    await Users.findByIdAndUpdate(provider_id, { 'phone_number': provider.phone_number, 'full_name': provider.full_name });
                }
            }
            await Users.findByIdAndUpdate(provider_id, { 'full_name': provider.full_name });
        }
        service.provider.id = provider_id;
    } else if (provider.phone_number) {
        var tmp = await Users.findOne({
            phone_number: provider.phone_number
        });
        if (!tmp) {
            provider.is_user = false;
            provider = await Users.create(provider);
            service.provider.id = provider._id;
        } else {
            service.provider.id = tmp._id;
        }
    } else {
        provider.is_user = false;
        newProvider = await Users.create(provider);
        provider_id = newProvider._id;
        service.provider.id = newProvider._id;
    }
    console.log(newProvider);

    service.residential_id = residential_id;
    service.startTime = moment(service.startTime);
    service.endTime = moment(service.endTime);
    service.createdTime = moment(service.createdTime);
    var newService = await RecService.create(service);

    // newServ
    var schedule = newService.schedule;
    var day = (moment().day() + 6) % 7;
    for (let i = day; i < 7; i++) {
        if (schedule[i] == '1') {
            var visit = {};
            visit.invitor_id = newService.user_id;
            provider.id = provider_id;
            visit.service = true;
            visit.service_id = newService._id;
            visit.residential_id = newService.residential_id;
            visit.startTime = moment(newService.startTime).add(i - day, 'days');
            visit.endTime = moment(newService.endTime).add(i - day, 'days');
            visit.description = newService.description;
            visit.visitors = [{ id: provider_id }];
            await Invite.create(visit);
            // await AddInvite([provider], newService.user_id, visit, true);
        }
    }
    if (newService) {
        return { success: true, result: newService._id };
    } else {
        return { success: false, message: 'Failed to create service' };
    }
}
exports.updateRecService = async (req, res) => {
    try {
        var { service, user, id } = req.body;
        await RecService.findByIdAndDelete(id);
        var result = await addRecService(service, user._id);
        res.json({ success: true, result: result });
    } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
    }
}
exports.removeRecService = async (req, res) => {
    try {
        var id = req.params.id;
        console.log(id);
        var service = await RecService.findByIdAndDelete(id);
        var provider_id = service.provider.id;
        var user = await Users.findById(provider_id);
        if (!user.is_user && !user.phone_number) {
            var bio_data = user.bio_data;
            var img_url = user.img_url;
            await Users.findByIdAndDelete(provider_id);
            if (bio_data) facialAWS.deleteFace([bio_data]);
            if (img_url) s3AWS.delete_image(img_url);
        }
        var invites = await Invite.find({ service: true, service_id: id });
        for (var invite of invites) {
            await invite.deleteOne();
        }
        res.json({ success: true });
    } catch (e) {
        console.log(e);
        return res.status(400).json({ success: false, error: e.message });
    }
}
exports.setProviderBio = async (req, res) => {
    try {
        var { img, service_id, user } = req.body;
        var service = await RecService.findById(service_id).populate('provider.id');
        console.log('here', service_id);
        if (img) {
            var has_bio = await facialAWS.detect_face(img);
            if (!has_bio.success) {
                return res.json({ success: false, error: 0 });
            }
            if (service) {
                var result = await facialAWS.search_face({ photo: img });
                if (result.success) {
                    var tmp = await Users.findById(result.face.ExternalImageId);
                    if (tmp._id.toString() != service.provider.id.toString()) {
                        return res.json({ success: false, error: 1 });
                    }
                }
                if (service.provider.id.bio_data) {
                    await facialAWS.deleteFace([service.provider.id.bio_data]);
                }
                var bio_data = '';
                console.log(service.provider.id);
                var result = await facialAWS.indexFaces({
                    photo: img,
                    user_id: service.provider.id._id
                });
                console.log(result);
                if (result.success) {
                    bio_data = result.face_id;
                }
                var result = await s3AWS.upload_image(img, true, service.provider.id._id);
                var img_url = '';
                if (result.success)
                    img_url = result.img_url;
                await Users.findByIdAndUpdate(service.provider.id._id, { bio_data: bio_data, img_url: img_url });
                service.provider.enter_method = 0;
                await service.save();
                var invites = await Invite.find({ service: true, service_id: service_id });
                for (var invite of invites) {
                    invite.visitors[0].enter_method = 1;
                    await invite.save();
                }
                return res.json({ success: true });
            } else {
                return res.json({ success: false, error: 2 });
            }
        }
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getRecService = async (req, res) => {
    try {
        var services = await RecService.find({
            'user_id': req.body.user._id
        }).populate('provider.id', 'phone_number full_name');
        res.json({ success: true, result: services });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }

};

const getRecService = async (user_id) => {
    try {
        var services = await RecService.find({
            'user_id': user_id
        }).populate('provider.id', 'phone_number full_name');
        return services;
    } catch (e) {
        return null;
    }
}



exports.getResidential = async (req, res) => {
    try {
        var user_id = req.body.user._id;
        var residenses = await Residense.find({ user_id: user_id }).populate({ path: 'residential_id', populate: { path: 'admins', model: 'admins' } });

        if (residenses.length == 0) {
            res.json({ success: false, error: 'Invalid resident' });
        } else {
            var i = 0;
            for (var residense of residenses) {
                var country = await countries.findOne({ iso2: residense.residential_id.country });
                residenses[i].residential_id.country = country.name;
                i++;
            }
            res.json({ success: true, result: residenses });
        }
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.makeResidentialDefault = async (req, res) => {
    try {
        var { user, residential_id } = req.body;
        var rec = false,
            event = false,
            fav = false,
            plates = false;
        var residenses = await Residense.find({ user_id: user._id });
        for (var e of residenses) {
            if (e.residential_id == residential_id) {
                e.default = true;
                // e.favorite = true;
            } else {
                e.default = false;
                rec = e.rec_service;
                event = e.event;
                fav = e.favorite;
                plates = e.plates;
                // e.favorite = false;
            }
            await e.save();
            // return e;
        }
        return res.json({ success: true, red: rec, event: event, fav: fav, plates: plates });

    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getResidentialService = async (req, res) => {
    try {

        var residential = await Residense.findOne({ user_id: req.body.user._id, default: true }).populate('residential_id');
        if (residential) {
            var result = {
                success: true,
                favorite: residential.residential_id.favorite,
                service: residential.residential_id.rec_service,
                event: residential.residential_id.event,
                plate: residential.residential_id.plates
            };
            console.log(result)
            res.json(result);
        } else {
            res.json({ success: false, message: 'Invalid residential' });
        }
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, message: e.message });
    }
}
exports.addResidentialComment = async (req, res) => {
    try {
        var { comment, id, user } = req.body;
        await Residense.findByIdAndUpdate(id, { comment: comment });

        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.sendMessageToBooth = async (req, res) => {
    try {
        var { user, notification_id, grantee } = req.body;
        // console.log(message, resident);
        // var residential = await Residential.findById(booth.residential_id);
        // if (!residential)
        //     return res.json({ success: false, error: 'Something went wrong' });
        // grantee = Boolean(grantee);
        console.log(grantee);
        console.log(grantee ? 'allowed' : 'denied');
        var notification_user = await NotificationUser.findById(notification_id);
        notification_user.read = true;
        var notification = {
            title: user.full_name,
            body: `The resident ${grantee == 'true' ? 'allowed' : 'denied'} the ${common.notificationName[notification_user.type]}`,
            type: notification_user.type,
            read: false,
            other: notification_user.other,
            id: notification_user.booth,
            user: user._id,
            created: moment().utc()
        },
            notification = await NotificationBooth.create(notification);
        var token = (await Booths.findById(notification_user.booth)).device_token;

        // await notification_user.save();
        await notification_user.deleteOne();
        var result = await notify.notify_booth(notification.title, notification.body, '1', token, { type: notification_user.type.toString(), notification_id: notification._id.toString() });
        console.log(result);
        res.json({ success: result });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}

exports.setNotification = async (req, res) => {
    try {
        var { user, favorite_access, event_access, provider_access } = req.body;
        var _user = await Users.findById(user._id);
        _user.favorite_access = favorite_access;
        _user.provider_access = provider_access;
        _user.event_access = event_access;
        await _user.save();
        res.json({ success: true });
    } catch (e) {
        console.log(e.message);
    }
}
exports.getNotificationSetting = async (req, res) => {
    try {
        var { user } = req.body;
        var _user = Users.findById(user._id);
        res.json({ success: true, result: [_user.favorite_access, _user.provider_access, _user.event_access] });
    } catch (e) {
        console.log(e.message);
    }
}


exports.update = async (req, res) => {
    try {
        var {
            full_name,
            email,
            user,
            img
        } = req.body;
        if (!user.is_user) {
            return res.json({ success: false, error: 0 });
        }
        var tmp = await Users.findOne({ email: email });
        if (tmp && tmp._id.toString() != user._id.toString())
            return res.json({ success: false, error: 1 });
        if (img) {
            var has_bio = (await facialAWS.detect_face(img)).success;

            var result = await facialAWS.search_face({ photo: img });
            if (result.success) {
                var tmp = await Users.findById(result.face.ExternalImageId);
                if (tmp) {
                    if (tmp._id.toString() != user._id.toString()) {
                        return res.json({ success: false, error: 2 });
                    }
                }
            }
            if (has_bio) {
                if (user.bio_data) {
                    await facialAWS.deleteFace([user.bio_data]);
                }
                var bio_data = '';
                var result = await facialAWS.indexFaces({
                    photo: img,
                    user_id: user._id
                });
                if (result.success) {
                    bio_data = result.face_id;
                }
            }
            var result = await s3AWS.upload_image(img, true, user._id);
            var img_url = '';
            if (result.success)
                var img_url = result.img_url;
            await Users.findByIdAndUpdate(user._id, {
                full_name: full_name || tmp.full_name,
                email: email,
                img_url: img_url,
                bio_data: bio_data
            });
            res.json({ success: true, img_url: img_url, has_bio: has_bio });
        } else {
            await Users.findByIdAndUpdate(user.id, { full_name: full_name, email: email });
            res.json({ success: true, img_url: user.img_url, has_bio: false });
        }

    } catch (e) {
        console.log(e);
        res.status(400).json({
            success: false,
            error: e.message
        })
    }
}
exports.getProfile = async (req, res) => {
    try {
        var id = req.body.user._id;
        var user = await Users.findById(id, 'full_name email img_url favorite_access provider_access event_access');
        if (user) {
            res.json({ success: true, result: user });
        } else {
            res.json({ success: false, error: 'Invalid user' });
        }
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}

exports.getNotifications = async (req, res) => {
    try {
        var user = req.body.user;
        var notifications = await NotificationUser.find({ id: user._id }).populate('booth', 'full_name').sort({ 'created': -1 });

        res.json({ success: true, result: notifications });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}

exports.validateContact = async (req, res) => {
    try {
        var contacts = req.body.contacts;
        if (contacts.length == 0) {
            return res.json({ success: true, result: [] });
        }
        var result = [];
        for (const contact of contacts) {
            var user = await Users.findOne({ 'phone_number': contact.phone_number });
            // var user = await Users.findOne({'phone_number': {'$regex':contact.phone_number, '$options': 'i'}});
            var is_user = true;
            if (!user) {
                is_user = false;
            } else {
                is_user = user.uid != '' && user.uid != null;
            }

            result.push({ full_name: contact.full_name, phone_number: contact.phone_number, is_user: is_user, label: contact.label });
        }
        return res.json({ success: true, result: result });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: 'Something went wrong' });
    }
}

exports.confirm_message = async (req, res) => {
    try {
        var { user, notification_id } = req.body;
        var notification = await NotificationUser.findById(notification_id);
        if (!notification) return res.json({ success: false, error: 'Invalid notification' });
        notification.read = true;
        await notification.deleteOne();
        res.json({ success: true });

    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.detectFace = async (req, res) => {
    try {
        var img = req.body.img;
        var result = await facialAWS.detect_face(img);
        res.json(result);
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}

exports.getFaqs = async (req, res) => {
    try {
        var faqs = await Faqs.find();
        return res.json({ success: true, result: faqs });
    } catch (e) {
        console.log(e);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.log = async (req, res) => {
    try {
        console.log(req.body.log);
        res.json({ success: true });
    } catch (e) {
        console.log(e)
        res.status(400).json({ success: false, error: e.message });
    }
}
const GetDateTimeFromNow = async (days, hours, minutes) => {
    return moment().subtract(days, 'days').subtract(hours, 'hours').subtract(minutes, 'minutes').format('YYYY/MM/DD/HH:mm');
}

const GetDateTimeFrom = async (dateTime, days, hours, minutes) => {
    return moment(dateTime, 'YYYY/MM/DD/HH:mm').subtract(days, 'days').subtract(hours, 'hours').subtract(minutes, 'minutes').format('YYYY/MM/DD/HH:mm');
}

const create_rec_visit = async () => {
    try {
        var services = await RecService.find();
        for (let j = 0; j < services.length; j++) {
            var newService = services[j];
            var schedule = newService.schedule;
            var day = 0;
            for (let i = day; i < 7; i++) {
                if (schedule[i] == '1') {
                    var visit = {};
                    visit.service = true;
                    visit.service_id = newService._id;
                    visit.startTime = moment(newService.startTime).add(i - day + 1, 'days');
                    visit.endTime = moment(newService.endTime).add(i - day + 1, 'days');
                    visit.description = newService.description;
                    await AddInvite([provider], newService.user_id, visit, true);
                }
            }
        }
    } catch (e) {
        console.log(e.message);
    }
}

cron.schedule('0 0 0 * * Monday', create_rec_visit);