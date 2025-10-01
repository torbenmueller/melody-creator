/* const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = mongoose.Schema({
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true }
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema); */

const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	email: { type: String, required: true },
	password: { type: String, required: true },
	resetToken: String,
	resetTokenExpiration: Date,
	plan: String,
	melodiesLeft: Number,
	freePlanUsed: Boolean,
	time : { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);