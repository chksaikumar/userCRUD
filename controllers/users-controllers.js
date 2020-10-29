const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');
const user = require('../models/user');
//get users 
const getUsers = async (req, res, next) => {
    let users;
    //check for error 
    try {
        users = await User.find({}, '-password');
        //handel error
    } catch (err) {
        const error = new HttpError(
            'Fetching users failed, please try again later.',
            500
        );
        return next(error);
    }
    await res.json({users: users.map(user => user.toObject({getters: true}))});
};
//grtting users by id
const getUserById = async (req, res, next) => {
    const userId = req.params.uid;
    let user;
    try {
        user = await User.findById(userId)
    } catch (err) {
        const error = new HttpError("Something went wrong can't get user.", 500);
        return next(error);
    }
    //if user was not find 
    if (!user) {
        const error = new HttpError("Can't find user for provided id", 404);
        return next(error);
    }
    res.status(200).json({
        user: user.toObject(
            {getters: true}
        )
    });
};
//user signup
const signup = async (req, res, next) => {
    const errors = validationResult(req);
    //if any details will miss or give wrong 
    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed, please check your data.', 422)
        );
    }

    const {name,username, email, password} = req.body;
//if user already exist 
    let existingUser;
    try {
        existingUser = await User.findOne({email: email});
    } catch (err) {
        const error = new HttpError(
            err.message,
            500
        );
        return next(error);
    }

    if (existingUser) {
        const error = new HttpError(
            'User exists already, please login instead.',
            422
        );
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError(
            'Could not create user, please try again.',
            500
        );
        return next(error);
    }
    const date = Date().toLocaleString();
    let filePath;
    try {
        if (req.file) {
            filePath = req.file.path;
        } else {
            filePath = 'uploads/images/DUser.jpeg'
        }
    } catch (err) {
        const error = new HttpError(err.message, err.code);
        return next(error);
    }
 
    const createdUser = new User({
        name,
        username,
        email,
        image: 'http://localhost:5000/' + filePath,
        password: hashedPassword
    });

    try {
        await createdUser.save();
    } catch (err) {
        const error = new HttpError(
            err.message,
            500
        );
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            {userId: createdUser.id, email: createdUser.email},
            'supersecret_dont_share',
        );
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again later.',
            500
        );
        return next(error);
    }
//after created user
    await res
        .status(201)
        .json({userId: createdUser.id, email: createdUser.email, token: token});
};
//login user
const login = async (req, res, next) => {
    const {email , password} = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({email: email});
    } catch (err) {
        const error = new HttpError(
            err.message,
            500
        );
        return next(error);
    }

    if (!existingUser) {
        const error = new HttpError(
            'You are not registered!!!',
            403
        );
        return next(error);
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        const error = new HttpError(
            'Could not log you in, please check your credentials and try again.',
            500
        );
        return next(error);
    }

    if (!isValidPassword) {
        const error = new HttpError(
            'Wrong Password!!',
            403
        );
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            {userId: existingUser.id, email: existingUser.email},
            'supersecret_dont_share',
        );
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again later.',
            500
        );
        return next(error);
    }

    await res.json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token
    });
};
// search users
const searchUsers = async (req, res, next) => {
    const query = req.params.query;
    let results;
    try {
        let agg = User.aggregate([{
            $search: {
                "text": {
                    "query": query, "path": "username", "fuzzy": {
                        "maxEdits": 2,
                        "maxExpansions": 10,
                    }
                }
            }
        }, {
            $project: {
                "username": 1,
            }
        }]);
        results = await agg.exec();
    } catch (err) {
        const error = new HttpError(err.message, 404);
        return next(error);
    }
    if (results.length === 0) {
        await res.json({results: "No results found!!"});
    }else{
        await res.json({results: results});
    }

};
//update user
const updateUser= async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed, please check your data.', 422)
        );
    }
    
    const {name, username, password} = req.body;
    const userId = req.params.userId;

    let users;
    try {
        users = await User.findById(userId)
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not update user.',
            500
        );
        return next(error);
    }

    users.name = name;
    users.username = username;
    users.password = password;

    try {
        await users.save();
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not update user.',
            500
        );
        return next(error);
    }

    res.status(200).json({
        users: users.toObject(
            {getters: true})
    });
};
//Delete user
const deleteuser = async (req, res, next) => {
    const userId = req.params.userId;
    const loggedInUserId = req.userData.userId;
    let users;
    try {
        users = await User.findById(userId).populate('users');
    } catch (err) {
        const error = new HttpError(
            err.message,
            500
        );
        return next(error);
    }

    if (!users) {
        const error = new HttpError('Could not find user for this id.', 404);
        return next(error);
    }
    if (user.user.id === loggedInUserId) {
        try {
            const sess = await mongoose.startSession();
            sess.startTransaction();
            await user.remove();
            //user.creator.users.pull(user);
            await user.user.save();
            await sess.commitTransaction();
        } catch (err) {
            const error = new HttpError(
                err.message,
                500
            );
            return next(error);
        }

        res.status(200).json({message: 'Deleted user.'});
    } else {
        await res.json({message: "Not your user to delete"});
    }

};
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.getUserById = getUserById;
exports.searchUsers = searchUsers;
exports.updateUser = updateUser ;
exports.deleteuser = deleteuser;