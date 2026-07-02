import { Component, OnInit } from '@angular/core';
import { MetricsService, ProgressResponse, RankingEntryDto, DailyStatDto, TagAccuracyDto, TestSummaryForMetricsDto } from '../service/metrics.service';
import { AuthService } from '../service/auth.service';

interface LinePoint { x: number; y: number; label: string; value: number; }

@Component({
  selector: 'app-metrics',
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.css']
})
export class MetricsComponent implements OnInit {
  progress: ProgressResponse | null = null;
  ranking: RankingEntryDto[] = [];
  activeTab: 'progress' | 'ranking' = 'progress';

  selectedTestId: string = '';
  rankingSortBy: string = 'accuracy';

  constructor(
    private metricsService: MetricsService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProgress();
    this.loadRanking();
  }

  loadProgress() {
    this.metricsService.getProgress(this.selectedTestId || undefined).subscribe(p => this.progress = p);
  }

  loadRanking() {
    this.metricsService.getRanking(this.selectedTestId || undefined, this.rankingSortBy).subscribe(r => this.ranking = r);
  }

  onTestFilterChange() {
    this.loadProgress();
    this.loadRanking();
  }

  onSortChange(sortBy: string) {
    this.rankingSortBy = sortBy;
    this.loadRanking();
  }

  get currentUsername(): string {
    return this.authService.getUser()?.username ?? '';
  }

  get passRate(): number {
    if (!this.progress || this.progress.totalTestsTaken === 0) return 0;
    return Math.round(this.progress.totalTestsPassed / this.progress.totalTestsTaken * 100);
  }

  get accuracy(): number {
    if (!this.progress || this.progress.totalQuestionsAnswered === 0) return 0;
    return Math.round(this.progress.totalQuestionsCorrect / this.progress.totalQuestionsAnswered * 100);
  }

  get myTests(): TestSummaryForMetricsDto[] {
    return this.progress?.myTests ?? [];
  }

  get tagStats(): TagAccuracyDto[] {
    return this.progress?.tagStats ?? [];
  }

  get chartDays(): DailyStatDto[] {
    if (!this.progress) return [];
    return this.progress.dailyStats.slice(-30);
  }

  // SVG line chart — 600×120 viewBox
  readonly SVG_W = 600;
  readonly SVG_H = 120;
  readonly PAD_L = 8;
  readonly PAD_R = 8;
  readonly PAD_T = 10;
  readonly PAD_B = 20;

  private chartX(i: number, total: number): number {
    const usable = this.SVG_W - this.PAD_L - this.PAD_R;
    return total <= 1 ? this.PAD_L + usable / 2 : this.PAD_L + (i / (total - 1)) * usable;
  }

  private chartY(value: number, max: number): number {
    const usable = this.SVG_H - this.PAD_T - this.PAD_B;
    const ratio = max > 0 ? value / max : 0;
    return this.PAD_T + usable * (1 - ratio);
  }

  get chartPoints(): { taken: LinePoint[]; passed: LinePoint[] } {
    const days = this.chartDays;
    if (!days.length) return { taken: [], passed: [] };
    const max = Math.max(...days.map(d => d.testsTaken), 1);
    const taken: LinePoint[] = days.map((d, i) => ({
      x: this.chartX(i, days.length),
      y: this.chartY(d.testsTaken, max),
      label: d.date.slice(5),
      value: d.testsTaken
    }));
    const passed: LinePoint[] = days.map((d, i) => ({
      x: this.chartX(i, days.length),
      y: this.chartY(d.testsPassed, max),
      label: d.date.slice(5),
      value: d.testsPassed
    }));
    return { taken, passed };
  }

  polyline(points: LinePoint[]): string {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  xLabels(): { x: number; label: string }[] {
    const days = this.chartDays;
    if (!days.length) return [];
    // show up to 6 labels evenly spaced
    const step = Math.max(1, Math.floor(days.length / 6));
    return days
      .filter((_, i) => i % step === 0 || i === days.length - 1)
      .map((d, _, arr) => {
        const origIdx = days.indexOf(d);
        return { x: this.chartX(origIdx, days.length), label: d.date.slice(5) };
      });
  }

  myRank(): number {
    const entry = this.ranking.find(r => r.username === this.currentUsername);
    return entry?.rank ?? 0;
  }
}
