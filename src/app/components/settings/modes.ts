export class Modes {
	sharpKeys = ["G", "D", "A", "E", "B", "F#"];
	chromaticSharpScale= ["G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "F#"];
	chromaticFlatScale= ["G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb"];

	keyIndices = {
		"Major": 0,
		"Dorian": -2,
		"Phrygian": -4,
		"Lydian": -5,
		"Mixolydian": +5,
		"Minor": +3,
		"Locrian": +1,
		"Pentatonic Major": 0,
		"Pentatonic Minor": +3,
		"Chromatic": 0,
		"Harmonic Minor": +3,
		"Melodic Minor": +3,
		"Whole Tone": 0
	}

	getRootkey(key: string, mode: string) {
		let chromaticScale =  this.chromaticFlatScale;
		if (this.sharpKeys.includes(key)) chromaticScale = this.chromaticSharpScale;
		let rootKey = chromaticScale.indexOf(key) + this.keyIndices[mode];
		if (rootKey < 0) return chromaticScale[chromaticScale.length + rootKey];
		return chromaticScale[rootKey % chromaticScale.length];
	}

}