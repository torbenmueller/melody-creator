const emailjs = require('@emailjs/nodejs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Melody = require('../models/melody');
const crypto = require('crypto');
const { link } = require('fs');
require('dotenv').config();

exports.createUser = (req, res, next) => {
	bcrypt.hash(req.body.password, 10)
		.then(hash => {
			// Generate email verification token
			const verificationToken = crypto.randomBytes(32).toString('hex');
			const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h
			const user = new User({
				email: req.body.email,
				password: hash,
				melodiesLeft: 10,
				freePlanUsed: false,
				isEmailVerified: false,
				emailVerificationToken: verificationToken,
				emailVerificationTokenExpiration: verificationExpiry
			});
			user.save()
				.then(result => {
					res.status(201).json({
						message: 'Verification email sent. Please confirm your email to complete registration.',
						result: result
					});
					emailjs
						.send(
							process.env.EMAILJS_SERVICE_ID,
							process.env.EMAILJS_TEMPLATE_RESET_ID,
							{
								to_email: req.body.email,
								app_name: 'Melody Creator',
								subject: 'Verify your email',
								email_text: 'welcome to Melody Creator! Please click the "Verify Email" link. When the page opens, click the Confirm button to complete verification. The link expires in 24 hours.',
								email_href: `http://localhost:4200/auth/verify-email/${verificationToken}/${result._id}`,
								link_text: 'Verify Email',
								support: 'Technical Support',
								support_initials: 'TS'
							},
							{
								publicKey: process.env.EMAILJS_PUBLIC_KEY,
								privateKey: process.env.EMAILJS_PRIVATE_KEY
							}
						)
						.then(() => {
							// ok
						})
						.catch(err => {
							console.log('EmailJS send error (verify):', err);
						});
				})
				.catch(err => {
					res.status(500).json({
						message: "Invalid authentication credentials!"
					});
				});
		});
}

exports.deleteUser = async (req, res, next) => {
	try {
		const userId = req.userData.userId;
		const deletedUser = await User.findByIdAndDelete({ _id: userId });
		if (!deletedUser) return res.status(404).json({ message: 'User not found' });
		await Melody.deleteMany({ creator: userId });
		return res.status(200).json({ message: 'User and associated melodies deleted successfully' });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: 'Internal server error' });
	}
}

exports.verifyEmail = async (req, res, next) => {
	try {
		// Log caller info to help diagnose duplicate requests (prefetchers, scanners, etc.)
		console.log('verifyEmail called', {
			ip: req.ip,
			ua: req.get('user-agent'),
			referer: req.get('referer'),
			time: new Date().toISOString()
		});

		const { token, userId } = req.body || {};
		if (!token || !userId) {
			return res.status(400).json({ message: 'Token and userId are required.' });
		}

		const user = await User.findOne({
			_id: userId,
			emailVerificationToken: token,
			emailVerificationTokenExpiration: { $gt: Date.now() }
		});

		if (!user) {
			// Invalid or expired token — return 400 but do not perform side effects.
			return res.status(400).json({ message: 'Invalid or expired verification token.' });
		}

		if (user.isEmailVerified) {
			// Idempotent: already verified
			return res.status(200).json({ message: 'Email already verified.' });
		}

		user.isEmailVerified = true;
		user.emailVerificationToken = undefined;
		user.emailVerificationTokenExpiration = undefined;
		await user.save();

		// Respond after saving
		return res.status(200).json({ message: 'Email verified successfully.' });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: 'Internal server error' });
	}
}

exports.loginUser = async (req, res, next) => {
	try {
		const user = await User.findOne({ email: req.body.email });
		if (!user) {
			return res.status(401).json({
				message: 'Auth failed!'
			});
		}
		const fetchedUser = user;
		const result = await bcrypt.compare(req.body.password, user.password);
		if (!result) {
			return res.status(401).json({
				message: 'Auth failed!'
			});
		}
		if (!fetchedUser.isEmailVerified) {
			return res.status(403).json({
				message: 'Please verify your email before logging in.'
			});
		}
		const token = jwt.sign(
			{ email: fetchedUser.email, userId: fetchedUser._id },
			process.env.JWT_KEY,
			{ expiresIn: '1h' }
		);
		res.status(200).json({
			token: token,
			expiresIn: 3600,
			userId: fetchedUser._id
		});

	} catch (error) {
		return res.status(401).json({
			message: 'Invalid authentication credentials!'
		});
	}
}

exports.resetPassword = (req, res, next) => {
    if (!req.body || !req.body.email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.status(500).json({ message: 'Could not generate reset token. Please try again later.' });
		}
		const token = buffer.toString('hex');
		let userId;

		User.findOne({ email: req.body.email })
			.then(user => {
				if (!user) {
					return res.status(404).json({ message: 'No account found for this email address.' });
				}
				user.resetToken = token;
				user.resetTokenExpiration = Date.now() + 3600000;
				userId = user._id;
				return user.save();
			})
			.then(result => {
				res.status(201).json({
					message: 'Password reset email sent',
					result: result
				});
				emailjs
					.send(
						process.env.EMAILJS_SERVICE_ID,
						process.env.EMAILJS_TEMPLATE_RESET_ID,
						{
							to_email: req.body.email,
							app_name: 'Melody Creator',
							subject: 'Password Reset Request',
							email_text: 'you requested a password reset. Click this link to set a new password. If you did not request this, please ignore this email.',
							email_href: `http://localhost:4200/auth/new-password/${token}/${userId}`,
							link_text: 'Reset Password',
							support: 'Technical Support',
							support_initials: 'TS'
						},
						{
							publicKey: process.env.EMAILJS_PUBLIC_KEY,
							privateKey: process.env.EMAILJS_PRIVATE_KEY
						}
					)
					.then(() => {
						// ok
					})
					.catch(err => {
						console.log('EmailJS send error (reset):', err);
					});
			})
			.catch(err => {
				console.log('Reset password error:', err);
				if (!res.headersSent) {
					return res.status(500).json({ message: 'Internal server error while processing password reset.' });
				}
			});
	});
}

// Resend activation (verification) email to a user if not yet verified.
// Rate-limited to once per hour per account using lastActivationSent in the user document.
exports.resendActivation = async (req, res, next) => {
	try {
		const emailRaw = req.body?.email;
		if (!emailRaw) return res.status(400).json({ message: 'Email is required.' });
		const email = emailRaw.toString().toLowerCase();

		const user = await User.findOne({ email });
		if (!user) return res.status(404).json({ message: 'No account found for this email address.' });

		if (user.isEmailVerified) {
			return res.status(400).json({ message: 'This account is already verified.' });
		}

		const now = Date.now();
		const last = user.lastActivationSent ? new Date(user.lastActivationSent).getTime() : 0;
		const oneHour = 60 * 60 * 1000;
		if (last && (now - last) < oneHour) {
		const minutesLeft = Math.ceil((oneHour - (now - last)) / 60000);
		const minuteWord = minutesLeft === 1 ? 'minute' : 'minutes';
		return res.status(429).json({ message: `Activation email already sent. Try again in ${minutesLeft} ${minuteWord}.` });
		}

		// Create or refresh verification token
		const verificationToken = crypto.randomBytes(32).toString('hex');
		const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h

		user.emailVerificationToken = verificationToken;
		user.emailVerificationTokenExpiration = verificationExpiry;
		user.lastActivationSent = new Date();
		await user.save();

		// Send verification email
		emailjs
			.send(
				process.env.EMAILJS_SERVICE_ID,
				process.env.EMAILJS_TEMPLATE_RESET_ID,
				{
					to_email: user.email,
					app_name: 'Melody Creator',
					subject: 'Verify your email',
					email_text: 'Please click the Verify Email link. When the page opens, click the Confirm button to complete verification. The link expires in 24 hours.',
					email_href: `http://localhost:4200/auth/verify-email/${verificationToken}/${user._id}`,
					link_text: 'Verify Email',
					support: 'Technical Support',
					support_initials: 'TS'
				},
				{
					publicKey: process.env.EMAILJS_PUBLIC_KEY,
					privateKey: process.env.EMAILJS_PRIVATE_KEY
				}
			)
			.then(() => {
				return res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
			})
			.catch(err => {
				console.log('EmailJS send error (resend-activation):', err);
				return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
			});

	} catch (err) {
		console.error('resendActivation error', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.newPassword;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

	User.findOne({
		resetToken: passwordToken,
		resetTokenExpiration: {$gt: Date.now()},
		_id: userId
	})
		.then(user => {
			resetUser = user;
			return bcrypt.hash(newPassword, 10);
		})
		.then(hashedPassword => {
			resetUser.password = hashedPassword;
			resetUser.resetToken = undefined;
			resetUser.resetTokenExpiration = undefined;
			return resetUser.save();
		})
		.then(result => {
			// res.redirect('/auth/login');
			res.status(201).json({
				message: 'New password was created successfully.',
				result: result
			});
		})
		.catch(err => {
			console.log(err);
		});
}

exports.getUser = async (req, res, next) => {
	try {
		const user = await User.findOne({ _id: req.userData.userId });
		res.send(user);
	} catch (error) {
		res.send(error);
	}
}

// Public endpoint to check if an email is already used by another account
exports.checkEmail = async (req, res, next) => {
	try {
		const email = req.query.email;
		if (!email) return res.status(400).json({ message: 'Email query parameter is required.' });
		const existing = await User.findOne({ email: email.toString().toLowerCase() });
		if (existing) {
			return res.status(409).json({ available: false, message: 'Email already in use.' });
		}
		return res.status(200).json({ available: true });
	} catch (err) {
		console.error('checkEmail error', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
}

exports.updateEmail = async (req, res, next) => {
	try {
		const newEmailRaw = req.body.email;
		if (!newEmailRaw) return res.status(400).json({ message: 'New email is required.' });
		const newEmail = newEmailRaw.toString().toLowerCase();

		const user = await User.findOne({ _id: req.userData.userId });
		if (!user) return res.status(404).json({ message: 'User not found.' });

		// If the requested email is the same as the current one
		if (user.email && user.email.toLowerCase() === newEmail) {
			return res.status(400).json({ message: 'New email is the same as the current email.' });
		}

		// Prevent changing to an email already in use by another account
		const existing = await User.findOne({ email: newEmail });
		if (existing && existing._id.toString() !== user._id.toString()) {
			return res.status(409).json({ message: 'Email already in use.' });
		}

		// Create a verification token for the email change and save to pending fields
		const verificationToken = crypto.randomBytes(32).toString('hex');
		const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h

		user.pendingEmail = newEmail;
		user.pendingEmailToken = verificationToken;
		user.pendingEmailTokenExpiration = verificationExpiry;
		await user.save();

		// Send a verification email to the new address
		emailjs
			.send(
				process.env.EMAILJS_SERVICE_ID,
				process.env.EMAILJS_TEMPLATE_RESET_ID,
				{
					to_email: newEmail,
					app_name: 'Melody Creator',
					subject: 'Confirm your new email address',
					email_text: 'you requested to change your email for Melody Creator. When the page opens, click the Confirm button to complete the change. The link expires in 24 hours.',
					email_href: `http://localhost:4200/auth/verify-email-change/${verificationToken}/${user._id}`,
					link_text: 'Confirm Email Change',
					support: 'Technical Support',
					support_initials: 'TS'
				},
				{
					publicKey: process.env.EMAILJS_PUBLIC_KEY,
					privateKey: process.env.EMAILJS_PRIVATE_KEY
				}
			)
			.then(() => {
				// Respond to client that verification email was sent
				res.status(200).json({ message: 'Verification email sent to the new address. Please confirm to complete the change.' });
			})
			.catch(err => {
				console.log('EmailJS send error (update-email):', err);
				// Keep pending fields in place, inform client
				res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
			});

	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: 'An error occurred while processing the email change request.'
		});
	}
}

// Finalize pending email change when the user confirms via the emailed link
exports.verifyEmailChange = async (req, res, next) => {
	try {
		const { token, userId } = req.body || {};
		if (!token || !userId) return res.status(400).json({ message: 'Token and userId are required.' });

		const user = await User.findOne({
			_id: userId,
			pendingEmailToken: token,
			pendingEmailTokenExpiration: { $gt: Date.now() }
		});

		if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

		// Ensure no other account currently owns the pending email (race-safe check)
		if (user.pendingEmail) {
			const existing = await User.findOne({ email: user.pendingEmail });
			if (existing && existing._id.toString() !== user._id.toString()) {
				// Another account took the email in the meantime
				user.pendingEmail = undefined;
				user.pendingEmailToken = undefined;
				user.pendingEmailTokenExpiration = undefined;
				await user.save();
				return res.status(409).json({ message: 'Email is already in use by another account.' });
			}

			// Apply the pending email
			user.email = user.pendingEmail;
			user.pendingEmail = undefined;
			user.pendingEmailToken = undefined;
			user.pendingEmailTokenExpiration = undefined;
			// Keep isEmailVerified as-is (user already verified when account created)
			await user.save();
			return res.status(200).json({ message: 'Email changed successfully.' });
		}

		return res.status(400).json({ message: 'No pending email change found.' });
	} catch (err) {
		console.error('verifyEmailChange error', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
}

exports.updatePassword = async (req, res, next) => {
	try {
		const user = await User.findOne({ _id: req.userData.userId });
		const passwordMatches = await bcrypt.compare(req.body.password, user.password);

		if (!passwordMatches) {
			return res.status(401).json({
				message: 'Wrong password'
			});
		}

		const newPassword = await bcrypt.hash(req.body.newpassword, 10);
		user.password = newPassword;
		await user.save();
		res.status(200).json({
			message: 'Password changed successfully'
		});

	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: 'An error occurred while updating the password'
		});
	}
}
