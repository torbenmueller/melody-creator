const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	email: { type: String, required: true },
	password: { type: String, required: true },
	resetToken: String,
	resetTokenExpiration: Date,
	// Email verification fields
	isEmailVerified: { type: Boolean, default: false },
	emailVerificationToken: String,
	emailVerificationTokenExpiration: Date,
	// Pending email change fields
	pendingEmail: String,
	pendingEmailToken: String,
	pendingEmailTokenExpiration: Date,
	// When the last activation (verification) email was sent
	lastActivationSent: Date,
	plan: String,
	melodiesLeft: Number,
	freePlanUsed: Boolean,
	time: { type: Date, default: Date.now },
	// Password reset request limiting (per calendar month)
	resetRequestsCount: { type: Number, default: 0 },
	resetRequestsMonth: { type: Number }
});

module.exports = mongoose.model('User', userSchema);