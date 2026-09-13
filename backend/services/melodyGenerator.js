// Melody Generation Algorithm
// Ported from frontend creation.service.ts

const Modes = require('./modes');

class MelodyGenerator {
	// Class-level constants (shared across all instances)
	static WHOLE_RANGE_SHARP = [
		"E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4",
		"A#4", "B4", "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5", "C6", "C#6", "D6"
	];

	static WHOLE_RANGE_FLAT = [
		"E3", "F3", "Gb3", "G3", "Ab3", "A3", "Bb3", "B3", "C4", "Db4", "D4", "Eb4", "E4", "F4", "Gb4", "G4", "Ab4", "A4",
		"Bb4", "B4", "C5", "Db5", "D5", "Eb5", "E5", "F5", "Gb5", "G5", "Ab5", "A5", "Bb5", "B5", "C6", "Db6", "D6"
	];

	static HARMONIC_MINOR_MODIFICATIONS = {
		'Db': {'C3': 'B#3', 'C4': 'B#4', 'C5': 'B#5'},
		'D': {'Db3': 'C#3', 'Db4': 'C#4', 'Db5': 'C#5'},
		'F#': {'F3': 'E#3', 'F4': 'E#4', 'F5': 'E#5'},
		'Gb': {'F3': 'E#3', 'F4': 'E#4', 'F5': 'E#5'},
		'G': {'Gb3': 'F#3', 'Gb4': 'F#4', 'Gb5': 'F#5'},
		'Ab': {'F#3': 'F##3', 'F#4': 'F##4', 'F#5': 'F##5'}
	};

	// 0 starts at G3
	static SCALE_INDICES = {
		major: [3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22],
		minor: [3, 4, 6, 8, 10, 11, 13, 15, 16, 18, 20, 22],
		pentatonicmajor: [0, 3, 5, 8, 10, 12, 15, 17, 20],
		pentatonicminor: [1, 3, 6, 8, 11, 13, 15, 18, 20],
		dorian: [3, 5, 6, 8, 10, 11, 13, 15, 17, 18, 20, 22],
		phrygian: [3, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 21],
		lydian: [3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22],
		mixolydian: [3, 5, 6, 8, 10, 12, 13, 15, 17, 18, 20, 22],
		locrian: [2, 4, 6, 8, 9, 11, 13, 14, 16, 18, 20, 21],
		chromatic: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
		harmonicminor: [3, 4, 7, 8, 10, 11, 13, 15, 16, 19, 20, 22],
		melodicminor: [3, 5, 7, 8, 10, 11, 13, 15, 17, 19, 20, 22],
		wholetone: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
	};

	static NOTE_LENGTH = ["2n", "4n", "8n", "16n", "8n.", "8t"];
	static ENDING_DURATIONS = {
		'4/4': { remaining: 0.5, notation: '2n' },
		'3/4': { remaining: 0.25, notation: '4n' }
	};
	static NOTE_DURATIONS = {
		'2n': 0.5,
		'4n': 0.25,
		'8n': 0.125,
		'16n': 0.0625,
		'8n.': 0.1875,
		'8t': 1 / 12
	};
	static RHYTHM_SCORE = {
		'2n': 0,
		'4n': 0,
		'8n': 1,
		'16n': 2,
		'8n.': 3,
		'8t': 3
	};
	static HIGH_RHYTHM_SCORE_THRESHOLD = 18;
	static HIGH_COMPLEX_BAR_SCORE_THRESHOLD = 8;
	static HIGH_MAX_CONSECUTIVE_COMPLEX_BARS = 2;
	static NAMES_OF_SCALES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

	constructor() {
		// Instance state for current melody generation
		this.melody = [];
		this.intervalCheck = [];
		this.settings = null;
		this.scale = null;
		this.rootKey = '';
		this.melodyIndex = -1;
		this.noteIndex = 0;
		this.difference = 0;
		this.bars = 0;
		this.complexity = 0;
		this.pendingSixteenthPair = false;
		this.pendingEighthTriplet = 0;
		this.currentBarLength = 0;
		this.currentRhythmPattern = [];
		this.currentBarRhythm = [];
		this.consecutiveComplexBars = 0;
	}

	// Main entry point
	generateMelody(settings) {
		this.melody = [];
		this.intervalCheck = [];
		this.settings = settings;

		let nameIndex = MelodyGenerator.NAMES_OF_SCALES.indexOf(this.settings.key);
		if (this.settings.key === "F#") nameIndex = 6;
		let mode = settings.scale.toLowerCase().replace(/\s/g, '');
		let newIndexes = this.generateScaleIndexes(nameIndex, mode);
		this.scale = this.generateScale(newIndexes);
		this.createMelody();
		
		return {
			melody: this.melody,
			scale: this.scale,
			settings: this.settings,
			intervals: this.getIntervals()
		};
	}

	generateScaleIndexes(index, mode) {
		return MelodyGenerator.SCALE_INDICES[mode].map(x => x + index);
	}

	generateScale(indices) {
		let scale = [];
		let wholeRange = this.crossOrBKey();

		indices.forEach(element => {
			scale.push(wholeRange[element]);
		});

		// F# replacements
		if (this.rootKey === "F#") {
			const replacements = { "F3": "E#3", "F4": "E#4", "F5": "E#5" };
			scale = scale.map(item => replacements[item] || item);
		}

		// Gb replacements
		if (this.rootKey === "Gb") {
			const replacements = { "B3": "Cb3", "B4": "Cb4", "B5": "Cb5" };
			scale = scale.map(item => replacements[item] || item);
		}

		// Harmonic Minor replacements
		if (this.settings.scale === 'Harmonic Minor' && MelodyGenerator.HARMONIC_MINOR_MODIFICATIONS[this.settings.key]) {
			scale = scale.map(item => MelodyGenerator.HARMONIC_MINOR_MODIFICATIONS[this.settings.key][item] || item);
		}

		return scale;
	}

	crossOrBKey() {
		this.rootKey = Modes.getRootkey(this.settings.key, this.settings.scale);
		this.settings.rootKey = this.rootKey;
		if (this.rootKey.includes('b') || this.rootKey === 'F') return MelodyGenerator.WHOLE_RANGE_FLAT;
		return MelodyGenerator.WHOLE_RANGE_SHARP;
	}

	createMelody() {
		this.melodyIndex = -1;
		this.noteIndex = 0;
		this.difference = 0;
		this.bars = this.settings.bar;
		this.complexity = this.settings.complex === 'Low' ? 2 : this.settings.complex === 'Medium' ? 3 : 5;
		this.pendingSixteenthPair = false;
		this.pendingEighthTriplet = 0;
		this.currentBarRhythm = [];
		this.consecutiveComplexBars = 0;
		this.createNotes();
	}

	createNotes() {
		let bar = 0;
		let timeLeft = 0;
		const endingDuration = MelodyGenerator.ENDING_DURATIONS[this.settings.beat];
		while (this.bars > 0) {
			this.currentRhythmPattern = [];
			if (this.settings.beat === "4/4") {
				bar = 1;
				this.currentBarLength = 1;
				if (this.bars === 1) {
					timeLeft = endingDuration.remaining;
				}
			}
			if (this.settings.beat === "3/4") {
				bar = 0.75;
				this.currentBarLength = 0.75;
				if (this.bars === 1) {
					timeLeft = endingDuration.remaining;
				}
			}
			if (this.settings.complex === 'High') {
				this.currentBarRhythm = this.generateValidBarRhythm(Math.round((bar - timeLeft) * 96));
				if (this.isComplexBar(this.currentBarRhythm)) {
					this.consecutiveComplexBars += 1;
				} else {
					this.consecutiveComplexBars = 0;
				}
			}
			while (bar > timeLeft + Number.EPSILON) {
				let time = this.setTime(bar, timeLeft);
				let barCheck = this.calculateLeftTimeAndPushToMelody(bar, time, timeLeft);
				bar = barCheck.bar;
				if (barCheck.moveOn === true) {
					let note = this.setNote();
					this.pushToMelody(time, note);
				}
			}
			this.bars -= 1;
		}
		this.checkEnding();
	}

	setTime(remaining, minimumRemaining = 0) {
		if (this.settings.complex === 'High' && this.currentBarRhythm.length > 0) {
			return this.currentBarRhythm.shift();
		}
		const targetUnits = Math.round((remaining - minimumRemaining) * 96);
		const elapsedUnits = Math.round((this.currentBarLength - remaining) * 96);
		const sixteenthUnits = Math.round(MelodyGenerator.NOTE_DURATIONS['16n'] * 96);
		const eighthTripletUnits = Math.round(MelodyGenerator.NOTE_DURATIONS['8t'] * 96) * 3;
		if (this.pendingSixteenthPair && targetUnits >= sixteenthUnits) {
			return '16n';
		}
		if (this.pendingEighthTriplet > 0 && targetUnits >= Math.round(MelodyGenerator.NOTE_DURATIONS['8t'] * 96)) {
			return '8t';
		}
		if (targetUnits === sixteenthUnits) {
			return '16n';
		}

		const validTimes = MelodyGenerator.NOTE_LENGTH
			.slice(0, this.complexity + 1)
			.filter(time => {
				const durationUnits = Math.round(MelodyGenerator.NOTE_DURATIONS[time] * 96);
				const leavesSixteenthPair = time === '16n' && !this.pendingSixteenthPair;
				const startsEighthTriplet = time === '8t' && this.pendingEighthTriplet === 0;
				if (startsEighthTriplet && (elapsedUnits % 24 !== 0 || targetUnits < eighthTripletUnits)) {
					return false;
				}
				const remainingUnits = leavesSixteenthPair
					? targetUnits - durationUnits - sixteenthUnits
					: startsEighthTriplet
							? targetUnits - eighthTripletUnits
						: targetUnits - durationUnits;
				if (remainingUnits < 0 || !this.canFill(remainingUnits)) {
					return false;
				}
				return this.isRhythmScoreAllowed(time);
			});

		if (validTimes.length === 0) {
			const fittingTimes = MelodyGenerator.NOTE_LENGTH
				.slice(0, this.complexity + 1)
				.filter(time => {
					const durationUnits = Math.round(MelodyGenerator.NOTE_DURATIONS[time] * 96);
					if (this.pendingSixteenthPair) return time === '16n' && durationUnits <= targetUnits;
					if (this.pendingEighthTriplet > 0) return time === '8t' && durationUnits <= targetUnits;
					if (time === '16n') return targetUnits >= durationUnits * 2;
					if (time === '8t') return targetUnits >= durationUnits * 3;
					return durationUnits <= targetUnits;
				});
			const scoreAllowedTimes = fittingTimes.filter(time => this.isRhythmScoreAllowed(time));
			return (scoreAllowedTimes.length > 0 ? scoreAllowedTimes : fittingTimes)
				.sort((first, second) => this.getCandidateRhythmScore(first) - this.getCandidateRhythmScore(second))[0]
				|| MelodyGenerator.NOTE_LENGTH[this.complexity];
		}

		return validTimes[this.randomNote(0, validTimes.length - 1)];
	}

	generateValidBarRhythm(targetUnits) {
		const choices = [
			{ time: '2n', units: 48, notes: ['2n'] },
			{ time: '4n', units: 24, notes: ['4n'] },
			{ time: '8n', units: 12, notes: ['8n'] },
			{ time: '16n', units: 12, notes: ['16n', '16n'] },
			{ time: '8n.', units: 18, notes: ['8n.'] },
			{ time: '8t', units: 24, notes: ['8t', '8t', '8t'] },
		];

		const findPattern = (remaining, elapsed, pattern) => {
			if (remaining === 0) {
				return this.isValidHighBarPattern(pattern) ? pattern : null;
			}

			const availableChoices = choices
				.filter(choice => choice.units <= remaining)
				.filter(choice => choice.time !== '16n' || elapsed % 12 === 0)
				.filter(choice => choice.time !== '8t' || elapsed % 24 === 0)
				.sort(() => Math.random() - 0.5);

			for (const choice of availableChoices) {
				const nextPattern = pattern.concat(choice.notes);
				if (!this.isValidHighBarPrefix(nextPattern)) {
					continue;
				}
				const result = findPattern(remaining - choice.units, elapsed + choice.units, nextPattern);
				if (result) return result;
			}
			return null;
		};

		return findPattern(targetUnits, 0, []) || ['4n'];
	}

	isValidHighBarPrefix(pattern) {
		if (this.getRhythmScore(pattern) >= MelodyGenerator.HIGH_RHYTHM_SCORE_THRESHOLD) {
			return false;
		}
		return this.consecutiveComplexBars < MelodyGenerator.HIGH_MAX_CONSECUTIVE_COMPLEX_BARS
			|| this.getRhythmScore(pattern) < MelodyGenerator.HIGH_COMPLEX_BAR_SCORE_THRESHOLD;
	}

	isValidHighBarPattern(pattern) {
		return this.isValidHighBarPrefix(pattern)
			&& (!this.isComplexBar(pattern)
				|| this.consecutiveComplexBars < MelodyGenerator.HIGH_MAX_CONSECUTIVE_COMPLEX_BARS);
	}

	isComplexBar(pattern) {
		return this.getRhythmScore(pattern) >= MelodyGenerator.HIGH_COMPLEX_BAR_SCORE_THRESHOLD;
	}

	isRhythmScoreAllowed(time) {
		if (this.settings.complex !== 'High') {
			return true;
		}
		return this.getCandidateRhythmScore(time) < MelodyGenerator.HIGH_RHYTHM_SCORE_THRESHOLD;
	}

	getCandidateRhythmScore(time) {
		const candidatePattern = this.currentRhythmPattern.concat(time);
		if (time === '16n' && !this.pendingSixteenthPair) {
			candidatePattern.push('16n');
		}
		if (time === '8t' && this.pendingEighthTriplet === 0) {
			candidatePattern.push('8t', '8t');
		}
		return this.getRhythmScore(candidatePattern);
	}

	getRhythmScore(pattern) {
		let score = pattern.reduce((total, time) => total + MelodyGenerator.RHYTHM_SCORE[time], 0);
		const sixteenthCount = pattern.filter(time => time === '16n').length;
		const hasDottedEighth = pattern.includes('8n.');
		const hasTriplet = pattern.includes('8t');
		const longestSixteenthRun = this.getLongestRun(pattern, '16n');
		const subdivisionChanges = pattern.slice(1).filter((time, index) =>
			this.getSubdivision(pattern[index]) !== this.getSubdivision(time),
		).length;
		const abruptSubdivisionChanges = pattern.slice(1).filter((time, index) =>
			(time === '16n' && (pattern[index] === '8t' || pattern[index] === '8n.')),
		).length;

		if (hasDottedEighth && hasTriplet) score += 2;
		if (sixteenthCount >= 4) score += (Math.floor(sixteenthCount / 2) - 1) * 2;
		if (longestSixteenthRun > 4) score += longestSixteenthRun - 4;
		if (subdivisionChanges >= 3) score += 2;
		score += abruptSubdivisionChanges * 2;
		return score;
	}

	getLongestRun(pattern, duration) {
		let longestRun = 0;
		let currentRun = 0;
		for (const time of pattern) {
			currentRun = time === duration ? currentRun + 1 : 0;
			longestRun = Math.max(longestRun, currentRun);
		}
		return longestRun;
	}

	getSubdivision(time) {
		if (time === '16n') return 'sixteenth';
		if (time === '8t') return 'triplet';
		if (time === '8n' || time === '8n.') return 'eighth';
		return 'quarter';
	}

	isHighRhythmValid() {
		const endingDuration = MelodyGenerator.ENDING_DURATIONS[this.settings.beat];
		const finalBarRhythmLength = (this.settings.beat === '4/4' ? 1 : 0.75) - endingDuration.remaining;
		const targets = this.settings.beat === '4/4'
			? Array(this.settings.bar - 1).fill(1).concat(finalBarRhythmLength)
			: Array(this.settings.bar - 1).fill(0.75).concat(finalBarRhythmLength);
		const notes = this.melody.slice(0, -1);
		let noteIndex = 0;
		let consecutiveComplexBars = 0;

		for (const target of targets) {
			let total = 0;
			const pattern = [];
			while (noteIndex < notes.length && total < target - Number.EPSILON) {
				const time = notes[noteIndex++].time;
				const duration = MelodyGenerator.NOTE_DURATIONS[time];
				if (duration === undefined) return false;
				pattern.push(time);
				total += duration;
			}
			if (Math.abs(total - target) > Number.EPSILON || this.getRhythmScore(pattern) >= MelodyGenerator.HIGH_RHYTHM_SCORE_THRESHOLD) {
				return false;
			}
			if (this.isComplexBar(pattern)) {
				consecutiveComplexBars += 1;
				if (consecutiveComplexBars > MelodyGenerator.HIGH_MAX_CONSECUTIVE_COMPLEX_BARS) return false;
			} else {
				consecutiveComplexBars = 0;
			}

			for (let index = 0; index < pattern.length; index++) {
				if (pattern[index] !== '16n') continue;
				let groupLength = 0;
				while (pattern[index + groupLength] === '16n') groupLength++;
				if (groupLength < 2 || groupLength % 2 !== 0) return false;
				index += groupLength - 1;
			}
		}

		return noteIndex === notes.length;
	}

	canFill(targetUnits) {
		if (targetUnits === 0) {
			return true;
		}
		if (targetUnits < 0) {
			return false;
		}

		const durations = MelodyGenerator.NOTE_LENGTH
			.slice(0, this.complexity + 1)
			.filter(time => time !== '16n' && time !== '8t')
			.map(time => Math.round(MelodyGenerator.NOTE_DURATIONS[time] * 96));
		if (this.complexity >= 3) {
			durations.push(Math.round(MelodyGenerator.NOTE_DURATIONS['16n'] * 96) * 2);
		}
		if (this.complexity >= 5) {
			durations.push(Math.round(MelodyGenerator.NOTE_DURATIONS['8t'] * 96) * 3);
		}
		const reachable = new Array(targetUnits + 1).fill(false);
		reachable[0] = true;

		for (let units = 1; units <= targetUnits; units++) {
			reachable[units] = durations.some(duration =>
				duration <= units && reachable[units - duration],
			);
		}

		return reachable[targetUnits];
	}

	calculateLeftTimeAndPushToMelody(bar, time, minimumRemaining = 0) {
		const timeLength = MelodyGenerator.NOTE_DURATIONS[time];
		if (timeLength === undefined) return { bar, moveOn: false };

		const nextBar = bar - timeLength;
		const moveOn = nextBar >= minimumRemaining - Number.EPSILON;
		return { bar: moveOn ? nextBar : bar, moveOn };
	}

	pushToMelody(time, note) {
		this.melody.push({ note, time });
		this.melodyIndex = this.melody.length - 1;
		this.currentRhythmPattern.push(time);
		if (time === '16n') {
			this.pendingSixteenthPair = !this.pendingSixteenthPair;
		}
		if (time === '8t') {
			this.pendingEighthTriplet = (this.pendingEighthTriplet + 1) % 3;
		}
	}

	setNote() {
		let searchScale = JSON.parse(JSON.stringify(this.scale));
		let note = '';
		
		if (this.checkTonic()) {
			note = this.setTonicNote();
		} else {
			searchScale = this.checkForQuantil(searchScale);
			searchScale = this.notTripplet(searchScale);
			searchScale = this.noteAfterQuint(searchScale);
			note = this.getRandomNoteOfScale(searchScale);
		}
		return note;
	}

	checkTonic() {
		return this.melody.length === 0;
	}

	setTonicNote() {
		return this.scale[3];
	}

	checkForQuantil(scale) {
		let foundNoteIndex = scale.indexOf(this.melody[this.melodyIndex].note);
		let lowerIndex = foundNoteIndex - 4;
		if (lowerIndex < 0) lowerIndex = 0;
		let upperIndex = foundNoteIndex + 4;
		if (upperIndex > scale.length) upperIndex = scale.length - 1;
		return scale.splice(lowerIndex, upperIndex);
	}

	notTripplet(scale) {
		if (this.melody.length >= 2) {
			if (this.melody[this.melodyIndex].note === this.melody[this.melodyIndex - 1].note) {
				let foundIndex = scale.indexOf(this.melody[this.melodyIndex].note);
				if (foundIndex > -1) {
					scale.splice(foundIndex, 1);
				}
			}
		}
		return scale;
	}

	noteAfterQuint(scale) {
		if (this.melody.length >= 2) {
			let firstNote = this.scale.indexOf(this.melody[this.melodyIndex - 1].note);
			let secondNote = this.scale.indexOf(this.melody[this.melodyIndex].note);
			let difference = this.getDifference(firstNote, secondNote);
			
			if (difference === 4) {
				if (firstNote < secondNote) {
					return this.scale.slice(secondNote - 1, secondNote);
				}
				if (firstNote > secondNote) {
					return this.scale.slice(secondNote + 1, secondNote + 2);
				}
			}
		}
		return scale;
	}

	getRandomNoteOfScale(scale) {
		let random = Math.floor(Math.random() * (scale.length - 1));
		return scale[random];
	}

	randomNote(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	checkEnding() {
		const endingDuration = MelodyGenerator.ENDING_DURATIONS[this.settings.beat];
		const lastNote = this.melody[this.melody.length - 1];
		const previousNote = this.melody[this.melody.length - 2];
		if (this.pendingSixteenthPair && lastNote?.time === '16n' && previousNote?.time !== '16n') {
			this.pushToMelody('16n', this.melody[this.melody.length - 1].note);
		}
		while (this.pendingEighthTriplet > 0) {
			this.pushToMelody('8t', this.melody[this.melody.length - 1].note);
		}
		this.melody.push({ note: this.melody[0].note, time: endingDuration.notation });
	}

	getDifference(index1, index2) {
		return Math.abs(index1 - index2);
	}

	getIntervals() {
		const intervals = [];
		for (let i = 1; i < this.melody.length - 1; i++) {
			let difference = this.getDifference(
				this.scale.indexOf(this.melody[i].note), 
				this.scale.indexOf(this.melody[i - 1].note)
			);
			intervals.push(difference);
		}
		return intervals;
	}
}

module.exports = MelodyGenerator;
