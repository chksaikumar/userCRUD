const express = require('express');
const {check} = require('express-validator');

const usersController = require('../controllers/users-controllers');
const fileUpload = require('../middleware/file-upload');

const router = express.Router();

router.get('/', usersController.getUsers);

router.get('/:uid', usersController.getUserById);

router.post(
    '/signup',
    fileUpload.single('image'),
    [   check('name').not(),
        check('username')
            .not()
            .isEmpty(),
        check('email')
            .normalizeEmail()
            .isEmail(),
        check('password').isLength({min: 6})
    ],
    usersController.signup

);
//router.patch(
   // '/:userId',
   router.patch(
    '/:userId',
    fileUpload.single('image'),
    [   check('name').not(),
        check('username')
            .not()
            .isEmpty(),
        check('password').isLength({min: 6})
    ],
    usersController.updateUser 

);

router.post('/login', usersController.login);

router.get('/search/:query', usersController.searchUsers);
router.delete('/:userid', usersController.deleteuser);


module.exports = router;