const Melody = require('../models/melody');
const User = require('../models/user');
const MidiWriter = require('midi-writer-js');
const MelodyGenerator = require('../services/melodyGenerator');

// Validate settings based on user plan (unauthenticated or free users have restrictions)
function validateSettingsForPlan(settings, plan) {
	const errors = [];
	
	// Restrictions for unauthenticated and free users
	if (!plan || plan === 'free') {
		// Only Major and Minor scales allowed
		if (settings.scale !== 'Major' && settings.scale !== 'Minor') {
			errors.push('Only Major and Minor scales are available for free users');
		}
		
		// Only 2 or 4 bars allowed
		if (settings.bar !== 2 && settings.bar !== 4) {
			errors.push('Only 2 or 4 bars are available for free users');
		}
		
		// Only Low complexity allowed
		if (settings.complex !== 'Low') {
			errors.push('Only Low complexity is available for free users');
		}
		
		// Only 4/4 beat allowed
		if (settings.beat !== '4/4') {
			errors.push('Only 4/4 beat is available for free users');
		}
	}
	
	return errors;
}

// Generate melody on backend (new endpoint to replace frontend generation)
exports.generateMelody = async (req, res, next) => {
	try {
		const { settings } = req.body;
		if (!settings) {
			return res.status(400).json({ message: 'Settings are required' });
		}

		let userPlan = null;
		
		// Check if user is authenticated
		if (req.userData && req.userData.userId) {
			const user = await User.findById(req.userData.userId);
			if (user) {
				userPlan = user.plan;
			}
		}
		
		// Validate settings based on user plan
		const validationErrors = validateSettingsForPlan(settings, userPlan);
		if (validationErrors.length > 0) {
			return res.status(403).json({ 
				message: 'Invalid settings for your plan',
				errors: validationErrors
			});
		}

		// Generate melody using backend algorithm
		const generator = new MelodyGenerator();
		const result = generator.generateMelody(settings);
		
		return res.status(200).json({
			melody: result.melody,
			scale: result.scale,
			settings: result.settings,
			intervals: result.intervals
		});
	} catch (error) {
		console.error('Generate melody error:', error);
		return res.status(500).json({
			message: 'Melody generation failed',
			error: error.message
		});
	}
};

// Validate settings before melody creation (called from frontend before generation)
exports.validateSettings = async (req, res, next) => {
	try {
		let userPlan = null;
		
		// Check if user is authenticated
		if (req.userData && req.userData.userId) {
			const user = await User.findById(req.userData.userId);
			if (user) {
				userPlan = user.plan;
			}
		}
		// If not authenticated or user not found, userPlan remains null (will apply restrictions)
		
		const validationErrors = validateSettingsForPlan(req.body.settings, userPlan);
		
		if (validationErrors.length > 0) {
			return res.status(403).json({ 
				valid: false,
				message: 'Invalid settings for your plan',
				errors: validationErrors
			});
		}
		
		return res.status(200).json({ 
			valid: true,
			message: 'Settings are valid'
		});
	} catch (error) {
		console.error('Validate settings error:', error);
		return res.status(500).json({
			valid: false,
			message: 'Validation failed due to server error'
		});
	}
}

exports.saveMelody = async (req, res, next) => {
	try {
		// Fetch user from database to get current plan
		const user = await User.findById(req.userData.userId);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		
		// Check if user has enough credits to save
		const requiredCredits = 1;
		let availableCredits = 0;
		
		if (user.plan === 'pro' || user.plan === 'enterprise') {
			availableCredits = user.creditsPermanent || 0;
		} else {
			// For free plan, check both daily and permanent credits
			availableCredits = (user.creditsDaily || 0) + (user.creditsPermanent || 0);
		}
		
		if (availableCredits < requiredCredits) {
			return res.status(403).json({ 
				message: `Insufficient credits to save melody. You have ${availableCredits} credits but need ${requiredCredits}.`,
				hasEnoughCredits: false
			});
		}
		
		// Validate settings based on user plan
		const validationErrors = validateSettingsForPlan(req.body.settings, user.plan);
		if (validationErrors.length > 0) {
			return res.status(403).json({ 
				message: 'Invalid settings for your plan',
				errors: validationErrors
			});
		}
		
		const melody = new Melody({
			melody: req.body.melody,
			creator: req.userData.userId,
			settings: req.body.settings,
			plan: user.plan // Use plan from database
		});
		
		if (melody.settings.name === '') melody.settings.name = 'Melody';

		await melody.save();
		res.status(201).json({
			message: 'Melody saved successfully!'
		});
	} catch (error) {
		console.error('Save melody error:', error);
		res.status(500).json({
			message: 'Creating a melody failed!'
		});
	}
}

exports.loadMelodies = (req, res, next) => {
	const pageSize = +req.query.pagesize;
	const currentPage = +req.query.page;
	const sortByType = req.query.sort_by_type;
	const order = parseInt(req.query.order);
	// let melodyQuery = Melody.find({ creator: req.userData.userId }).sort({ time: -1 });
	let melodyQuery = Melody.find({ creator: req.userData.userId });
	let fetchedMelodies;

	if (sortByType === "time") melodyQuery.sort({ time: order });
	if (sortByType === "license") melodyQuery.sort({ plan: order });
	if (sortByType === "name") melodyQuery.sort({ 'settings.name': order });
	if (sortByType === "key") melodyQuery.sort({ 'settings.key': order });
	if (sortByType === "bar") melodyQuery.sort({ 'settings.bar': order });
	if (sortByType === "complex") melodyQuery.sort({ 'settings.complex': order });
	if (sortByType === "beat") melodyQuery.sort({ 'settings.beat': order });

	if (pageSize && currentPage) {
		melodyQuery
			.skip(pageSize * (currentPage - 1))
			.limit(pageSize);
	}
	melodyQuery
		.then(documents => {
			fetchedMelodies = documents;
			return Melody.countDocuments({ creator: req.userData.userId });
		}).then(count => {
			res.status(200).json({
				message: 'Melodies fetched successfully!',
				melodies: fetchedMelodies,
				maxMelodies: count
			});
		}).catch(error => {
			res.status(500).json({
				message: 'Fetching melodies failed!'
			});
		});
}

exports.deleteMelody = (req, res, next) => {
	Melody.deleteOne({ _id: req.params.id })
		.then(result => {
			res.status(200).json({ message: 'Melody deleted!' });
		}).catch(error => {
			res.status(500).json({
				message: 'Deleting melody failed!'
			});
		});
}

exports.getModes = (req, res, next) => {
	let allMelodies = Melody.find({ creator: req.userData.userId }).sort({ time: -1 });
	allMelodies
		.then(documents => {
			const modes = getAllDifferentModes(documents);
			res.status(200).json({
				message: 'Modes fetched successfully!',
				modes: modes
			}); 
		}).catch(error => {
			res.status(500).json({
				message: 'Fetching modes failed!'
			});
		});
}

exports.getMidiFile = async (req, res, next) => {
	try {
		const melody = await Melody.findOne({ _id: req.params.id });
		const writer = await createNewMidiFile(melody);
		const name = melody.settings.name;
		res.set('Content-Type', 'audio/midi');
		res.set('Content-Disposition', `attachment; filename="${name}.mid"`);
		res.send(Buffer.from(writer.buildFile()));
	} catch (error) {
		res.send(error);
	}
}

const getAllDifferentModes = (documents => {
	const modeValues = {};
	let maxValue = 0;

	for (let i = 0; i < documents.length; i++) {
		const value = documents[i].settings.scale;
		if (modeValues[value]) {
			modeValues[value]++;
		} else {
			modeValues[value] = 1;
		}
		if (modeValues[value] > maxValue) {
			maxValue = modeValues[value];
		}
	}

	const modeData = {
		modeValues: modeValues, 
		maxValue: maxValue
	};

	return modeData;
});

const createNewMidiFile = (result => {
	const beat = result.settings.beat;
	const firstChar = +beat.charAt(0);
	const lastChar = +beat.charAt(beat.length -1);
	const track = new MidiWriter.Track();
	track.setTempo(120);
	track.setTimeSignature(firstChar, lastChar);

	const ticks = {
		'2n': '2',
		'4n': '4',
		'8n': '8'
	}

	for (const obj of result.melody) {
		track.addEvent(new MidiWriter.NoteEvent({ pitch: [obj.note], duration: ticks[obj.time] }));
	}

	const writer = new MidiWriter.Writer([track]);

	return writer;
});
