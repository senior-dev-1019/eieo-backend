var express = require('express');
var router = express.Router();

var user = require('../controllers/api/user');

router.post('/test', user.detectFace);
router.post('/log', user.log);

router.post('/login', user.login);
router.post('/signup', user.register);
router.use('/', user.authenticate);
router.post('/loginjwt', user.loginjwt);
router.post('/updatedevicetoken', user.update_device_token);
router.post('/invite/create', user.addInvite);
router.post('/invite', user.getInviteData);
router.delete('/invite/:id', user.removeInvite);
router.post('/validateapp', user.validateApp);
router.post('/invitation', user.getInvitationData);
router.post('/unsavedinvitation', user.getUnsavedInvitation);
router.post('/saveinvitation', user.saveUnsavedInvitation);
router.post('/tags/', user.getTags);
router.delete('/tags/', user.removeTag);
router.post('/tags/create', user.createTag);
router.post('/favorite', user.getFavorite);
router.post('/favorite/create', user.addFavorite);
router.delete('/favorite/:id', user.removeFavorite);

router.post('/getqr', user.getQR);
router.post('/event', user.getEvents);
router.post('/event/create', user.createEvent);
router.post('/event/update', user.updateEvent);
router.delete('/event/:id', user.removeEvent);
router.get('/event/:id', user.getEvent);

router.post('/recservice/', user.getRecService);
router.post('/recservice/create', user.addRecService);
router.post('/recservice/getqr', user.getProviderQR);
router.post('/recservice/setface', user.setProviderBio);
router.post('/recservice/update', user.updateRecService);
router.delete('/recservice/:id', user.removeRecService);
router.get('/residential', user.getResidential);
router.post('/residential/makedefault', user.makeResidentialDefault);
router.post('/residential/addcomment', user.addResidentialComment);
router.get('/residential/services', user.getResidentialService);
router.get('/tags', user.getTags);
router.post('/tags/create', user.createTag);
router.delete('/tags/:id', user.removeTag);
router.post('/setting/update', user.update);

router.post('/profile', user.getProfile);
router.post('/setnotification', user.setNotification);
router.get('/notificationsetting', user.getNotificationSetting);
router.post('/booth/notify', user.sendMessageToBooth);
router.post('/notifications', user.getNotifications);
router.post('/confirmmessage', user.confirm_message);
router.get('/signout', user.logout);
router.get('/getfaqs', user.getFaqs);

router.post('/contact/validate', user.validateContact);


module.exports = router;