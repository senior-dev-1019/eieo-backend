exports.validateEmail = function(value) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(value);
};
exports.validatePhone = function(value) {
    var phoneno = /^\+?([0-9]{2})\)?[- ]?([0-9]{3})[- ]?([0-9]{4})[- ]?([0-9]{4})$/;
    return value.match(phoneno);
};
exports.sendData = function(res, data){
    var result = {
        code: 200,
        data: data
    };
    res.send(result);
};
exports.sendMessage = function(res, code, message){
    var result = {
        code: code,
        message: message
    };
    res.send(result);
};
exports.sendFullResponse = function(res, data, message){
    var result = {
        code: 200,
        data: data,
        message: message
    };
    res.send(result);
};
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
};
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
exports.visit_status = ['Not Arrived', 'Arrived', 'Left', 'Expired'];
exports.enter_method = ['Pedestrian', 'Car'];
exports.visit_type = ['Normal visit', 'Recurring service', 'Temporary visit'];
exports.sampling = 12;
exports.userCryptKey = "df3d2ca3f4d21ae23a123c21e2c3cc21"
exports.adminCryptKey = "c39d399f738821fce1e1a2a9a743c23c"
exports.boothCryptKey = "1c85a45bc43f5e14ec8c41e384a16843"
exports.qrCryptKey =    "154ca38b41e13fa84ef4c314af1e8a43"
exports.visitCryptKey = "14ef84c5a3128bde74ca5c86d45ef4a1"
exports.notificationName = ['Transport', 'Parcel', 'Food', 'Pet', 'Health', 'Message', 'Guest', 'Service', 'Extend visit', 'Favorite'];
exports.phone_number = '+1 847 242 8343';