import { Injectable } from '@angular/core';
import * as Tone from 'tone';
import { Settings } from '../interfaces/settings';
import { Modes } from '../components/settings/modes';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { HarmonicMinorModifications } from '../interfaces/harmonic-minor-modifications';
import { ToastrService } from 'ngx-toastr';

const BACKEND_URL = environment.apiUrl + "/melodies";

@Injectable({
  providedIn: 'root'
})
export class CreationService {
	settings!: Settings;
	scale: any;
	melody!: any[];
	intervalCheck: number[] = [];
	sampler!: Tone.Sampler;

	initSampler() {
		this.sampler = new Tone.Sampler({
			urls: {
				"C4": "piano_c4.mp3"
			},
			release: 1,
			baseUrl: "../../assets/samples/",
		}).toDestination();
	}

	harmonies = ["t", "s", "d", "tp"];

	noteLength = ["2n", "4n", "8n"];

	wholeRangeSharp = [
		"E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4",
		"A#4", "B4", "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5", "C6", "C#6", "D6"
	];

	wholeRangeFlat = [
		"E3", "F3", "Gb3", "G3", "Ab3", "A3", "Bb3", "B3", "C4", "Db4", "D4", "Eb4", "E4", "F4", "Gb4", "G4", "Ab4", "A4",
		"Bb4", "B4", "C5", "Db5", "D5", "Eb5", "E5", "F5", "Gb5", "G5", "Ab5", "A5", "Bb5", "B5", "C6", "Db6", "D6"
	];

	harmonicMinorModifications: HarmonicMinorModifications = {
		'Db': {'C3': 'B#3', 'C4': 'B#4', 'C5': 'B#5'},
		'D': {'Db3': 'C#3', 'Db4': 'C#4', 'Db5': 'C#5'},
		'F#': {'F3': 'E#3', 'F4': 'E#4', 'F5': 'E#5'},
		'Gb': {'F3': 'E#3', 'F4': 'E#4', 'F5': 'E#5'},
		'G': {'Gb3': 'F#3', 'Gb4': 'F#4', 'Gb5': 'F#5'},
		'Ab': {'F#3': 'F##3', 'F#4': 'F##4', 'F#5': 'F##5'}
	}
	
	// 0 starts at G3
	scaleIndices = {
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
	}

	melodyIndex!: number;
	noteIndex!: number;
	difference!: number;
	bars!: number;

	private melodiesUpdated = new Subject<{melodies: any, melodiesCount: number}>();

	fetchedMelodies: any = [];
	maxMelodies: number = 0;

	namesOfScales = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

	modes: Modes = new Modes();
	rootKey: string = '';

	isPlaying = new Subject<boolean>();
	scoreData = new Subject<any>();

	constructor(
		private http: HttpClient,
		private toastr: ToastrService
	) { }

	addMelody(melody: object) {
		const post: object = {
			melody: melody,
			settings: this.settings
		}
		this.http.post<{message: string}>(BACKEND_URL, post)
			.subscribe({
				next: (responseData) => {
					this.toastr.success(responseData.message);
				},
				error: (error) => {
					if (error.status === 403) {
						const errorMsg = error.error.errors?.join(', ') || error.error.message || 'Cannot save melody with current settings';
						this.toastr.error(errorMsg);
					} else {
						this.toastr.error('Failed to save melody. Please try again.');
					}
				}
			});
	}

	setValuesToEmptyString(obj: { [key: string]: any }) {
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				obj[key] = '';
			}
		}
	}

	getMelodies(melodiesPerPage: number, currentPage: number, sortByType: string, order: number ) {
		const queryParams = `?pagesize=${melodiesPerPage}&page=${currentPage}&sort_by_type=${sortByType}&order=${order}`;
		this.http.get<{message: string, melodies: any, maxMelodies: number}>(BACKEND_URL + queryParams)
			.subscribe((data) => {
				this.fetchedMelodies = data.melodies;
				this.maxMelodies = data.maxMelodies;
				this.melodiesUpdated.next({melodies: this.fetchedMelodies, melodiesCount: this.maxMelodies});
			});
	}

	getMidiFile(id: any): Observable<HttpResponse<ArrayBuffer>> {
		const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
		return this.http.get(`${BACKEND_URL}/midi/${id}`, {
			headers: headers,
			responseType: 'arraybuffer',
			observe: 'response'
		});
	}

	deleteMelody(id: string) {
		return this.http.delete(`${BACKEND_URL}/${id}`);
	}

	getMelodiesUpdateListener() {
		return this.melodiesUpdated.asObservable();
	}

	getKeyByValue(object: { [x: string]: any; }, value: any) {
		return Object.keys(object).find(key => object[key] === value);
	}

	generateScaleIndexes(index: number, mode: string | number) {
		return this.scaleIndices[mode as keyof typeof this.scaleIndices].map((x: any) => x + index);
	}

	generateScale(indices: any[]) {
		let scale: any[] = [];
		let wholeRange = this.crossOrBKey();
		let replacementsFSharp = {
			"F3": "E#3",
			"F4": "E#4",
			"F5": "E#5"
		}
		let replacementsGFlat = {
			"B3": "Cb3",
			"B4": "Cb4",
			"B5": "Cb5"
		}
		indices.forEach((element: string | number) => {
			scale.push(wholeRange[element as keyof typeof wholeRange]);
		});
		if (this.rootKey === "F#") {
			scale = scale.map(item => {
				if (replacementsFSharp[item as keyof typeof replacementsFSharp]) return replacementsFSharp[item as keyof typeof replacementsFSharp];
				return item;
			});
		}
		if (this.rootKey === "Gb") {
			scale = scale.map(item => {
				if (replacementsGFlat[item as keyof typeof replacementsGFlat]) return replacementsGFlat[item as keyof typeof replacementsGFlat];
				return item;
			});
		}
		if (this.settings.scale === 'Harmonic Minor') {
			if (this.harmonicMinorModifications.hasOwnProperty(this.settings.key)) {
				scale = scale.map(item => {
					if (this.harmonicMinorModifications[this.settings.key][item]) return this.harmonicMinorModifications[this.settings.key][item];
					return item;
				});
			}
		}
		return scale;
	}

	crossOrBKey() {
		this.rootKey = this.modes.getRootkey(this.settings.key, this.settings.scale);
		this.settings.rootKey = this.rootKey;
		console.log("ROOTKEY", this.rootKey);
		if (this.rootKey.includes('b') || this.rootKey === 'F') return this.wholeRangeFlat;
		return this.wholeRangeSharp;
	}

	// INITIAL CALL FROM COMPONENT - Now calls backend for generation
	submitSettings(settings: Settings): Observable<any> {
		// Call backend to generate melody
		return this.http.post<{
			melody: any[];
			scale: any;
			settings: Settings;
			intervals: number[];
		}>(BACKEND_URL + '/generate', { settings }).pipe(
			tap((result: { melody: any[]; scale: any; settings: Settings; intervals: number[] }) => {
				// Store the generated melody and related data
				this.melody = result.melody;
				this.scale = result.scale;
				this.settings = result.settings;
				this.intervalCheck = result.intervals;
				this.rootKey = result.settings.rootKey;
				
				// Notify components of new melody
				this.getScoreData();
			})
		);
	}

	changeScaleIndices() {
		let scaleIndices = {
			major: [2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21],
			minor: [2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21],
			dorian: [2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21],
			phrygian: [2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20],
			lydian: [2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 19, 21],
			mixolydian: [2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21],
			locrian: [1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20],
			chromatic: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
			harmonicminor: [2, 3, 6, 7, 9, 10, 12, 14, 15, 18, 19, 21],
			melodicminor: [2, 4, 6, 7, 9, 10, 12, 14, 16, 18, 19, 21],
			wholetone: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
		}

		for (let key of Object.keys(scaleIndices)) {
			for (let i = 0; i < scaleIndices[key as keyof typeof scaleIndices].length; i++) {
				scaleIndices[key as keyof typeof scaleIndices][i] += 1;
			}
		}
		console.log(scaleIndices);
	}

	setSettings() {
		this.melodyIndex = -1;
		this.noteIndex = 0
		this.difference = 0
		this.bars = this.settings.bar;
		this.createNotes();
	}

	cloneObj(obj: any) {
		return JSON.parse(JSON.stringify(obj))
	}

	setTonicNote() {
		return this.scale[3];
	}

	checkTonic() {
		return this.melody.length === 0
	}

	checkForQuantil(scale: any[]) {
		let foundNoteIndex = scale.indexOf(this.melody[this.melodyIndex].note);
		let lowerIndex = foundNoteIndex - 4;
		if (lowerIndex < 0) lowerIndex = 0;
		let upperIndex = foundNoteIndex + 4;
		if (upperIndex > scale.length) upperIndex = scale.length -1;
		return scale.splice(lowerIndex, upperIndex)
	}

	notTripplet(scale: any[]) {
		if (this.melody.length >= 2) {
			if (this.melody[this.melodyIndex].note == this.melody[this.melodyIndex - 1].note) {
				let foundIndex = scale.indexOf(this.melody[this.melodyIndex].note);
				if (foundIndex > -1) {
					scale.splice(foundIndex, 1)
					return scale
				} else console.log("Something went wrong here");
			}
		}
		return scale;
	}

	noteAfterQuint(scale: any) {
		if (this.melody.length >= 2) {
			let firstNote = this.scale.indexOf(this.melody[this.melodyIndex -1].note);
			let secondNote = this.scale.indexOf(this.melody[this.melodyIndex].note);
			let difference = this.getDifference(firstNote, secondNote);
			if (difference === 4) {
				if (firstNote < secondNote) {
					let newScale = this.scale.slice(secondNote -1, secondNote);
					return newScale;
				}
				if (firstNote > secondNote) {
					let newScale = this.scale.slice(secondNote + 1, secondNote + 2);
					return newScale;
				}
			}
		}
		return scale;
	}

	setNote() {
		let searchScale = this.cloneObj(this.scale);
		let note = '';
		if (this.checkTonic()) note = this.setTonicNote();
		else {
			searchScale = this.checkForQuantil(searchScale);
			searchScale = this.notTripplet(searchScale);
			searchScale = this.noteAfterQuint(searchScale);
			note = this.getRandomNoteOfScale(searchScale);
		}
		return note;
	}

	setTime() {
		let timeIndex = this.randomNote(0, 2);
		let time = this.noteLength[timeIndex];
		return time;
	}

	calculcateLeftTimeAndPushToMelody(bar: number, time: string) {
		let timeLength = parseInt(time.charAt(0));
		bar -= 1 / timeLength;
		let moveOn = bar >= 0;
		if (bar >= 0) {

		} else if (bar < 0) {
			bar += 1 / timeLength;
		}
		return {
			bar: bar,
			moveOn: moveOn
		}
	}

	pushToMelody(time: string, note: string) {
		this.melody.push({
			note: note,
			time: time
		});
		this.melodyIndex = this.melody.length - 1;
	}

	createNotes() {
		let bar = 0;
		while (this.bars > 0) {
			if (this.settings.beat === "4/4") {
				bar = 1;
			}
			if (this.settings.beat === "3/4") {
				bar = 0.75;
			}
			while (bar > 0) {
				let time = this.setTime();
				let barCheck = this.calculcateLeftTimeAndPushToMelody(bar, time);
				bar = barCheck.bar;
				if (barCheck.moveOn == true) {
					let note = this.setNote();
					this.pushToMelody(time, note);
				}
			}
			this.bars -= 1;
		}
		this.checkEnding();
	}

	checkEnding() {
		let lastNote = '1m';
		if (this.settings.beat === '3/4') lastNote = '2n.';
		this.melody.push({ note: this.melody[0].note, time: lastNote })
		this.checkSum();
	}

	checkSum() {
		let sum = 0;
		this.melody.forEach(obj => {
			sum += 1 / parseFloat(obj.time.substr(0, 1))
		})
		this.setMelodyAndSettings();
	}

	createMelody() {
		this.setSettings();
	}

	getDifference(index1: number, index2: number) {
		return Math.abs(index1 - index2);
	}

	getIntervals() {
		for (let i = 1; i < this.melody.length - 1; i++) {
			let difference = this.getDifference(this.scale.indexOf(this.melody[i].note), this.scale.indexOf(this.melody[i-1].note))
			this.intervalCheck.push(difference);
	}
		return this.intervalCheck;
	}

	getMelody() {
		return this.melody;
	}

	/**
	 * Validates settings with backend before melody creation
	 */
	validateSettings(settings: Settings): Observable<{ valid: boolean; message?: string; errors?: string[] }> {
		return this.http.post<{ valid: boolean; message?: string; errors?: string[] }>(
			BACKEND_URL + '/validate-settings',
			{ settings }
		);
	}

	getSettings() {
		return this.settings;
	}

	getRandomNoteOfScale(scale: string | any[]) {
		let random = Math.floor(Math.random() * (scale.length -1));
		return scale[random];
	}

	randomNote(min: number, max: number) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	setMelodyAndSettings() {
		this.getScoreData();
	}

	setMelody(melody: any) {
		this.melody = melody.melody;
		this.settings = melody.settings;
		this.scale = melody.scale;
		this.getScoreData();
	}

	getScoreData() {
		this.scoreData.next({
			melody: this.melody,
			settings: this.settings,
			scale: this.scale
		});
	}

	playMelody() {
		this.initSampler();
		const now = Tone.now();
		let duration = 0;
		let bpm = 120;
		let tempo = (60 / bpm) * 4;

		Tone.loaded().then(() => {
			this.melody.forEach((tone, index) => {
				this.sampler.triggerAttackRelease(this.melody[index].note, this.melody[index].time, now + duration);
				duration += Tone.Time(this.melody[index].time).toSeconds();
				this.isPlaying.next(true);
			});


			let timeLeft = Math.round(duration * 10) / 10;
			let countdown = setInterval(() => {
				if (timeLeft <= 0) {
					clearInterval(countdown);
					this.isPlaying.next(false);
				}
				timeLeft -= 1;
			}, 1000);
		});
	}

	save() {
		this.addMelody(this.melody);
	}

	play(melody: any) {
		this.melody = melody;
		this.playMelody();
	}
}
