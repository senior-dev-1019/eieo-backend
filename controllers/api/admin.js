var Admin = require('../../models/admin');
var Residential = require('../../models/residential');
var Users = require('../../models/users');
var Residense = require('../../models/residense');
var Booths = require('../../models/booths');
var Invite = require('../../models/invite');
var Stas = require('../../models/statistics');
var Cities = require('../../models/cities');
var Countries = require('../../models/countries');
var Events = require('../../models/event');
var RecService = require('../../models/recurring_service');
var Favorites = require('../../models/favorite');
var NotificationBooth = require('../../models/notification_booth');
var NotificationUser = require('../../models/notification_user');
var Faqs = require('../../models/FAQ');
var User = require('./user');
var common = require('../../app/common');
const cron = require("node-cron");

var facialAWS = require('../facial');
var s3AWS = require('../s3');
var moment = require('moment');
var jwt = require('jwt-simple');
var mongoose = require('mongoose');
const {
    user
} = require('firebase-functions/lib/providers/auth');
var adminKey = common.adminCryptKey;

const getHash = (str) => {
    return str;
};

getEncToken = (data, key) => {
    return jwt.encode(data, key);
}

getDecToken = (data, key) => {
    return jwt.decode(data, key);
}

exports.signup = async(req, res) => {
    res.status(400).json({
        error: 'This platform does not support sign up'
    });
};

exports.login = async(req, res) => {
    try {
        var userdata = await Admin.findOne({
            user_name: req.body.user_name
        });

        if (userdata) {
            if (userdata.password == await getHash(req.body.password)) {
                let residential = await GetResidential(userdata);
                res.json({
                    token: getEncToken({
                        _id: userdata._id
                    }, adminKey),
                    admin: userdata,
                    residential_id: residential
                });
            } else {
                res.status(400).json({
                    error: 'Incorrect password'
                });
            }
        } else {
            res.status(400).json({
                error: "Username is invalid."
            });
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};
const GetResidential = async(admin) => {
    let residential;
    if (admin.authority == 1) {
        residential = await Residential.aggregate([{ $match: { "admins": mongoose.Types.ObjectId(admin._id) } }, { $lookup: { from: "countries", localField: "country", foreignField: "iso2", as: "country_name" } }]);

        if (residential.length == 1) {
            residential = residential[0];
            residential.country = residential.country_name[0].name;
            residential.country_name = null;
        } else {
            residential = null;
        }
    } else {
        residential = null;
    }
    return residential;
};
exports.loginjwt = async(req, res) => {
    try {
        let admin = req.body.admin;
        if (admin) {
            let residential = await GetResidential(admin);
            res.json({
                token: getEncToken({
                    _id: admin._id
                }, adminKey),
                admin: admin,
                admin: admin,
                residential: residential
            });
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.authenticate = async(req, res, next) => {
    var token = req.headers.authorization;
    try {
        var payload = getDecToken(token, adminKey);
        admin = await Admin.findOne({
            _id: payload._id
        });
        if (admin) {
            req.body.admin = admin;
        } else {
            res.status(400).json({
                error: 'User does not exist'
            });
        }
        next();
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};
exports.searchUserByImage = async(req, res) => {
    var img = req.body.img;
    // buf = new Buffer.alloc(img.length, img.replace(/^data:image\/\w+;base64,/, ""), 'base64');0
    var result = await facialAWS.search_face({ photo: img });
    if (result.success) {
        console.log(result.face);
        res.json(result.face);
    } else {
        res.status(400).json({
            error: result.error
        });
    }
}
exports.updateAvatar = async(req, res) => {
    try {
        var { img, admin } = req.body;
        if (!img || !admin) {
            return res.status(400).json('Wrong data');
        }
        var result = await s3AWS.upload_image(img, false, admin._id);
        if (result.success) {
            await Admin.findByIdAndUpdate(admin._id, { img_url: result.img_url });
            // admin = await Admin.findById(admin._id);
            return res.json(result);
        } else {
            return res.status(400).json(result.error);
        }
    } catch (e) {
        res.status(400).json(e.message);
    }
}
exports.getUsersResidentials = async(req, res) => {
    try {
        const residentials = await Residential.find();
        const users = await Users.aggregate([{ $match: { 'is_user': true } }, {
                $lookup: { from: "countries", localField: "country_abbr", foreignField: "iso2", as: "country_name" }
            },
            {
                $project: {
                    _id: 1,
                    full_name: 1,
                    email: 1,
                    country_code: 1,
                    phone_number: 1,
                    country_code: 1,
                    birth_day: 1,
                    img_url: 1,
                    country_name: { "$arrayElemAt": ["$country_name.name", 0] }
                }
            }
        ]);
        res.json({
            users,
            residentials
        });
    } catch (e) {

    }
};

exports.getResidentials = async(req, res) => {
    try {
        data = await Residential.aggregate([{
            $lookup: {
                from: "countries",
                localField: "country",
                foreignField: "iso2",
                as: "country_name"
            }
        }, {
            $project: {
                _id: 1,
                name: 1,
                admins: 1,
                city: 1,
                latitude: 1,
                longitude: 1,
                country_name: {
                    "$arrayElemAt": ["$country_name.name", 0]
                }
            }
        }]);
        res.json(data);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }

};

exports.createUser = async(req, res) => {
    try {
        let user_data = req.body.user;
        let uid = '';
        console.log(user_data);
        var img = user_data.img_url;
        user_data.img_url = '';
        if (user_data.country_code == '') {
            var code = await Countries.findOne({ iso2: user_data.country_abbr });
            user_data.country_code = code.code;
        }
        user_data.phone_number = user_data.country_code + user_data.phone_number;
        var birthday = moment(user_data.birth_day).format('DD/MM/yyyy');
        user_data.birth_day = birthday;
        var result = await User.register_user(user_data, uid, img);
        if (!result.register) {
            return res.status(400).json(result.message);
        }
        var newUser = await Users.findOne({
            phone_number: user_data.phone_number,
            is_user: true
        });
        var newResidenseData = [];
        var newReisdense = {};
        if (req.body.residenses) {
            req.body.residenses.forEach(residense => {
                newResidenseData.push({
                    "user_id": newUser._id,
                    "residential_id": residense.residential_id,
                    "house_id": residense.house_id,
                    "default": residense.default,
                    // "favorite": residense.favorite,
                    "latitude": residense.latitude,
                    "longitude": residense.longitude,
                    "comment": residense.comment
                });
            });

            if (newResidenseData.length != 0) {
                newReisdense = await Residense.create(newResidenseData);
            }
        }
        return res.json({
            newUser,
            newReisdense
        });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({
            error: 'Something went wrong'
        });
    }
};
exports.removeUser = async(req, res) => {
    try {
        var {
            id
        } = req.params;
        var user = await Users.findById(id);
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid user' });
        }
        if (user.img_url) {
            var result = await s3AWS.delete_image(`images/users/${user._id}`);
        }
        if (user.bio_data) {
            await facialAWS.deleteFace([user.bio_data]);
        }

        await Invite.deleteMany({ invitor_id: id });
        var invites = await Invite.find({ 'visitors.id': id });
        for (var invite of invites) {
            if (invite.visitors.length == 1) {
                await invite.deleteOne();
                continue;
            }
            invite.visitors = invite.visitors.map(e => {
                if (e.id != id) {
                    return e;
                }
            });
            await invite.save();
        }
        await Events.deleteMany({ invitor_id: id });
        await RecService.deleteMany({ user_id: id });
        await RecService.deleteMany({ 'provider.id': id });
        await Residense.deleteMany({ user_id: id });
        await Favorites.deleteMany({ user_id: id });
        await Favorites.deleteMany({ favorite_id: id });
        await NotificationBooth.deleteMany({ user: id });
        await NotificationUser.deleteMany({ id: id });
        await Users.deleteOne({ _id: id });
        var users = await Users.find({ is_user: true });
        res.json(users);
    } catch (e) {
        console.log(e.message);
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getUser = async(req, res) => {
    try {
        var {
            id
        } = req.params;
        if (!id) {
            return res.status(400).json('Invalid request');
        }
        var residentials = await Residential.find({}, 'name country city latitude longitude');
        var residense = await Residense.find({
            'user_id': id
        }).populate('residential_id', 'name country city latitude longitude');
        var user = await Users.findById(id, 'full_name email country_code country_abbr phone_number birth_day');
        if (!user) {
            return res.status(400).json('Invalid user');
        }
        if (!user.country_code) {
            var country = await Countries.findOne({ 'iso2': user.country_abbr });
            user.country_code = country.code;
            await user.save();
        }
        res.json({
            user: user,
            residense: residense,
            residentials: residentials
        });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};

exports.updateUser = async(req, res) => {
    try {
        var { id } = req.params;
        let user = req.body.user;
        if (user == null) {
            return res.status(400).json({ error: 'User data is empty' });
        }
        let tmp_user = await Users.findOne({ email: user.email });
        if (tmp_user != null && tmp_user._id != id) {
            return res.status(400).json({ error: 'Email address already used.' });
        }
        tmp_user = await Users.findOne({ phone_number: user.phone_number, is_user: false });
        if (tmp_user != null && tmp_user._id != id) {
            return res.status(400).json({ error: 'Phone number already used.' });
        }
        dataUser = await Users.updateOne({ _id: id }, user);

        var newResidenseData = [];
        var residenses = req.body.residenses;
        var is_default = false;
        console.log(residenses);
        residenses.forEach(residense => {
            is_default = residense.default;
            newResidenseData.push({
                "user_id": id,
                "residential_id": residense.residential_id,
                "house_id": residense.house_id,
                "default": residense.default,
                // "favorite": residense.favorite,
                "comment": residense.comment,
                "latitude": residense.latitude,
                "longitude": residense.longitude,
            });
        });
        if (!is_default && newResidenseData.length > 0) {
            newResidenseData[0].default = true;
        }
        await Residense.deleteMany({
            user_id: id
        });
        let dataResidense = await Residense.create(newResidenseData);
        res.json({
            dataUser,
            dataResidense
        });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};
exports.deactivateResidential = async(req, res) => {
    try {
        var res_id = req.body.residential_id;
        await Residential.findByIdAndUpdate(res_id, { active: false });
        var resid = await Residential.findById(res_id);
        res.json(resid);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.reactivateResidential = async(req, res) => {
    try {
        var res_id = req.body.residential_id;
        await Residential.findByIdAndUpdate(res_id, { active: true });
        var resid = await Residential.findById(res_id);
        res.json(resid);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getResidentialswithBooths = async(req, res) => {
    try {
        data = await Residential.find().populate('admins', 'email user_name').populate('booths');
        if (data) {
            res.json(data);
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};

exports.getVisitInfo = async(req, res) => {
    res.json(await GetVisitInfo(req.body.residential_id, req.body.date));
};
exports.getVisitInfoDate = async(req, res) => {
    var {
        id,
        date
    } = req.params;
    res.json(GetVisitInfo(id, date));
}
const GetVisitInfo = async(res_id, date) => {
    var gte = moment(date);
    var lte = moment(date).add(1, 'day');
    console.log(gte, lte);
    try {
        let invites = await Invite.find({
            startTime: {
                '$gte': gte,
                '$lte': lte
            },
            residential_id: res_id
        }).populate('invitor_id', 'full_name').populate('visitors.id', 'full_name _id img_url phone_number').populate('visitors.booth', '_id full_name user_name');

        return invites;
    } catch (e) {
        console.log(e.message);
        return 'Something went wrong';
    }
}
exports.GetVisitInfo = GetVisitInfo;
exports.createResidential = async(req, res) => {
    try {
        var {
            residential,
            admins,
            parks
        } = req.body;
        var result = await createAdmins(admins);
        if (!result.success) return res.status(400).json({ error: result.error });
        // if (admins.length == 0) {
        //     return res.json({error:'Residential has to have at least one admnis'})
        // }

        // var new_admins = await Admin.create(newAdmins);
        // residential.admins = new_admins.map(e => e._id);
        residential.admins = result.newAdmins;
        residential.parks = parks;
        var newResidential = await Residential.create(residential);
        res.json({
            'newResidential': newResidential,
            'new_admins': result.newAdmins
        });

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: e.message
        });
    }
};
const createAdmins = async(admins) => {
    try {
        var newAdmins = [];
        for (var e of admins) {
            // e.user_name = e.full_name;
            if (!e.user_name || !e.email) continue;
            let data = await Admin.findOne({ email: e.email });
            if (data) {
                for (const new_admin of newAdmins) {
                    await Admin.deleteOne({ _id: new_admin });
                }
                return { success: false, error: `Email address ${e.email} already used` };
            }
            data = await Admin.findOne({ user_name: e.user_name });
            if (data) {
                for (const new_admin of newAdmins) {
                    await Admin.deleteOne({ _id: new_admin });
                }
                return { success: false, error: `User name ${e.user_name} already used` };
            } else {
                e.authority = 1;
                e.img_url = '';
                var admin = await Admin.create(e);
            }
            newAdmins.push(admin._id);
        }
        return { success: true, newAdmins: newAdmins };
    } catch (e) {
        console.log(e);
        return { success: false, error: 'Something went wrong' };
    }
}
const createBooths = async(booths, residential_id) => {
    try {
        var newBooths = [];
        for (let e of booths) {
            // e.user_name = e.full_name;
            let data = await Booths.findOne({ email: e.email });
            if (data) {
                for (const newBooth of newBooths) {
                    await Booths.deleteOne({ _id: newBooth });
                }
                return { success: false, error: `Email address ${e.email} already used` };
            }
            data = await Booths.findOne({ user_name: e.user_name });
            if (data) {
                for (const newBooth of newBooths) {
                    await Booths.deleteOne({ _id: newBooth });
                }
                return { success: false, error: `User name ${e.user_name} already used` };
            } else {
                // e.authority = 1;
                // e.img_url = '';
                e.residential_id = residential_id;
                var booth = await Booths.create(e);
            }
            newBooths.push(booth._id);
        }
        return { success: true, newBooths: newBooths };
    } catch (e) {
        return { success: false, error: 'Something went wrong' };
    }
}
exports.getResidential = async(req, res) => {
    try {
        // date = client side local time of the start of the day.
        var { id } = req.params;
        var date = req.body.date;
        console.log(id);
        var residential = await Residential.findById(id).populate('admins', 'full_name user_name email').populate('booths');
        var visit = await GetVisitInfo(id, /*moment().format('YYYY/MM/DD') */ date);
        res.send({
            residential,
            visit
        });
    } catch (e) {
        console.log(e.message);
        res.status(400).json({
            error: e.message
        });
    }
};


exports.updateResidential = async(req, res) => {
    try {
        let {
            admins,
            residential,
            parks,
            booths
        } = req.body;
        if (admins.length == 0) {
            return res.status(400).json({
                error: 'Residential should have one administrator at least.'
            });
        }
        if (booths.length == 0) {
            return res.status(400).json({
                error: 'Residential should have one booth at least.'
            });
        }
        var oldAdmins = await Residential.findById(residential._id, 'admins');
        if (oldAdmins.admins.length > 0) {
            result = await Admin.deleteMany({ _id: { $in: oldAdmins.admins } });
        }
        var result = await createAdmins(admins);
        if (!result.success) return res.status(400).json({ error: result.error });
        var newAdmins = result.newAdmins;
        var oldBooths = await Residential.findById(residential._id, 'booths');
        if (oldBooths.booths.length > 0) await Booths.deleteMany({ _id: { $in: oldBooths.booths } });
        result = await createBooths(booths, residential._id);
        if (!result.success) return res.status(400).json({ error: result.error });
        var newBooths = result.newBooths;

        residential.parks = parks;
        residential.admins = newAdmins;
        residential.booths = newBooths;

        const newResidential = await Residential.updateOne({
            _id: residential._id
        }, residential);
        res.json({
            newAdmins,
            newBooths,
            newResidential
        });
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: e.message
        });
    }
};

exports.getInformation = async(req, res) => {
    try {
        // let r = await Residential.find().group(country_code);
        // res.json(r);
        var total = await Stas.countDocuments();
        var sampling = common.sampling * 2 < total ? common.sampling : total;
        var cnt = Math.ceil(total / sampling / 2);
        let interval = [];
        for (let i = 0; i < sampling; i++) {
            interval.push(i * cnt);
        }
        interval[sampling - 1] = total - 1;
        let regd_user = [],
            app_user = [],
            rest_num = [],
            resl_num = [];
        var v;
        for (let i = 0; i < sampling; i++) {
            v = await Stas.findOne({
                no: interval[i]
            });
            regd_user.push(v.regd_user);
            app_user.push(v.app_user);
            rest_num.push(v.rest_num);
            resl_num.push(v.resl_num);
        }
        let topLocation = await Residential.aggregate([{
            $group: {
                _id: "$country",
                total: {
                    $sum: 1
                }
            }
        }]);
        total = await Stas.findOne({
            no: total - 1
        });
        let ageRating = [];
        ageRating.push(await GetUsersAgeRange(0, 200));
        ageRating.push(await GetUsersAgeRange(13, 17));
        ageRating.push(await GetUsersAgeRange(18, 24));
        ageRating.push(await GetUsersAgeRange(25, 34));
        ageRating.push(await GetUsersAgeRange(35, 44));
        ageRating.push(await GetUsersAgeRange(45, 54));
        ageRating.push(await GetUsersAgeRange(55, 64));
        ageRating.push(await GetUsersAgeRange(65, 200));

        res.json({
            'total': total,
            'array': {
                regd_user,
                app_user,
                rest_num,
                resl_num,
                topLocation,
                ageRating
            }
        });
    } catch (e) {
        console.log({
            error: e.message
        });
    }
};

exports.createResidense = async(req, res) => {
    try {
        const residense = await Residense.create(req.body.residense);
        res.json(residense);
    } catch (e) {
        console.log(e);
    }
};

exports.getAdmins = async(req, res) => {
    try {
        const supportData = await Admin.find({
            authority: [0, 2]
        });
        res.json(supportData);
    } catch (e) {
        console.log(e);
    }
};
exports.getAdmin = async(req, res) => {
    try {
        var {
            id
        } = req.params;
        const user = await Admin.findById(id);
        res.json(user);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}

exports.addResidentialAdmin = async(req, res) => {
    try {
        let {
            residential,
            adminData
        } = req.body;
        console.log(adminData);
        admin = await Admin.findOne({
            email: adminData.email
        });
        console.log(admin);
        if (admin) {
            res.status(400).json({
                error: 'The email address ' + adminData.email + ' is already used.'
            });
            return;
        }
        var newAdmin = await Admin.create(adminData);
        // residential.admins = .push({admin_id:newAdmin._id});
        // console.log(residential);
        // var newResidential = await Residential.updateOne({_id:residential.id}, residential);
        res.json(newAdmin);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}


exports.getBooths = async(req, res) => {
    try {
        const booths = (await Residential.findById(req.body.residential_id).populate('booths')).booths;
        res.json(booths);
    } catch (e) {
        console.log(e);
        res.status(400).res('Something went wrong');
    }
};
exports.createBooth = async(req, res) => {
    try {
        var { booth, residential_id } = req.body;
        var tmp_booth = await Booths.findOne({ emial: booth.email });
        if (tmp_booth) {
            return res.status(400).json({ error: 'Email already used.' });
        }
        tmp_booth = await Booths.findOne({ user_name: booth.user_name });
        if (tmp_booth) {
            return res.status(400).json({ error: 'Username already used.' });
        } else {
            booth.residential_id = residential_id;
            var resBooths = (await Residential.findById(residential_id)).booths;
            var newBooth = await Booths.create(booth);
            resBooths.push(newBooth._id);
            let result = await Residential.updateOne({ _id: residential_id }, { booths: resBooths });
            res.json({ newBooth, result });
        }
    } catch (e) {
        res.status(400).json({ error: 'Something went wrong' });
    }
}
exports.updateBooth = async(req, res) => {
    try {
        var booth = await Booths.updateOne({ _id: req.body.booth._id }, req.body.booth);
        res.json(booth);
    } catch (e) {
        res.status(400).json(e.message);
    }
}
exports.getBooth = async(req, res) => {
    try {
        const {
            id
        } = req.params;
        var booth = await Booths.findById(id);
        res.json(booth);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}

exports.removeBooth = async(req, res) => {
    try {
        const id = req.body.booth_id;
        const residential_id = req.body.residential_id;
        await Booths.deleteOne({ _id: id });
        var resBooths = (await Residential.findById(residential_id)).booths;
        resBooths = resBooths.filter(booth => { if (booth.booth_id != id) { return booth; } });
        const result = await Residential.updateOne({ _id: residential_id }, { booths: resBooths });
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: 'Something went wrong' });
    }
}
exports.getResidents = async(req, res) => {
    try {
        const residential_id = req.body.residential_id;
        const residense = await Residense.find({ residential_id: residential_id }).populate('user_id', '_id full_name email img_url phone_number country_code house_id').populate('residential_id');
        res.json(residense);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};

exports.getReport = async(req, res) => {
    try {
        const year_month = req.body.month;
        var result = [];
        for (let i = 1; i <= moment(year_month, "YYYY/MM").daysInMonth(); i++) {
            const day = year_month + '/' + i;

            result.push(await GetVisitInfo(req.body.residential_id, day));
        }
        res.json(result);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.searchUsersResidName = async(req, res) => {
    try {
        var residential_id = req.body.residential_id;
        if (!residential_id) {
            return res.status(400).json('Invalid request');
        }
        var residents = await Residense.find({
            residential_id: residential_id
        }, 'user_id');
        var users = [];
        for (const e of residents) {
            var user = await Users.findById(e.user_id);
            users.push(user);
        }

        res.json(users);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.searchUsers = async(req, res) => {
    try {
        var phone_number = req.body.country_code + req.body.phone_number;
        var query = { "phone_number": { "$regex": phone_number, "$options": 'i' } };
        console.log(req.body);
        // var users = await Users.find(query);
        // res.json({users})
        var user = await Users.findOne(query);
        // var user = await 
        if (!user) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }
        var residense = await Residense.find({
            user_id: user._id
        }).populate('residential_id', '_id name country city latitude longitude');
        for (let i = 0; i < residense.length; i++) {
            const e = residense[i];
            residense[i].residential_id.country = (await Countries.findOne({
                iso2: e.residential_id.country
            })).name;
        }
        console.log(residense);
        return res.json({
            user,
            residense
        });
    } catch (e) {
        return res.status(400).json({
            error: e.message
        });
    }
};
exports.getUsers = async(req, res) => {
    try {
        res.json(await Users.find({ is_user: true }, 'full_name img_url birth_day country_code phone_number email country_abbr'));
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.associateUser = async(req, res) => {
    try {
        var residense = req.body.residense;
        residense.default = true;
        // residense.favorite = true;
        var user_id = residense.user_id;
        var residential_id = residense.residential_id;
        let residenses = await Residense.find({
            user_id: residense.user_id,
            default: true
        })
        if (residenses.length >= 1) {
            residense.default = false;
            // residense.favorite = false;
        }
        var newReisdense;
        if ((await Residense.findOne({
                user_id: user_id,
                residential_id: residential_id
            }))) {
            await Residense.updateOne({
                user_id: user_id,
                residential_id: residential_id
            }, residense);
            newReisdense = await Residense.findOne({
                user_id: user_id,
                residential_id: residential_id
            });
        } else {
            newReisdense = await Residense.create(residense);
        }
        res.json(newReisdense);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}

exports.addResAdmin = async(req, res) => {
    try {

    } catch (e) {

    }
}
exports.getResidentialsWithCountryCity = async(req, res) => {
    try {
        res.json(await GetResidentialsWithCountryCity(req.body.country, req.body.city));

    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}

exports.getCities = async(req, res) => {
    try {
        const {
            id
        } = req.params;
        const cities = await Cities.find({
            iso2: id
        }).sort({
            name: 1
        });
        res.json(cities);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getCountries = async(req, res) => {
    try {
        const countries = await Countries.find().sort({
            name: 1
        });
        res.json(countries);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.getCountry = async(req, res) => {
    try {
        const country = await Countries.findOne({
            iso2: req.body.code
        });
        res.json(country.name);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
const GetUsersAgeRange = async(gte, lte) => {
    let gte_day = moment(moment().year() - lte, 'YYYY').format('YYYY/MM/DD');
    let lte_day = moment(moment().year() - gte, 'YYYY').format('YYYY') + '/12/31';
    let users = await Users.countDocuments({
        'birth_day': {
            '$gte': gte_day,
            '$lte': lte_day
        }
    });
    return users;
}


const GetResidentialsWithCountryCity = async(country, city) => {
    let residentials = await Residential.find({
        city: {
            $regex: city,
            $options: "i"
        },
        country: {
            $regex: country,
            $options: 'i'
        }
    }, 'name');
    return residentials;
}








exports.createAdmin = async(req, res) => {
    try {
        var { user_name, email } = req.body;
        var admin = await Admin.findOne({ user_name: user_name });
        if (admin) {
            return res.status(400).json('Username already exists');
        }
        admin = await Admin.findOne({ email: email });
        if (admin) {
            return res.status(400).json('Email address already exists');
        }
        const returnValue = await Admin.create(req.body);
        res.json(returnValue);
    } catch (e) {
        console.log(e.message);
        console.log(e);
    }
};



exports.updateAdminUser = async(req, res) => {
    try {
        const {
            user,
            oldPassword
        } = req.body;
        const id = user._id;
        let oldUser = await Admin.findById(id);
        if (oldUser.password != getHash(oldPassword)) {
            return res.status(400).json({
                error: 'Password incorrect'
            });
        }
        const result = await Admin.findByIdAndUpdate(id, user);
        res.json(result);
    } catch (e) {
        res.status(400).json({
            error: e.message
        })
    }
};
exports.removeAdminUser = async(req, res) => {
    try {
        var {
            id
        } = req.params;
        await Admin.findByIdAndRemove(id);
        var supportData = await Admin.find();
        res.json(supportData);
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.logout = async(req, res) => {
    try {
        res.json();
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}

exports.getResident = async(req, res) => {
    try {
        const {
            id
        } = req.params;

        var resident = await Users.findById(id);
        var residense = await Residense.find({
            user_id: id
        }).populate('residential_id', '_id name country city latitude longitude');
        for (let i = 0; i < residense.length; i++) {
            const e = residense[i];
            console.log(e);
            residense[i].residential_id.country = (await Countries.findOne({
                iso2: e.residential_id.country
            })).name;
        }
        res.json({
            resident,
            residense
        });
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
}
exports.updateResident = async(req, res) => {
    try {
        const { residential_id, user_id, house_id, associate } = req.body;
        let result;
        if (!associate) {
            result = await Residense.deleteOne({ user_id: user_id, residential_id: residential_id });
            res.json(result);
        } else {
            let newUser = await Residense.findOne({ residential_id: residential_id, user_id: user_id });
            newUser.house_id = house_id;
            await newUser.save();
            res.json(newUser);
        }
    } catch (e) {
        res.status(400).json({
            error: e.message
        });
    }
};
exports.tmp = async(req, res) => {
    var result = await facialAWS.listFaces();
    var faces = [];
    console.log(result.faces);
    result.faces.Faces.map(e => {
        faces.push(e.FaceId);
    })
    res.json(faces);
}
exports.deletefaces = async(req, res) => {
    var result = await facialAWS.listFaces();
    var faces = [];
    result.faces.Faces.map(e => {
        faces.push(e.FaceId);
    })
    console.log(faces);
    var result = await facialAWS.deleteFace(faces);

    console.log(result.faces);

    res.json(result);
}
exports.addFaq = async(req, res) => {
        try {
            var faqs = req.body.faqs;
            var result = await Faqs.create(faqs);
            return res.json({ success: true, result: result });
        } catch (e) {
            console.log(e.message);
            return res.status(400).json({ success: false, error: e.message });
        }
    }
    // exports.logInfo = async (req, res) => {
    //     try {

//         let info = await Info.find().sort({
//             updated_at: -1
//         });
//         info = info[0];
//         if (info) {

//             let last_date = info.updated_at;
//             let cur_date = moment().format('YYYYMMDD');
//             if (last_date == cur_date)
//             {
//                 info.num = info.num + 1;
//                 let newInfo = await Info.updateOne({_id:info._id}, info);
//             }
//             else 
//             {
//                 for (let i = 0; i < cur_date - last_date - 1; i++) {
//                     let newInfo = await Info.create({num:info.num, updated_at:last_date+i+1, no:info.no+i+1});
//                 }
//                 let newInfo = {num:info.num + 1, updated_at:moment().format('YYYYMMDD'), no: info.no+(cur_date-last_date)};
//                 newInfo = await Info.create(newInfo);
//             }
//         } else {
//             let newInfo = await Info.create({num:1, updated_at:moment().format('YYYYMMDD'), no: 1});
//         }
//         res.json({});
//     } catch (e) {
//         res.json({error:e.message});
//         return ({
//             error: e.message
//         });
//     }
// }
const LogInfo = async() => {
    let regd_user = await Users.countDocuments();
    let app_user = regd_user - await Users.countDocuments({
        uid: ''
    });
    console.log('sd');
    let resl_num = await Residential.countDocuments();
    let rest_num = await Residense.countDocuments({
        default: true
    });
    var no = 0;
    no = (await Stas.find().sort({
        'no': -1
    }))[0].no + 1;
    await Stas.create({
        regd_user,
        app_user,
        resl_num,
        rest_num,
        no
    });
}

cron.schedule("0 0 0 * * *", LogInfo);