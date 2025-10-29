const Melody = require('../models/melody');
const MidiWriter = require('midi-writer-js');

exports.saveMelody = (req, res, next) => {
	const melody = new Melody({
		melody: req.body.melody,
		creator: req.userData.userId,
		settings: req.body.settings
	});
	
	if (melody.settings.name === '') melody.settings.name = 'Melody';

	melody.save().then(() => {
		res.status(201).json({
			message: 'Melody saved successfully!'
		});
	}).catch(error => {
		res.status(500).json({
			message: 'Creating a melody failed!'
		});
	});
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
