const config = require('../app/aws-rekog-config');

var AWS = require('aws-sdk');
AWS.config.region = config.region;

var fs = require('fs-extra');
var uuid = require('node-uuid');
var path = require('path');

var rekognition = new AWS.Rekognition({
    region: config.region
});

var objReturn = {
    found: false,
    resultAWS: ''
}

module.exports.detect_face = async(photo) => {
    console.log('Detecting face...');
    buf = new Buffer.alloc(photo.length, photo.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    try {
        var data = await new Promise(function(resolve, reject) {
            rekognition.detectFaces({
                'Image': {
                    'Bytes': buf
                },
            }, (error, data) => {
                if (error) reject(error);
                else resolve(data);
            });
        });
    } catch (e) {
        console.log(e.message);
        return { success: false, error: e.message };
    }
    if (data.FaceDetails.length == 0) {
        return { success: false, error: 'No face' };
    }
    return { success: true };
}

module.exports.search_face = async(obj) => {

    console.log('Finding face...');
    buf = new Buffer.alloc(obj.photo.length, obj.photo.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    try {
        var data = await new Promise(function(resolve, reject) {
            rekognition.searchFacesByImage({
                'CollectionId': config.collectionName,
                'FaceMatchThreshold': 80,
                'Image': {
                    'Bytes': buf
                },
                'MaxFaces': 1
            }, (error, data) => {
                if (error) reject(error);
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
    if (data.FaceMatches.length > 0) {
        console.log(data.FaceMatches[0]);
        return {
            success: true,
            face: data.FaceMatches[0].Face
        };
    } else {
        return {
            success: false,
            error: 'Invalid user'
        }
    }
}

module.exports.indexFaces = async(obj) => {

    console.log('Indexing new face...');

    buf = new Buffer.alloc(obj.photo.length, obj.photo.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    try {
        var data = await new Promise((resolve, reject) => {
            rekognition.indexFaces({
                'CollectionId': config.collectionName,
                'DetectionAttributes': ['ALL'],
                'ExternalImageId': obj.user_id + '',
                'Image': {
                    'Bytes': buf
                }
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    } catch (e) {
        console.log('--------------------------', e.message);
        return {
            success: false,
            error: e.message
        };
    }
    if (data.FaceRecords.length == 0) {
        return { success: false, error: 'No face found' };
    }
    return {
        success: true,
        face: data.FaceRecords[0].Face,
        face_id: data.FaceRecords[0].Face.FaceId
    };
}

module.exports.deleteFace = async(obj) => {

    console.log('Deleting face...');
    var params_deletion = {
        CollectionId: config.collectionName,
        FaceIds: obj
    };

    try {
        var data = await new Promise((resolve, reject) => {
            rekognition.deleteFaces(params_deletion, (err, data) => {
                if (err) reject(err);
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
        result: data
    };
}

module.exports.listFaces = async() => {

    console.log('Listing faces...');

    try {
        var params_list = {
            CollectionId: config.collectionName
        };

        var data = await new Promise((resolve, reject) => {
            rekognition.listFaces(params_list, (err, data) => {
                if (err) reject(err);
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
        faces: data
    };
}