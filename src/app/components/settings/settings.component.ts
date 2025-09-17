import { Component, ElementRef, HostListener } from '@angular/core';
import { Settings } from '../../interfaces/settings';
import { Subscription } from 'rxjs';
import { CreationService } from '../../services/creation.service';
import { AuthService } from '../../auth/auth.service';
import { FormsModule } from '@angular/forms';
import { ScoreComponent } from '../score/score.component';
import { DropdownComponent } from '../shared/dropdown/dropdown.component';
import * as Tone from 'tone';
import { SettingComponent } from "../shared/setting/setting.component";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, ScoreComponent, DropdownComponent, SettingComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  scales: string[] = [
    'Major',
    'Minor',
    'Pentatonic Major',
    'Pentatonic Minor',
    'Dorian',
    'Phrygian',
    'Lydian',
    'Mixolydian',
    'Locrian',
    'Chromatic',
    'Harmonic Minor',
    'Melodic Minor',
    'Whole Tone',
  ];
  keys: string[] = [
    'C',
    'Db',
    'D',
    'Eb',
    'E',
    'F',
    'F#',
    'Gb',
    'G',
    'Ab',
    'A',
    'Bb',
    'B',
  ];
  bars: number[] = [2, 4, 8];
  complexity: string[] = ['Low', 'Medium', 'High'];
  beats: string[] = ['4/4', '3/4'];

  settings!: Settings;
  melody!: any[];
  intervals!: any[];
  melodyDescription: string = '';

  isLoading: boolean = false;
  userIsAuthenticated: boolean = false;
  isPlaying: boolean = false;


  private authListenerSubs!: Subscription;
  Scale: any;

  constructor(
    public creationService: CreationService,
    private authService: AuthService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe((isAuthenticated) => {
        this.userIsAuthenticated = isAuthenticated;
        this.isLoading = false;
      });
    this.creationService.isPlaying.subscribe((e) => {
      this.isPlaying = e;
    });
    this.settings = this.creationService.getSettings();
    this.melody = this.creationService.getMelody();
    if (this.settings === undefined) this.settings = this.initialSettings();
    this.melodyDescription = this.setDescription(this.settings);
  }

  ngOnDestroy(): void {
    this.authListenerSubs.unsubscribe();
  }

  onSubmit() {
    this.isLoading = true;
    this.creationService.submitSettings(this.settings);
    this.melody = this.creationService.getMelody();
    this.intervals = this.creationService.getIntervals();
    console.log(this.intervals);
    this.isLoading = false;
    this.melodyDescription = this.setDescription(this.settings);
  }

  async play(): Promise<void> {
    await Tone.start();
    console.log('audio is ready');
    this.creationService.playMelody();
  }

  save() {
    this.creationService.save();
  }

  initialSettings() {
    const initlialSetting = {
      scale: this.scales[0],
      key: this.keys[0],
      bar: this.bars[0],
      complex: this.complexity[0],
      beat: this.beats[0],
      name: 'Melody',
      rootKey: this.keys[0],
    };
    return initlialSetting;
  }

  setDescription(settings: Settings) {
    const scale = settings.scale.toLowerCase();
    const complex = settings.complex.toLowerCase();
    const description = `Your melody is in ${settings.key} ${scale}, has ${settings.bar} bars, a ${complex} complexity and a
		${settings.beat} beat.`;
    return description;
  }

  onScaleChange(scale: string): void {
    this.settings.scale = scale;
  }

  onKeyChange(key: string): void {
    this.settings.key = key;
  }

  onBarChange(bar: string): void {
    this.settings.bar = Number(bar);
  }

  onComplexityChange(complex: string): void {
    this.settings.complex = complex;
  }

  onBeatChange(beat: string): void {
    this.settings.beat = beat;
  }
}
