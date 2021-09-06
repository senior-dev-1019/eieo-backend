var express = require('express');
var router = express.Router();

var admin = require('../controllers/api/admin');

router.get('/countries/', admin.getCountries);

router.post('/listfaces', admin.tmp);
router.post('/deletefaces', admin.deletefaces);
router.post('/search', admin.searchUserByImage);
router.post('/addfaq', admin.addFaq);


router.post('/signup', admin.signup);
router.post('/login', admin.login);
router.use('', admin.authenticate);
router.post('/loginjwt', admin.loginjwt);

router.get('/dashboard', admin.getUsersResidentials);
router.post('/dashboard/update', admin.updateAvatar);
router.get('/user/new', admin.getResidentials);
router.post('/user/create', admin.createUser);
router.post('/user/edit/:id', admin.getUser);
router.post('/user/update/:id', admin.updateUser);
router.post('/user/search/residential', admin.searchUsersResidName);
router.delete('/user/:id', admin.removeUser);
router.post('/residentials', admin.getResidentials);
router.post('/residential', admin.getResidential);
router.post('/residential/deactive/', admin.deactivateResidential);
router.post('/residential/reactive/', admin.reactivateResidential);
// router.post('/residential', admin.getResidentialswithBooths);
router.post('/residential/visit', admin.getVisitInfo);

router.post('/residential/create', admin.createResidential);
router.post('/residential/new/addAdmin', admin.addResidentialAdmin);
router.post('/residential/edit/addAdmin', admin.addResidentialAdmin);
router.post('/residential/edit/:id', admin.getResidential);
router.post('/residential/:id/:date', admin.getVisitInfoDate);
router.post('/residential/update', admin.updateResidential);
router.post('/information/', admin.getInformation);    //need change
router.post('/information/visit', admin.getVisitInfo);
// router.post('/create/residense', admin.createResidense);
router.get('/cities/:id', admin.getCities);
router.get('/country/', admin.getCountry);
router.get('/eieoteam/', admin.getAdmins);
router.post('/eieoteam/create', admin.createAdmin);
router.post('/eieoteam/update', admin.updateAdminUser);
router.get('/eieoteam/:id', admin.getAdmin);
router.delete('/eieoteam/:id', admin.removeAdminUser);
router.post('/settings/support/update', admin.updateAdminUser);
router.post('/logout', admin.logout);

router.post('/residents/', admin.getResidents);
router.post('/admim/resident/update', admin.updateResident);
router.post('/resident/search/', admin.searchUsers);
router.post('/resident/associate', admin.associateUser);
router.get('/resident/:id', admin.getResident);
router.post('/booths', admin.getBooths);
router.post('/booths/create', admin.createBooth);
router.post('/booths/update', admin.updateBooth);
router.post('/booths/delete/', admin.removeBooth);
router.get('/booths/edit/:id', admin.getBooth);
router.post('/report', admin.getReport);
router.post('/settings/admin/update', admin.updateAdminUser);

router.post('/creator/users', admin.getUsers);
router.post('/creator/users/search', admin.searchUsers);
router.post('/creator/users/create', admin.createUser);
router.post('/creator/users/update', admin.updateUser);
router.post('/settings/creator/update', admin.updateAdminUser);

module.exports = router;