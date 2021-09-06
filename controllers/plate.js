
var axios = require('axios').default;


module.exports.scan_plate = async (img) => {
    try {
        // var buf = new Buffer.alloc(img.length, img.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        var token = "7fa32a322f2763ddff41301b443a160fb0bf9650";
        axios.defaults.headers.common = {
            'Authorization': `Token ${token}`
        }
        var res = await axios.post('https://api.platerecognizer.com/v1/plate-reader/', {
            upload: img
        });
        console.log('scaned...');
        return {
            success: true,
            result: res.data
        };
    } catch (e) {
        console.log(e.message);
        return {
            success: false,
            error: e.message
        };
    }
}