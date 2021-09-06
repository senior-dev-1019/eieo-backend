var fcm = require("firebase-admin");



module.exports.notify_booth = async (title, body, badge, token, data) => {
    data.click_action = 'FLUTTER_NOTIFICATION_CLICK';
    var message = {
        'notification': {
            title: title,
            body: body,
            badge: badge,
            sound: 'default'
        },
        'data': data,
        // 'apns': {
        //     payload: {
        //         aps: {
        //             sound: 'default'
        //         }
        //     }
        // }
    };
    try {
        var data = await fcm.messaging().sendToDevice(token, message, {});
        if (data.failureCount == 0)
            return true;
        else return false;
    } catch (e) {
        console.log(e);
        return false;
    }
}

module.exports.notify_user = async (title, body, badge, token, data) => {
    data.click_action = 'FLUTTER_NOTIFICATION_CLICK';
    var message = {
        'notification': {
            title: title,
            body: body,
            badge: badge,
            sound: 'default'
        },
        'data': data,
        // 'apns': {
        //     payload: {
        //         aps: {
        //             sound: 'default'
        //         }
        //     }
        // }
    };
    try {
        var data = await fcm.messaging().sendToDevice(token, message, {});
        console.log(data)
        if (data.failureCount == 0)
            return true;
        else return false;
    } catch (e) {
        console.log(e);
        return false;
    }
}