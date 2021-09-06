var express = require('express');
var router = express.Router();

var booth = require('../controllers/api/booth');
var user = require('../controllers/api/user');

router.post('/login', booth.login);
router.use('/', booth.authenticate);
router.post('/loginjwt', booth.loginjwt);
router.post('/updatedevicetoken', booth.update_device_token);
router.post('/residents', booth.getResidents);

router.get('/resident/:id', booth.getResident);
router.get('/user/:id', booth.getUser);
router.post('/resident/notify', booth.sendMessageToResident);
router.post('/visit/extend', booth.extendVisit);
router.post('/guest/invitations', booth.getGuestInvitation);
router.post('/guest/services', booth.getGuestServices);
router.post('/guest/favorites', booth.getGuestFavorite);
router.post('/guest/setstate', booth.setGuestStatus);
router.post('/addplate', booth.add_plate);
router.post('/removeplate', booth.remove_plate);
router.post('/schedule', booth.getSchedule);
router.post('/scan/face', booth.scan_face);
router.post('/scan/plate', booth.scan_plate);
router.post('/scan/qr', booth.scan_qr);
router.post('/park/decrease', booth.decreasePark);
router.post('/park/increase', booth.increasePark);
router.post('/park/available', booth.getFreeParkSpace);
router.post('/notifications', booth.getNotifications);
router.get('/notifications/count', booth.getNotificationsCount);
router.post('/notifications/makeread', booth.makeNotificationRead);
router.post('/notifications/readall', booth.makeNotificationsRead);
router.delete('/notifications/:id', booth.removeNotification);
router.delete('/notifications', booth.removeNotifications);
router.post('/logout', booth.logout);
router.get('/residential/services', booth.getResidentialService);

module.exports = router;