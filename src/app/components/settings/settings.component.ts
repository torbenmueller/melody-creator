import { Component, ElementRef, HostListener } from '@angular/core';
import { Settings } from '../../interfaces/settings';
import { Subscription } from 'rxjs';
import { CreationService } from '../../services/creation.service';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { ScoreComponent } from '../score/score.component';
import * as Tone from 'tone';
import { SettingComponent } from "../shared/setting/setting.component";
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, ScoreComponent, SettingComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  allScales: string[] = [
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
  restrictedScales: string[] = ['Major', 'Minor'];
  
  scales: string[] = this.allScales;
  
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
  
  allBars: number[] = [2, 4, 8];
  restrictedBars: number[] = [2, 4];
  bars: number[] = this.allBars;
  
  allComplexity: string[] = ['Low', 'Medium', 'High'];
  restrictedComplexity: string[] = ['Low'];
  complexity: string[] = this.allComplexity;
  
  allBeats: string[] = ['4/4', '3/4'];
  restrictedBeats: string[] = ['4/4'];
  beats: string[] = this.allBeats;
  
  userPlan: string | null = null;
  hasRestrictions: boolean = false;

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
    private userService: UserService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe((isAuthenticated) => {
        this.userIsAuthenticated = isAuthenticated;
        this.isLoading = false;
        this.loadUserPlanAndApplyRestrictions();
      });
    this.creationService.isPlaying.subscribe((e) => {
      this.isPlaying = e;
    });
    this.settings = this.creationService.getSettings();
    this.melody = this.creationService.getMelody();
    if (this.settings === undefined) this.settings = this.initialSettings();
    this.melodyDescription = this.setDescription(this.settings);
    
    // Load user plan on init
    this.loadUserPlanAndApplyRestrictions();
  }
  
  private loadUserPlanAndApplyRestrictions(): void {
    this.userService.getUserPlan().subscribe({
      next: (response: { isAuthenticated: boolean; plan: string | null; hasRestrictions: boolean }) => {
        this.userPlan = response.plan;
        this.hasRestrictions = response.hasRestrictions;
        this.applyRestrictions();
      },
      error: (error: any) => {
        console.error('Failed to fetch user plan', error);
        // Default to restrictions if error
        this.hasRestrictions = true;
        this.applyRestrictions();
      }
    });
  }
  
  private applyRestrictions(): void {
    if (this.hasRestrictions) {
      // Apply restrictions for unauthenticated and free users
      this.scales = this.restrictedScales;
      this.bars = this.restrictedBars;
      this.complexity = this.restrictedComplexity;
      this.beats = this.restrictedBeats;
      
      // Reset settings if current values are not allowed
      if (!this.restrictedScales.includes(this.settings.scale)) {
        this.settings.scale = this.restrictedScales[0];
      }
      if (!this.restrictedBars.includes(this.settings.bar)) {
        this.settings.bar = this.restrictedBars[0];
      }
      if (!this.restrictedComplexity.includes(this.settings.complex)) {
        this.settings.complex = this.restrictedComplexity[0];
      }
      if (!this.restrictedBeats.includes(this.settings.beat)) {
        this.settings.beat = this.restrictedBeats[0];
      }
    } else {
      // No restrictions - pro/enterprise users
      this.scales = this.allScales;
      this.bars = this.allBars;
      this.complexity = this.allComplexity;
      this.beats = this.allBeats;
    }
  }

  ngOnDestroy(): void {
    this.authListenerSubs?.unsubscribe();
  }

  onSubmit() {
    this.isLoading = true;
    
    // First, validate settings in backend
    this.creationService.validateSettings(this.settings).subscribe({
      next: (validationResponse: { valid: boolean; message?: string; errors?: string[] }) => {
        if (!validationResponse.valid) {
          // Settings are invalid for user's plan
          this.isLoading = false;
          const errorMsg = validationResponse.errors?.join(', ') || validationResponse.message || 'Invalid settings';
          this.toastr.error(errorMsg);
          return;
        }
        
        // Settings are valid, proceed with credit check and melody creation
        if (!this.userIsAuthenticated) {
          // For unauthenticated users, proceed without credit checks
          this.createMelody();
          return;
        }

        // Check if user has enough credits before creating melody
        this.userService.checkCreditsAvailable(1).subscribe({
          next: (response: { hasEnoughCredits: boolean; plan?: string; creditsAvailable?: number; creditsRequired?: number; message?: string }) => {
            if (response.hasEnoughCredits) {
              // User has enough credits, proceed with melody creation
              this.createMelody();
              
              // Consume credit after successful creation
              this.userService.consumeCredits(1).subscribe({
                next: (consumeResponse) => {
                  console.log('Credit consumed successfully', consumeResponse);
                },
                error: (error) => {
                  console.error('Failed to consume credit', error);
                }
              });
            } else {
              // Insufficient credits
              this.isLoading = false;
              this.toastr.error(`Cannot create melody: ${response.message || 'Insufficient credits'}`);
            }
          },
          error: (error: any) => {
            this.isLoading = false;
            console.error('Failed to check credits', error);
            this.toastr.error('Error checking credits. Please try again.');
          }
        });
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Failed to validate settings', error);
        this.toastr.error('Error validating settings. Please try again.');
      }
    });
  }

  private createMelody() {
    this.creationService.submitSettings(this.settings);
    this.melody = this.creationService.getMelody();
    this.intervals = this.creationService.getIntervals();
    this.isLoading = false;
    this.melodyDescription = this.setDescription(this.settings);
  }

  async play(): Promise<void> {
    await Tone.start();
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
