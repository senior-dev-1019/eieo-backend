// var admin = require('firebase-admin');
// var serviceAccount = require("./app/firebase-server.json");

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://loschaneques-mexico.firebaseio.com"
// });

// const fun = async (p) => {
//     var a = await admin.auth().getUserByPhoneNumber(p);
//     return a;
// }


// fun('+525543714261').then(users => {
//     console.log(users);
// })

var express = require('express');
var path = require('path');
// var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var constants = require('./app/constants');
var session = require('express-session');
var common = require('./app/common');
var Users = require('./models/users');
var Invites = require('./models/invite');
var app = express();
var moment = require('moment');
mongoose.connect(constants.dburl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
var s3 = require('./controllers/s3');
//  s3.delete_image('images/users/avatar_4.jfif');
// var Res = require('./models/residential');

// // // (async () => {
// // //     var a = await Res.aggregate([{
// // //         $group: {
// // //             _id: "$country",
// // //             total: {
// // //                 $sum: 1
// // //             }
// // //         }
// // //     }]);
// // //     console.log(a);
// // // })();
// (async () => {
//     console.log(moment().subtract(1, 'days').format('YYYY/MM/DD/HH:mm'));
//     console.log(moment(moment().year() - 10, 'YYYY').format('YYYY') + '/12/31');
//     console.log(moment(moment().year() - 10, 'YYYY').format('YYYY/MM/DD'));
//     console.log(moment(moment().format('YYYY/MM/DD/HH:mm'), ['YYYY/MM/DDHH:mm']));
//     // var a = await Users.find({'birth_day': {'$gte': '1990/12/25', '$lte': '2020/12/12'}});
//     // console.log(a);

// })();

// // var cc = require('./app/country_abbr_code.json');
// var cc = require('./app/countries.json');
// var arr = [];
// for (let i = 0; i < cc.length; i++) {
//     let e = cc[i];
//     const c = cs.filter(item => {
//        return item.iso2 == e.code;
//     });
//     if (c.length == 1) {
//         e.iso3 = c[0].iso3;
//     } else {
//         e.iso3 = '';
//     }
//     arr.push(e);
// }
// cc = JSON.stringify(arr);
// var fs = require('fs');
// fs.writeFile("countries_.json", cc, function(err) {
//     if (err) {
//         console.log(err);
//     }
// });
// cc = JSON.stringify(JSON.parse(cc));

// var citiess = [];
// for (let i = 0; i < cc.length; i++) {
//     let country = cc[i];
//     var cities = [];
//     for (let j = 0; j < country.states.length; j++) {
//         const state = country.states[j];

//         for (let k = 0; k < state.cities.length; k++) {
//             const city = state.cities[k];
//             cities.push({'name':city.name, 'latitude':city.latitude, 'longitude':city.longitude});
//         }
//     }
//     citiess.push({
//         'id':country.id,
//         'iso3':country.iso3,
//         'iso2':country.iso2,
//         'cities': cities
//     });

// }

// cc = JSON.stringify(citiess);
// var fs = require('fs');
// fs.writeFile("cities.json", cc, function(err) {
//     if (err) {
//         console.log(err);
//     }
// });
// let tags = [{
//     _id: 1
// }, {
//     _id: 2
// }];
// let tag_id = 1;
// var moment = require('moment');

// console.log(tags.filter(tag => tag._id))

// console.log(
//     moment() < moment('2020/06/12/20:00', 'YYYY/MM/DD/HH:mm')
// )
// var a = 'string';
// console.log(`---${a}`);
// var time = moment('2020-06-20 08:50:14.000Z');
// console.log(time);
// console.log(moment.utc(time));

// var a = '2020-01-01 00:00';
// var b = '2020-01-01 01:59';
// console.log(moment(b).diff(moment(a), 'hours'));
// var admin = require("firebase-admin");
// var serviceAccount = require("./app/firebase-server.json");
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://loschaneques-mexico.firebaseio.com"
// });
var token = 'dYLHjKRaQJKL1JJANhMVGV:APA91bGOUAdezRN4Nrca2cKVCO_7Fn0f73bLkbl9KqPCuy3FWHlBPFfsPo-k8bCHkctH6GhXsqzHMh63Qn2wkM1b_acLn7hj8vQh89AWeEtrYBRclj8kkttpvEk3YmdCUMpxzZWbh7s8';
// var message = {
//     'notification': {
//         title: `The resident `,
//         body: 'enter_message_here',
//         badge: '1'
//     },
//     'data': {
//         click_action: 'FLUTTER_NOTIFICATION_CLICK',
//         id: '1',
//         status: 'done',
//         score: '850',
//         time: '2:45'
//     },
// };
// admin.messaging().sendToDevice(token, message).then((response) => {

//         console.log('sent.......................', response);
//         return;
//     })
//     .catch(error => {
//         console.log(error);
//     });
// var a = '1010';
// console.log(moment().day(), a[0]);

// var twilio = require('./controllers/twilio');
// send = async() =>{
//     var result = await twilio.sendSMS('Hi', '+1 847 242 8343', '+12027953213');
//     console.log(result);
// }
//  send();
// (async () => {
//     var invites = await Invites.find({ 'visitors.id': '5ef57e453cb2cd31fccaf818' }).populate('visitors.id');
//     console.log('here');
//     console.log(invites.toString());
// })();

var a = moment('2020-10-16:10:31:00', 'YYYY-MM-DD:HH:mm:ss')
var b = moment('2020-10-16:10:32:00', 'YYYY-MM-DD:HH:mm:ss')
console.log(moment().format('YYYY-MM-DD'));
console.log(a.isAfter(b));
console.log(moment().day())
console.log(moment().utc())