var jwt = require('jwt-simple');
var Users = require('../../models/users');
var Invite = require('../../models/invite');
var Residense = require('../../models/residense');
var notify = require('../notification');
var facial = require('../facial');
var s3 = require('../s3');
var common = require('../../app/common');
var moment = require('moment');


exports.validate = async (req, res) => {
    try {
        var { invite_id, visitor_id } = req.body;
        console.log(invite_id, visitor_id);
        var invite = await Invite.findOne({ _id: invite_id, 'visitors.id': visitor_id });
        console.log(invite);
        if (!invite) {
            return res.json({ success: false, error: 'Invalid' });
        }
        return res.json({ success: true });
    } catch (e) {
        console.log(e.message);
        return res.json({ success: false, error: e.message });
    }
}
exports.registerFace = async (req, res) => {
    try {
        var { visitor_id, invite_id, enter_method, img } = req.body;
        // var decrypted = jwt.decode(token, common.visitCryptKey);
        // var key = decrypted.split('_');
        // if (key.length !=2) {
        //     return res.json({success:false, error:"Invalid url"});
        // }
        var user = await Users.findById(visitor_id);
        if (!user) {
            return res.json({ success: false, error: 'Invalid visitor' });
        }
        var invite = await Invite.findOne({ _id: invite_id, 'visitors.id': visitor_id });
        if (!invite) {
            res.json({ success: false, error: 'Invalid visitor' });
        }

        // user.email = email;
        // user.full_name = full_name;
        // user.country_abbr = country_abbr;
        // user.country_code = country_code;
        if (!img) {
            res.json({ success: false, error: 'Image is empty.' });
        }
        var result = await s3.upload_image(img, true, user._id);
        if (result.success) {
            user.img_url = result.img_url;
        }
        var face = await facial.search_face({ photo: img });
        if (face.success) {
            if (face.face.ExternalImageId.toString() == user._id.toString()) {
                await user.save();
                return res.json({ success: true });
            } else {
                return res.json({ success: false, error: 'Invalid face' });
            }
        }
        face = await facial.indexFaces({ photo: img, user_id: user._id });
        console.log(face);
        if (face.success) {
            user.bio_data = face.face_id;
            await user.save();
            return res.json({ success: true, result: invite });
        } else {
            await user.save();
            return res.json({ success: false, error: face.error });
        }

    } catch (e) {
        console.log(e.message);
        res.status(400).json({ success: false, error: e.message });
    }
}
exports.getqr = async (req, res) => {
    try {
        var { phone_number, email, full_name, enter_method, country_code, country_abbr, visitor_id, invite_id } = req.body;
        var phone = phone_number;
        console.log(phone, email)
        var user = await Users.findOne({ 'phone_number': phone });
        console.log(user);
        if (!user || user._id.toString() != visitor_id.toString()) {
            return res.json({ success: false, error: 'Invalid visitor' });
        }
        user.email = email;
        user.full_name = full_name;
        user.country_abbr = country_abbr;
        user.country_code = country_code;
        user.phone_number = phone_number;
        await user.save();
        var invite = await Invite.findOne({ _id: invite_id, 'visitors.id': visitor_id });
        if (!invite) {
            res.json({ success: false, error: 'Invalid visitor' });
        }
        invite.visitors.map(e => {
            if (e.id == visitor_id) {
                e.enter_method = enter_method;
                return e;
            }
        });
        await invite.save();
        var qr = user._id + '_' + moment(invite.endTime).add(24, 'hours');
        // var qr = user._id + '_visitor_' + invite._id;
        qr = jwt.encode(qr, common.qrCryptKey);
        res.json({ success: true, result: { qr, invite } });
    } catch (e) {
        console.log(e);
        res.json({ success: false, error: 'Something went wrong' });
    }
}
exports.getInviteInfo = async (req, res) => {
    try {
        var { invite_id } = req.body;
        var invite = await Invite.findById(invite_id).populate('invitor_id').populate('residential_id');
        var user_id = invite.invitor_id._id;
        var residential_id = invite.residential_id._id;
        var residense = await Residense.findOne({ user_id: user_id, residential_id: residential_id });
        if (residense == null) return res.json({ success: false, error: 'Invalid resident' });
        if (invite == null) return res.json({ success: false, error: 'Invalid invite' });
        var invite_data = {
            full_name: invite.invitor_id.full_name,
            img_url: invite.invitor_id.img_url,
            event: invite.event,
            title: invite.title,
            start_time: invite.startTime,
            end_time: invite.endTime,
            description: invite.description,
            latitude: residense.latitude,
            longitude: residense.longitude,
        }
        res.json({ success: true, invite: invite_data });

    } catch (e) {
        res.status(400).json({ success: false, error: 'Something went wrong' });
    }
}