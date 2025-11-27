import { Injectable } from '@angular/core';
import * as Tone from 'tone';
import { Settings } from '../interfaces/settings';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
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

	private melodiesUpdated = new Subject<{melodies: any, melodiesCount: number}>();

	fetchedMelodies: any = [];
	maxMelodies: number = 0;
	rootKey: string = '';

	isPlaying = new Subject<boolean>();
	scoreData = new Subject<any>();

	constructor(
		private http: HttpClient,
		private toastr: ToastrService
	) { }

	addMelody(melody: object, consumeCredit: boolean = false): Observable<{message: string}> {
		const post: object = {
			melody: melody,
			settings: this.settings,
			consumeCredit: consumeCredit
		}
		return this.http.post<{message: string}>(BACKEND_URL, post);
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

	// INITIAL CALL FROM COMPONENT - Now calls backend for generation
	submitSettings(settings: Settings): Observable<any> {
		// Call backend to generate melody (backend handles authentication detection)
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

	getMelody() {
		return this.melody;
	}

	getSettings() {
		return this.settings;
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

	save(consumeCredit: boolean = false): Observable<{message: string}> {
		return this.addMelody(this.melody, consumeCredit);
	}

	play(melody: any) {
		this.melody = melody;
		this.playMelody();
	}

	/**
	 * Reset melody to prevent unauthorized saves
	 */
	resetMelody() {
		this.melody = [];
		this.scale = null;
		this.intervalCheck = [];
		this.rootKey = '';
	}
}
