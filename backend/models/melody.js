const mongoose = require('mongoose');

const melodySchema = mongoose.Schema({
	melody: [{
		_id: false,
		note: String,
		time: String
	}],
	creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	settings: {
		_id: false,
		bar: Number,
		complex: String,
		key: String,
		scale: String,
		beat: String,
		name: String,
		rootKey: String
	},
	time : { type: Date, default: Date.now }
});

module.exports = mongoose.model('Melody', melodySchema);
