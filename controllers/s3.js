var base_url = 'https://eieo-dev.s3.us-east-2.amazonaws.com/';
var AWS = require('aws-sdk');
AWS.config.loadFromPath('app/s3-config.json');

var s3Bucket = new AWS.S3({
    params: {
        Bucket: 'eieo-dev'
    }
});

module.exports.upload_image = async (img, user, id) => {

    console.log('Uploading image...');

    try {
        buf = new Buffer.alloc(img.length, img.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        var upload = {
            Key: (user ? 'images/users/' : 'images/admins/') + String(id),
            Body: buf,
            ACL: 'public-read',
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg'
        };
        var data = await new Promise(function (resolve, reject) {
            s3Bucket.putObject(upload, (error, data) => {
                if (error) reject(error);
                else resolve(data);
            });
        });
    } catch (e) {
        console.log(e);
        return {
            success: false,
            error: e.message
        };
    }

    return {
        success: true,
        img_url: base_url + ((user ? 'images/users/' : 'images/admins/') + String(id))
    };

}
module.exports.delete_image = async (img_url) => {

    console.log('Deleting image...');

    try {
        // buf = new Buffer.alloc(img.length, img.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        var params = {
            Bucket: "eieo-dev", 
            Key: img_url
           };
        var data = await new Promise(function (resolve, reject) {
            s3Bucket.deleteObject(params, (error, data) => {
                if (error) reject(error);
                else {
                    
                    console.log(data);
                    resolve(data);}
            });
        });
    } catch (e) {
        console.log(e);
        return {
            success: false,
            error: e.message
        };
    }

    return {
        success: true,
    };

}