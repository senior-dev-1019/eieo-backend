var express = require('express');
var router = express.Router();

var visitor = require('../controllers/api/visitor');


router.post('/validate', visitor.validate);
router.post('/getqr', visitor.getqr);
router.post('/registerface', visitor.registerFace);
router.post('/inviteinfo', visitor.getInviteInfo);
module.exports = router;