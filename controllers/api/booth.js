require('../../app/constants');
var Residential = require('../../models/residential');
var Users = require('../../models/users');
var Residense = require('../../models/residense');
var Booths = require('../../models/booths');
var Invite = require('../../models/invite');
var RecService = require('../../models/recurring_service');
var NotificationUser = require('../../models/notification_user');
var NotificationBooth = require('../../models/notification_booth');
var Favorites = require('../../models/favorite');
var common = require('../../app/common');
const cron = require("node-cron");
var moment = require('moment');
var jwt = require('jwt-simple');
var mongoose = require('mongoose');
var boothKey = common.boothCryptKey;
var admin = require('./admin');
var s3AWS = require('../s3');
var facialAWS = require('../facial');
var plate = require('../plate');
var notify = require('../notification');
const { sendMessageToBooth } = require('./user');
const residense = require('../../models/residense');
var axios = require('axios').default;
exports.login = async (req, res) => {
    try {
        var { username, password, deviceId } = req.body;
        var booth = await Booths.findOne({
            user_name: username
        });
        if (booth == null) {
            return res.status(400).json({ error: 'Username is invalid.' });
        }
        var savedPassword = GetHash(booth.password);
        if (password != savedPassword) {
            return res.status(400).json({ error: 'Incorrect password.' });
        }
        booth.device_token = deviceId;
        await booth.save()
        var residential = await Residential.findById(booth.residential_id, 'latitude longitude');
        var result = {};
        // result.booth = booth;
        result.token = jwt.encode({ _id: booth._id, deviceId: deviceId }, boothKey);
        result.latitude = residential.latitude;
        result.longitude = residential.longitude;

        // var result = await GetBoothData(booth);
        res.json({ success: true, result: result });
    } catch (e) {
        res.status(400).json({ success: false, error: 2 });
    }
};

exports.authenticate = async (req, res, next) => {
    var token = req.headers.authorization;
    try {
        console.log(token);
        var payload = jwt.decode(token, boothKey);
        var booth = await Booths.findOne({ _id: payload._id });
        req.body.booth = booth;
        if ((booth.device_token || '') != '' && (booth.device_token || '').toString() != (payload.deviceId || '').toString())
            return res.json({ success: false, multipleLogin: true });
        next();
    } catch (e) {
        console.log(e);
        res.status(400).json({
            success: false,
            message: e.message
        });
    }
}

exports.loginjwt = async (req, res) => {
    try {
        let booth = req.body.booth;
        if (booth) {
            var residential = await Residential.findById(booth.residential_id, 'latitude longitude');
            var result = {};
            result.booth = booth;
            result.latitude = residential.latitude;
            result.longitude = residential.longitude;
            result.token = jwt.encode({ _id: booth._id, deviceId: booth.device_token }, boothKey);
            // var result = await GetBoothData(booth);
            return res.json({ success: true, result: result });
        } else {
            return res.json({
                success: false,
                message: 'Invalid booth.',
                login: false
            });
        }
    } catch (e) {
        res.status(400).json({
            success: false,
            message: e.message
        });
    }
}

exports.update_device_token = async (req, res) => {
    try {
        var id = req.body.booth._id;
        var token = req.body.device_token;
        if (!token) {
            return res.json({ success: false, error: 'Invalid device' });
        }
        var booth = await Booths.findById(id);
        // if (booth.device_token == '') {
        //     booth.device_token = token;
        // } else if (booth.device_token != token) {
        //     return res.json({ success: false, error: 'Multiple log in' });
        // }
        booth.device_token = token;
        await booth.save();
        res.json({ success: true, result: booth });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: 'Something went wrong', error: e.message });
    }
}
exports.logout = async (req, res) => {
    console.log('here');
    try {
        var id = req.body.booth._id;
        var booth = await Booths.findById(id);
        booth.device_token = '';
        await booth.save();
        res.json({ success: true, result: '' });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.tmp = async (req, res) => {
    console.log('sjefijsef');
}
exports.getResidents = async (req, res) => {
    try {
        var booth = req.body.booth;
        var residents = await Residense.find({
            residential_id: booth.residential_id
        }, 'house_id comment latitude longitude').populate('user_id', 'full_name img_url');
        res.json({ success: true, result: residents });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.getResident = async (req, res) => {
    try {
        var { id } = req.params;
        var booth = req.body.booth;
        var resident = await Residense.findOne({ user_id: id, residential_id: booth.residential_id }).populate('user_id', 'full_name img_url is_user');
        if (!resident.latitude) resident.latitude = 0;
        if (!resident.longitude) resident.longitude = 0;

        console.log(resident);
        if (!resident || !resident.user_id.is_user) return res.json({ success: false, error: 'Invalid resident' });
        res.json({ success: true, result: resident });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
};
exports.getUser = async (req, res) => {
    try {
        var {
            id
        } = req.params;
        var booth = req.body.booth;
        var resident = await Residense.findOne({
            user_id: id,
            residential_id: booth.residential_id
        }).populate('user_id', 'full_name img_url');
        if (resident) {
            return res.json({
                resident: resident,
                visitor: null
            });
        }
        var visitor = await Users.findById(id, 'full_name img_url');
        if (!visitor)
            return res.status(400).json({
                error: 'Invalid user'
            });
        var invite = await Invite.findOne({
            'visitors.id': id,
            residential_id: booth.residential_id
        });
        if (!invite)
            return res.status(400).json({
                error: 'Invalid visitor'
            });
        let _resident = await Residense.findOne({
            user_id: invite.invitor_id,
            residential_id: booth.residential_id
        }).populate('user_id', 'full_name img_url');
        if (!_resident)
            return res.status(400).json({
                error: 'Something went wrong'
            });

        console.log(visitor);
        return res.json({
            resident: _resident,
            visitor: visitor
        });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({
            error: e.message
        });
    }
};

exports.getSchedule = async (req, res) => {
    try {
        var date = req.body.date;
        var residential_id = req.body.booth.residential_id;
        console.log(date, residential_id);
        var visit_info = await admin.GetVisitInfo(residential_id, date);
        res.json({ success: true, result: visit_info });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
};
exports.sendMessageToResident = async (req, res) => {
    try {
        console.log(req.body);
        var { booth, message, type, resident_id, other, img, is_img, is_event, is_favorite, is_service } = req.body;
        var img_url;
        if (!is_img) img_url = img;
        var residential = await Residential.findById(booth.residential_id);
        if (!residential)
            return res.json({ success: false, error: 'Something went wrong' });
        var notification = {
            body: residential.name,
            title: booth.full_name,
            message: message,
            type: type.toString(),
            read: false,
            other: other,
            img_url: img_url || '',
            id: resident_id,
            booth: booth._id,
            created: moment().utc()
        };
        var data = {
            title: booth.full_name,
            type: type.toString(),
        }
        console.log(notification);

        var resident = await Users.findById(resident_id);
        if (type == 6) {
            var img = req.body.img;
            var is_img = req.body.is_img;
            if (img) {
                if (is_img) {
                    var upload = await s3AWS.upload_image(img, true, resident._id + moment().utc());
                    if (upload.success) {
                        notification.img_url = upload.img_url;
                    }
                } else {
                    notification.img_url = img;
                }
            }
        }
        if (type == 7 && is_service && !resident.provider_access) { return res.json({ success: true }); }
        if (type == 10 && is_event && !resident.provider_access) { return res.json({ success: true }); }
        if (type == 9) { if (!resident.favorite_access) { return res.json({ success: true }); } }
        var token = resident.device_token;
        if (!token) {
            return res.json({ success: false, error: 'Invalid device token' });
        }
        notification = await NotificationUser.create(notification);

        if ((type == 6 && req.body.is_event && !resident.event_access) || (type == 7 && !resident.provider_access) || (type == 9 && !resident.favorite_access)) return res.json({ success: true });

        var result = await notify.notify_user(notification.title, notification.body, '1', token, data);
        res.json({ success: true, result: result });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.extendVisit = async (req, res) => {
    try {
        var { visitor_id, invite_id, resident_id, booth } = req.body;
        var invite = await Invite.findById(invite_id).populate('invitor_id', 'full_name').populate('visitors.id', 'full_name').populate('visitors.booth', 'full_name');
        console.log(invite);
        if (!invite) {
            return res.json({ success: false, error: 'Invalid request.' });
        }
        console.log('>>>>>>>>>>>>>>>>>>>>>>here>>>>>>>>>>>>>>>>>>>>>>');
        if (moment().diff(moment(invite.endTime), 'hours') < 2) {
            invite.endTime = moment(invite.endTime).add(2, 'hours');
        } else {
            invite.endTime = moment(invite.endTime).add(moment().diff(moment(invite.endTime), 'hours') + 1, 'hours');
        }
        invite.visitors = invite.visitors.map(e => {
            if (e.status == 3) {
                e.status = 1;
                return e;
            }
            return e;
        })
        await invite.save();
        res.json({ success: true, result: invite });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getGuestInvitation = async (req, res) => {
    try {
        var { guest, booth, status } = req.body;
        var invitations;
        if (status == 4) {
            invitations = await Invite.find({ 'visitors.id': guest, 'residential_id': booth.residential_id }).populate('invitor_id', 'full_name img_url');
        } else
            invitations = await Invite.find({ 'visitors.id': guest, 'residential_id': booth.residential_id, 'visitors.status': status }).populate('invitor_id', 'full_name img_url');
        invitations = JSON.parse(JSON.stringify(invitations));
        invitations = invitations.map(e => {
            e.visitors.map(ee => {
                if (ee.id == guest) {
                    e.status = ee.status;
                }
                return ee;
            });
            // console.log(e);
            return e;
        });
        guest = await Users.findById(guest, 'full_name');
        if (!guest) {
            return res.json({ success: false, error: 'Invaid guest' });
        }
        // console.log('here', invitations);
        return res.json({ success: true, result: { invitations: invitations, guest: guest } });

    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getGuestServices = async (req, res) => {
    try {
        var { guest, booth, status } = req.body;
        var invitations;
        if (status == 4) {
            // services = await RecService.find({'provider.id':guest, 'residential_id':booth.residential_id}).populate('user_id', 'full_name img_url')
            invitations = await Invite.find({ 'visitors.id': guest, 'residential_id': booth.residential_id, 'service': true }).populate('invitor_id', 'full_name img_url');
        } else
            invitations = await Invite.find({ 'visitors.id': guest, 'residential_id': booth.residential_id, 'visitors.status': status, 'service': true }).populate('invitor_id', 'full_name img_url');
        invitations = JSON.parse(JSON.stringify(invitations));
        invitations = invitations.map(e => {
            e.visitors.map(ee => {
                if (ee.id == guest) {
                    e.status = ee.status;
                }
                return ee;
            });
            // console.log(e);
            return e;
        });
        guest = await Users.findById(guest, 'full_name');
        if (!guest) {
            return res.json({ success: false, error: 'Invaid guest' });
        }
        // console.log('here', invitations);
        return res.json({ success: true, result: { invitations: invitations, guest: guest } });

    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getGuestFavorite = async (req, res) => {
    try {
        var { guest, booth } = req.body;
        console.log('here');
        var fs = await Favorites.find({ favorite_id: guest });
        var favorites = [];
        for (const f of fs) {
            var resident = await Residense.findOne({ user_id: f.user_id, residential_id: booth.residential_id }).populate('user_id', 'full_name img_url');
            if (resident) {
                favorites.push(resident);
            }
        }
        guest = await Users.findById(guest, 'full_name img_url');
        if (!guest) {
            return res.json({ success: false, error: 'Invaid guest' });
        }
        console.log(favorites);
        res.json({ success: true, result: { favorites: favorites, guest: guest } });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.setGuestStatus = async (req, res) => {
    try {
        var { invite_id, visitor_id, booth, status } = req.body;
        var notify = false;
        var is_event = false;
        var resident_id;
        console.log("here");
        if (status == 4 || status == 2) {
            var invites = await Invite.find({ 'visitors.id': visitor_id, $or: [{ 'visitors.status': 1 }, { 'visitors.status': 3 }] });
            for (var invite of invites) {
                invite.visitors.map(e => {
                    if (e.id == visitor_id) {
                        e.status = status;
                    }
                    return e;
                });
                await invite.save();
            } if (status == 2) {
                var plate_data = { name: '', number: '', region: '', type: '' }
                await Users.findByIdAndUpdate(visitor_id, { plate: plate_data });
            }
            return res.json({ success: true, result: { notify: notify, is_event: is_event } });
        }
        var invite = await Invite.findById(invite_id);
        invite.visitors.map(e => {
            if (e.id == visitor_id) {
                if (status == 1 && e.status == 0) {
                    notify = true;
                    resident_id = invite.invitor_id;
                    is_event = invite.event;
                    e.booth = booth._id;
                    e.status = status;
                } else if (status == 2 && (e.status == 1 || e.status == 3)) {
                    console.log('---------------------------');
                    e.status = status;
                }
            }
            return e;
        });
        await invite.save();
        return res.json({ success: true, result: { notify: notify, resident_id: resident_id, is_event: is_event } });
    } catch (e) {
        console.log(e);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.decreasePark = async (req, res) => {
    try {
        var type = req.body.type;
        var residential_id = req.body.booth.residential_id;
        var park = await Residential.findOne({ _id: residential_id, 'parks.park_type': type }, 'parks');
        if (!park) {
            return res.json({
                success: false,
                error: 'This residential has no parks'
            });
        }
        var success = true,
            message = 'Successed';
        park.parks = park.parks.map(e => {
            if (e.park_type == type) {
                if (e.cur_size == e.full_size) {
                    success = false;
                    message = 'Park is empty';
                    return e;
                }
                e.cur_size = e.cur_size + 1;
                return e;
            }
            return e;
        })
        await park.save();
        res.json({
            success: success,
            error: message,
            result: park.parks
        });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.increasePark = async (req, res) => {
    try {
        var type = req.body.type;
        var residential_id = req.body.booth.residential_id;
        var park = await Residential.findOne({
            _id: residential_id,
            'parks.park_type': type
        }, 'parks');
        if (!park) {
            return res.json({
                success: false,
                error: 'This residential has no parks'
            });
        }
        var success = true,
            message = 'Successed';
        park.parks = park.parks.map(e => {
            if (e.park_type == type) {
                if (e.cur_size == 0) {
                    success = false;
                    message = 'Park is empty';
                    return e;
                }
                e.cur_size = e.cur_size - 1;
                return e;
            }
            return e;
        });

        await park.save();
        res.json({
            success: success,
            error: message,
            result: park.parks
        });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.getFreeParkSpace = async (req, res) => {
    try {
        var type = req.body.type;
        var residential_id = req.body.booth.residential_id;
        var park = await Residential.findOne({
            _id: residential_id,
            'parks.park_type': type
        }, 'parks');
        if (!park) {
            return res.json({
                success: false,
                error: 'This residential has no parks'
            });
        }
        var success = true,
            size;

        park.parks.filter(e => {
            if (e.park_type == type) {
                return size = e.full_size - e.cur_size;
            }
        });
        res.json({ success: success, result: size });
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.scanFace = async (req, res) => {
    try {
        var booth = req.body.booth;
        var img = req.body.img;

        // buf = new Buffer.alloc(img.length, img.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        var result = await facialAWS.search_face({
            photo: img
        });
        if (result.success) {

            var user = await Users.findById(result.face.ExternalImageId);
            if (user) {
                // Validate if the user is resident
                console.log(user._id, booth.residential_id);
                var resident = await Residense.findOne({ user_id: user._id, residential_id: booth.residential_id });
                console.log('hereee----------,,,,,,,,,,,,,,,,,', resident);
                if (resident) {
                    result.full_name = user.full_name;
                    result.id = user._id;
                    return res.json(result);
                }
                // If not, validate if visitor
                var invite = await Invite.find({ 'visitors.id': user._id, 'residential_id': booth.residential_id, 'visitors.enter_method': 0, $or: [{ 'visitors.status': 1 }, { 'visitors.status': 0 }] });
                if (invite.length == 0) {
                    return res.json({ success: false, error: 'Invalid face' });
                }
                // invite = await Invite.find({ 'visitors.id': user._id, residential_id: booth.residential_id, 'visitors.status': 1, 'visitors.enter_method': 0, });
                // invite.map(inv=>{
                //     inv.visitors.map(e=>{
                //         if (e.id == user._id && e.status == 1) {
                //             e.status = 2;
                //             return e;
                //         }else {
                //             return e;
                //         }
                //     });
                //     inv.save();
                //     return inv;
                // });
                // invite = await Invite.find({ 'visitors.id': user._id, residential_id: booth.residential_id, 'visitors.status': 0, 'visitors.enter_method': 0, });
                invite.map(inv => {
                    inv.visitors.map(e => {
                        if (e.id == user._id && e.status == 0) {
                            e.status = 1;
                            return e;
                        } else if (e.id == user._id && e.status == 1) {
                            e.status = 2;
                            return e;
                        } else {
                            return e;
                        }
                    });
                    inv.save();
                    return inv;
                });


                if (invite.length > 0) {
                    result.full_name = user.full_name;
                    result.id = user._id;
                    return res.json(result);
                }

            } else {
                result.success = false;
                result.error = 'Invalid user';
                return res.json(result);

            }

        } else {
            console.log('error');
            res.json({
                success: false,
                error: result.error
            });
        }

    } catch (e) {
        console.log(e.message);
        res.status(400).json({
            error: e.message
        });
    }
}
exports.scan_face = async (req, res) => {
    try {
        var booth = req.body.booth;
        var img = req.body.img;

        var result = await facialAWS.search_face({ photo: img });
        if (result.success) {
            console.log('here', result.face.ExternalImageId);
            var user_id = result.face.ExternalImageId;

            var validation = await validateUser(user_id, booth.residential_id, req.body.gte, req.body.lte);
            console.log(validation);

            return res.json(validation);
        }
        return res.json(validation);
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getNotifications = async (req, res) => {
    try {
        var booth = req.body.booth;
        var notifications = await NotificationBooth.find({ id: booth._id }).populate('user', 'full_name img_url').sort({ 'created': -1 });
        res.json({ success: true, result: notifications });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.makeNotificationRead = async (req, res) => {
    try {
        id = req.body.id;
        var notification = await NotificationBooth.findById(id);
        if (notification) {
            notification.read = true;
            await notification.save();
            res.json({ success: true, result: notification });
        } else {
            res.json({ success: false, error: 'Invalid request' });
        }
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.makeNotificationsRead = async (req, res) => {
    try {
        id = req.body.id;
        var notifications = await NotificationBooth.find({ id: req.body.booth._id });
        for (var e of notifications) {
            e.read = true;
            await e.save();
        }
        res.json({ success: true });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getNotificationsCount = async (req, res) => {
    try {
        var booth = req.body.booth;
        var notifications = await NotificationBooth.find({ 'id': booth._id, });
        var cnt = 0;
        for (let i = 0; i < notifications.length; i++) {
            if (!notifications[i].read) {
                cnt++;
            }
        }

        res.json({ success: true, result: cnt });

    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.removeNotification = async (req, res) => {
    try {
        console.log(req.params.id);
        await NotificationBooth.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.removeNotifications = async (req, res) => {
    try {
        await NotificationBooth.deleteMany({ id: req.body.booth._id });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.scanQR = async (req, res) => {
    try {
        var residential_id = req.body.booth.residential_id;
        var qr = req.body.qr;
        var qr = jwt.decode(qr, common.qrCryptKey);
        console.log(qr);
        qr = qr.split('_');
        if (qr.length != 3) {
            throw 'Invalid QR code';
        }
        var id = qr[0];
        var type = qr[1];
        console.log(qr);
        if (type == 'user') {
            var resident = await Residense.findOne({
                user_id: id,
                residential_id: residential_id
            });
            if (resident) {
                var time = qr[2];
                time = moment(time, 'YYYY/MM/DD/HH:mm:ss');
                var now = moment().subtract(3, 'minutes');
                if (now > time) {
                    return res.json({
                        success: false,
                        error: 'Time expired'
                    });
                }
                var user = await Users.findById(id);
                return res.json({
                    success: true,
                    result: user.full_name
                });
            }
            return res.json({
                success: false,
                error: 'Invalid resident'
            });
        } else if (type == 'visitor') {
            var invite = await Invite.findOne({ 'visitors.id': id, residential_id: residential_id, _id: qr[2] }).populate("visitors.id", '_id full_name phone_number status');
            if (invite) {
                if (invite.visitors[0].status == 0) {
                    res.json({ success: true, result: invite.visitors[0].id.full_name });
                } else {
                    res.json({ success: false, error: 'Invalid QR code' });
                }
            } else {
                res.json({ success: false, error: 'Invalid QR code' });
            }
        } else if (type == 'provider') {
            console.log('here----------------->>');
            var service = await RecService.findOne({ 'provider.id': id, user_id: qr[2] }).populate('provider.id', '_id full_name phone_number');
            console.log(service);
            if (service) {
                return res.json({ success: true, result: service.provider.id.full_name });
            } else {
                return res.json({ success: false, error: "Invalid QR code" });
            }
        } else {
            return res.json({ success: false, error: "Invalid QR code" });
        }

        console.log(id, residential_id, time);


    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}
exports.scan_qr = async (req, res) => {
    try {
        var residential_id = req.body.booth.residential_id;
        var qr = req.body.qr;
        var qr = jwt.decode(qr, common.qrCryptKey);
        console.log(qr);
        qr = qr.split('_');
        if (qr.length != 2) {
            throw 'Invalid QR code';
        }
        var id = qr[0];
        var time = qr[1];
        var user;
        if (time != 'infinite') {
            time = moment(time, 'YYYY/MM/DD/HH:mm:ss');
            var now = moment(); //.subtract(3, 'minutes');
            if (now > time) {
                return res.json({
                    success: false,
                    error: 'Time expired'
                });
            }
            user = await Users.findById(id);
            if (!user) {
                return res.json({
                    success: false,
                    error: 'Invalid code-user is invalid'
                });
            }
        } else {
            user = await Users.findById(id);
            if (!user) {
                return res.json({
                    success: false,
                    error: 'Invalid code visitor is invalid'
                });
            }
            var service = await RecService.find({ 'provider.id': id, residential_id: residential_id });
            if (service.length == 0) {
                return res.json({
                    success: false,
                    error: 'Invalid code provider invalid'
                });
            }

        }
        var validation = await validateUser(user._id, residential_id, req.body.gte, req.body.lte, req.body.now);
        console.log('validation', validation);

        return res.json(validation);
    } catch (e) {
        console.log(e);
        res.status(400).json({ success: false, error: e.message });
    }
}
const GetHash = (str) => {
    return str;
}

const validateUser = async (id, residential_id, gte, lte, now) => {
    try {
        var user = await Users.findById(id);
        var is_resident = false,
            is_favorite = false,
            is_service = false,
            is_visitor = false;
        var wentout = await Invite.find({ 'visitors.id': id, residential_id: residential_id, 'visitors.status': 4 });
        if (wentout.length > 0) {
            for (var e of wentout) {
                console.log("visitors before saving: ", e.visitors)
                console.log(id)
                e.visitors = e.visitors.map(visitor => {
                    if (visitor.id.toString() == id.toString()) {
                        visitor.status = 1;
                        console.log('here')
                    }
                    return visitor;
                });
                console.log("visitors after saving: ", e.visitors)
                await e.save();
            }
            return { success: true, result: { show: 'none', id: user._id, full_name: user.full_name, img_url: user.img_url, type: [] } };
        }
        var arrived = await Invite.find({ 'visitors.id': id, residential_id: residential_id, $or: [{ 'visitors.status': 1 }, { 'visitors.status': 3 }] });
        console.log(arrived, id);
        if (arrived.length > 0) {
            return { success: true, result: { show: 'ending', id: user._id, full_name: user.full_name, img_url: user.img_url, type: [] } };
        }
        // var fav_arrivde = await Favorites.find({user_id:})
        var type = [];
        var residense = await Residense.find({ user_id: id, residential_id: residential_id });
        if (residense.length == 1) {
            type.push(0);
            is_resident = true;
        }
        var favorites = await Favorites.find({ favorite_id: id });
        var residents;
        var fav_cnt = 0;
        for (const f of favorites) {
            residents = await Residense.find({ user_id: f.user_id, residential_id: residential_id });
            if (residents.length > 0) {
                if (!is_favorite) {
                    type.push(1);
                    is_favorite = true;
                }
                fav_cnt++;
            }
        }

        var services = await RecService.find({ 'provider.id': id, 'residential_id': residential_id });
        console.log('here---1', now, gte, lte);
        for (const s of services) {
            var resident = await Residense.find({ user_id: s.user_id, residential_id: residential_id });
            if (resident.length > 0) {
                console.log('here---2');
                var diff = moment(s.createdTime).diff(moment(gte), 'seconds');
                var endTime = moment(s.endTime).add(diff, 'seconds');
                var startTime = moment(s.statTime).add(diff, 'seconds');
                // var endTime = moment(s.endTime).format('HH:mm:ss');
                // var day = moment().utc().format('YYYY-MM-DD:');
                // endTime = day + endTime;
                // endTime = moment(endTime, 'YYYY-MM-DD:HH:mm:ss');
                console.log('here---3', endTime);

                if (endTime.isBefore(moment(now))) continue;
                if (startTime.isAfter(moment(now).add(10, 'minutes'))) continue;
                var dayOfWeek = (moment(now).day() + 6) % 7;
                console.log('here---4', dayOfWeek);

                if (s.schedule[dayOfWeek] == '0') continue;
                type.push(2);
                console.log('here---5', type);
                is_service = true;
                break;
            }
        }

        var invites = await Invite.find({ 'visitors.id': id, 'visitors.status': 0, residential_id: residential_id, 'service': false, startTime: { $gte: gte, $lte: lte } });
        if (invites.length > 0) {
            type.push(3);
            is_visitor = true;
        }
        var result = { success: true, result: { type: type, id: id, full_name: user.full_name, img_url: user.img_url, show: 'detail', other: '', notify: false } };
        if (type.length > 1) return result;
        else if (type.length == 1) {
            if (is_resident) {
                result.result.show = 'none';
                return result;
            } else if (is_favorite) {
                if (fav_cnt == 1) {
                    result.result.other = residents[0].user_id;
                    var fav = await Favorites.findOne({ user_id: result.result.other, favorite_id: id });
                    if (fav.status == 0) {
                        fav.status = 1;
                        result.result.notify = true;
                        await fav.save();
                    } else {
                        fav.status = 0;
                        await fav.save();
                    }
                    result.result.show = 'none';
                }
                return result;
            } else if (is_service) {
                if (services.length == 1) {
                    result.result.show = 'none';
                    result.result.other = services[0]._id;
                    console.log(gte, lte, services[0]._id, is_service);

                    var inv = await Invite.findOne({ service_id: services[0]._id, service: true, 'visitors.status': 0, startTime: { $gte: gte, $lte: lte } });
                    console.log(inv)
                    if (inv == null) {
                        result.success = false;
                        console.log('here', result)
                    } else {
                        result.result.invite_id = inv._id;
                        result.result.id = inv.visitors[0].id;
                    }
                }
                return result;
            } else if (is_visitor) {
                if (invites.length == 1) {
                    result.result.other = invites[0]._id;
                    result.result.show = 'none';
                }
                return result;
            }

        }
        return { success: false, error: 'Invalid user' };



    } catch (e) {
        console.log(e);
        return { success: false, error: 'Something went wronggg' };
    }
}
exports.getResidentialService = async (req, res) => {
    try {

        var residential = await Residential.findById(req.body.booth.residential_id);
        if (residential) {
            var result = {
                success: true,
                result: {
                    favorite: residential.favorite,
                    service: residential.rec_service,
                    event: residential.event,
                    plate: residential.plates
                }
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
const GetBoothData = async (b) => {
    var token = jwt.encode({
        _id: b._id
    }, boothKey);
    var booth = await Booths.findById(b._id, 'full_name user_name _id').populate('residential_id', 'latitude longitude');
    b.longitude = booth.residential_id.longitude;
    b.latitude = booth.residential_id.latitude;
    // booth.residential_id = booth.residential_id._id;
    return {
        'token': token,
        'login': true,
        'booth': booth
    };
};

exports.add_plate = async (req, res) => {
    try {
        var img = req.body.img;
        var id = req.body.id;

        var result = await plate.scan_plate(img);

        if (result.success && result.result.results.length > 0) {
            result = result.result.results[0];
            var plate_data = {
                number: result.plate,
                region: result.region.code,
                type: result.vehicle.type
            }
            var tmp = await Users.find({
                'plate.number': plate_data.number
            });
            if (tmp.length > 0) {
                return res.json({
                    success: false,
                    error: 'Plate already registered'
                });
            }
            var user = await Users.findByIdAndUpdate(id, {
                plate: plate_data
            });
            console.log(user);
            console.log('here2');
            return res.json({
                success: true,
                result: {
                    plate_data: plate_data,
                    full_name: user.full_name,
                    id: user._id
                }
            });
        } else {
            res.json({
                success: false,
                error: 'Failed'
            });
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.remove_plate = async (req, res) => {
    try {
        var id = req.body.id;

        var plate_data = { name: '', number: '', region: '', type: '' }
        var user = await Users.findByIdAndUpdate(id, {
            plate: plate_data
        });
        return res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}

exports.scan_plate = async (req, res) => {
    try {
        var img = req.body.img;
        // var residential_id = req.body.booth.residential_id;
        var result = await plate.scan_plate(img);
        if (result.success) {
            var number = result.result.results[0].plate;
            console.log(number);
            var user = await Users.findOne({
                'plate.number': number
            });
            console.log(user);
            if (user) {
                res.json({
                    success: true,
                    result: {
                        full_name: user.full_name,
                        id: user._id
                    }
                });
            } else {
                res.json({
                    success: false,
                    error: 'Invalid plate'
                });
            }
        } else {
            console.log('here');
            res.json({
                success: false,
                error: result.error
            });
        }
    } catch (e) {
        res.status(400).json({
            success: false,
            error: e.message
        });
    }
}

const validateVisitTime = async () => {
    console.log('---------------cron working-----------------', moment().utc());
    try {
        var lte = moment().utc();
        var gte = moment().subtract(5, 'minutes').utc();
        var invites = await Invite.find({ endTime: { '$lte': lte, '$gte': gte } }).populate('invitor_id', 'full_name').populate('visitors.id', 'full_name').populate('visitors.booth', '_id');
        console.log(invites);
        for (let i = 0; i < invites.length; i++) {
            var invite = invites[i];
            invite.visitors = invite.visitors.map(e => {
                if (e.status == 1 || e.status == 3) {
                    e.status = 3;
                    notify_booth(invite, e);
                }
                return e;
            });
            invite.save();
        }

        return invites;
    } catch (e) {
        console.log(e);
        return;
    }
}

const notify_booth = async (invite, visitor) => {
    var token = (await Booths.findById(visitor.booth._id)).device_token;
    var notification = {
        title: invite.invitor_id.full_name,
        body: `${visitor.id.full_name} exceeded the visit time.`,
        type: 8,
        read: false,
        id: visitor.booth._id,
        user: invite.invitor_id,
        created: moment().utc()
    },
        notification = await NotificationBooth.create(notification);
    // var token = (await Booths.findById(booth_id)).device_token;
    var result = await notify.notify_booth(notification.title, notification.body, '1', token, { type: '8', notification_id: notification._id.toString() });

}
cron.schedule('0 */5 * * * *', validateVisitTime);