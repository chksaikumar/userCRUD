const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');


const userSchema = new mongoose.Schema({
    name:{type: String, required: true},
    username: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    image: {type: String, default: "ff"},
    password: {type: String, required: true, minlength: 6}
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
