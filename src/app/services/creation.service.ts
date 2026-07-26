import { Injectable, OnDestroy, signal } from '@angular/core';
import * as Tone from 'tone';
import { Settings } from '../interfaces/settings';
import { 
	MelodyNote, 
	Scale, 
	MelodyData, 
	GenerateMelodyResponse, 
	FetchedMelody, 
	MelodiesResponse 
} from '../interfaces/melody-model';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

const BACKEND_URL = environment.apiUrl + "/melodies";
const DURATION_PRECISION_MULTIPLIER = 10;
const COUNTDOWN_INTERVAL_MS = 1000;

@Injectable({
  providedIn: 'root'
})
export class CreationService implements OnDestroy {
	settings!: Settings;
	scale!: Scale;
	melody!: MelodyNote[];
	intervalCheck: number[] = [];
	sampler!: Tone.Sampler;
	melodyCreatedWhileAuthenticated: boolean = false;

	// Initialize sampler using singleton pattern - only creates if not already exists
	initSampler() {
		if (!this.sampler) {
			this.sampler = new Tone.Sampler({
				urls: {
					"C4": "piano_c4.mp3"
				},
				release: 1,
				baseUrl: "../../assets/samples/",
			}).toDestination();
		}
	}

	private countdownInterval: NodeJS.Timeout | null = null;
	private readonly melodiesStateSignal = signal<{ melodies: FetchedMelody[]; melodiesCount: number }>({ melodies: [], melodiesCount: 0 });
	private readonly isPlayingSignalState = signal(false);
	private readonly scoreDataSignalState = signal<MelodyData | null>(null);

	fetchedMelodies: FetchedMelody[] = [];
	maxMelodies: number = 0;

	isPlaying = new Subject<boolean>();
	scoreData = new Subject<MelodyData>();

	readonly melodiesState = this.melodiesStateSignal.asReadonly();
	readonly isPlayingState = this.isPlayingSignalState.asReadonly();
	readonly scoreState = this.scoreDataSignalState.asReadonly();

	constructor(
		private http: HttpClient
	) { }

	addMelody(melody: MelodyNote[], consumeCredit: boolean = false): Observable<{message: string}> {
		const post = {
			melody: melody,
			settings: this.settings,
			consumeCredit: consumeCredit
		}
		return this.http.post<{message: string}>(BACKEND_URL, post);
	}

	getMelodies(melodiesPerPage: number, currentPage: number, sortByType: string, order: number): Observable<MelodiesResponse> {
		const queryParams = `?pagesize=${melodiesPerPage}&page=${currentPage}&sort_by_type=${sortByType}&order=${order}`;
		return this.http.get<MelodiesResponse>(BACKEND_URL + queryParams).pipe(
			tap((data) => {
				this.fetchedMelodies = data.melodies;
				this.maxMelodies = data.maxMelodies;
				this.melodiesStateSignal.set({ melodies: this.fetchedMelodies, melodiesCount: this.maxMelodies });
			}),
			catchError((error) => {
				console.error('Error fetching melodies:', error);
				this.fetchedMelodies = [];
				this.maxMelodies = 0;
				this.melodiesStateSignal.set({ melodies: [], melodiesCount: 0 });
				return throwError(() => error);
			})
		);
	}

	getMidiFile(id: string): Observable<HttpResponse<ArrayBuffer>> {
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

	updateMelodyName(id: string, name: string): Observable<{message: string}> {
		return this.http.patch<{message: string}>(`${BACKEND_URL}/${id}`, { name });
	}

	// INITIAL CALL FROM COMPONENT - Now calls backend for generation
	submitSettings(settings: Settings, isAuthenticated: boolean): Observable<GenerateMelodyResponse> {
		// Call backend to generate melody (backend handles authentication detection)
		return this.http.post<GenerateMelodyResponse>(BACKEND_URL + '/generate', { settings }).pipe(
			tap((result: GenerateMelodyResponse) => {
				// Store the generated melody and related data
				this.melody = result.melody;
				this.scale = result.scale;
				this.settings = result.settings;
				this.intervalCheck = result.intervals;
				this.melodyCreatedWhileAuthenticated = isAuthenticated;
				
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

	setMelody(melodyData: MelodyData) {
		this.melody = melodyData.melody;
		this.settings = melodyData.settings;
		this.scale = melodyData.scale;
		this.getScoreData();
	}

	getScoreData() {
		const currentScoreData = {
			melody: this.melody,
			settings: this.settings,
			scale: this.scale
		};
		this.scoreDataSignalState.set(currentScoreData);
		this.scoreData.next(currentScoreData);
	}

	private setPlayingState(isPlaying: boolean) {
		this.isPlayingSignalState.set(isPlaying);
		this.isPlaying.next(isPlaying);
	}

	playMelody() {
		try {
			this.initSampler();
			const now = Tone.now();
			let duration = 0;

			Tone.loaded()
				.then(() => {
					this.setPlayingState(true);
					this.melody.forEach((tone, index) => {
						this.sampler.triggerAttackRelease(this.melody[index].note, this.melody[index].time, now + duration);
						duration += Tone.Time(this.melody[index].time).toSeconds();
					});

				let timeLeft = Math.round(duration * DURATION_PRECISION_MULTIPLIER) / DURATION_PRECISION_MULTIPLIER;
				this.countdownInterval = setInterval(() => {
					if (timeLeft <= 0) {
						if (this.countdownInterval) {
							clearInterval(this.countdownInterval);
							this.countdownInterval = null;
						}
						this.setPlayingState(false);
					}
					timeLeft -= 1;
				}, COUNTDOWN_INTERVAL_MS);
				})
				.catch((error) => {
					console.error('Error loading audio samples:', error);
					this.setPlayingState(false);
				});
		} catch (error) {
			console.error('Error in playMelody:', error);
			this.setPlayingState(false);
		}
	}

	stop() {
		try {
			if (this.countdownInterval) {
				clearInterval(this.countdownInterval);
				this.countdownInterval = null;
			}
			
			if (this.sampler) {
				this.sampler.releaseAll();
			}
			
			this.setPlayingState(false);
		} catch (error) {
			console.error('Error stopping playback:', error);
			this.setPlayingState(false);
		}
	}

	save(consumeCredit: boolean = false): Observable<{message: string}> {
		return this.addMelody(this.melody, consumeCredit);
	}

	play(melody: MelodyNote[]) {
		this.melody = melody;
		this.playMelody();
	}

	resetMelody() {
		this.melody = [];
		this.scale = { notes: [] };
		this.intervalCheck = [];
		this.melodyCreatedWhileAuthenticated = false;
		this.scoreDataSignalState.set(null);
	}

	// Handle authentication state changes - should be called when user logs out to prevent stale authentication flag
	onAuthStateChange(isAuthenticated: boolean): void {
		if (!isAuthenticated && this.melodyCreatedWhileAuthenticated) {
			// User logged out, reset the flag to prevent unauthorized saves
			this.melodyCreatedWhileAuthenticated = false;
		}
	}

	ngOnDestroy(): void {
		try {
			// Complete all Subjects
			this.isPlaying.complete();
			this.scoreData.complete();

			// Clear any running intervals
			if (this.countdownInterval) {
				clearInterval(this.countdownInterval);
				this.countdownInterval = null;
			}

			// Dispose of audio resources
			if (this.sampler) {
				this.sampler.releaseAll();
				this.sampler.dispose();
			}
		} catch (error) {
			console.error('Error during cleanup:', error);
		}
	}
}
