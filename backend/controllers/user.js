const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Melody = require('../models/melody');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendgridTransport({
	auth: {
		api_key: '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'
	}
}));

exports.createUser = (req, res, next) => {
	bcrypt.hash(req.body.password, 10, )
		.then(hash => {
			const user = new User({
				email: req.body.email,
				password: hash,
				melodiesLeft: 10,
				freePlanUsed: false
			});
			user.save()
				.then(result => {
					res.status(201).json({
						message: 'User created',
						result: result
					});
					return transporter.sendMail({
						to: req.body.email,
						from: 'torben.jan.mueller@gmail.com',
						subject: 'Signup succeeded',
						html: `
							<p>You successfully signed up.</p>
						`
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
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.redirect('/auth/forgot-password');
		}
		const token = buffer.toString('hex');
		let userId;
		User.findOne({ email: req.body.email })
			.then(user => {
				if (!user) {
					// req.flash('error', 'No account could be found for this email.');
					return res.redirect('/auth/forgot-password');
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
				transporter.sendMail({
					to: req.body.email,
					from: 'torben.jan.mueller@gmail.com',
					subject: 'Password reset',
					html: `
						<p>You requested a password reset.</p>
						<p>Click this <a href="http://localhost:4200/auth/new-password/${token}/${userId}">link</a> to set a new password.</p>
					`
				});
			})
			.catch(err => {
				console.log(err);
			});
	});
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

exports.updateEmail = async (req, res, next) => {
	try {
		const user = await User.findOne({ _id: req.userData.userId });
		user.email = req.body.email;
		await user.save();
		res.status(200).json({
			message: 'Email changed successfully'
		});

	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: 'An error occurred while updating the email'
		});
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
