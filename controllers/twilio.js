const { sendMessage } = require('../app/common');

var twilio = require('twilio')('ACf6ab6734c7352cc801a89b57b5474834', 'f10a7e5395b10cadda2b5c3b99778c2e');



module.exports.sendSMS = async (body, from, to) => {
    try {
        var data = await new Promise((resolve, reject) => {
            twilio.messages.create({
                body: body, from: from, to: to
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    } catch (e) {
        console.log(e.message);
        return {
            success: false,
            error: e.message
        };
    }
    console.log(data);
    return { success: true };
}