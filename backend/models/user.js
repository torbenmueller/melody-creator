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
	plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
	// Credit system
	creditsPermanent: { type: Number, default: 0 },
	creditsDaily: { type: Number, default: 0 },
	creditsDailyExpiresAt: { type: Date },
	time: { type: Date, default: Date.now },
	// Password reset request limiting (per calendar month)
	resetRequestsCount: { type: Number, default: 0 },
	resetRequestsMonth: { type: Number },
	// Password change request limiting
	passwordChangeRequestsCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);