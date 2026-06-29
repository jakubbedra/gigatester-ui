import { Component, OnInit } from '@angular/core';
import { MetricsService, ProgressResponse, RankingEntryDto, DailyStatDto } from '../service/metrics.service';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-metrics',
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.css']
})
export class MetricsComponent implements OnInit {
  progress: ProgressResponse | null = null;
  ranking: RankingEntryDto[] = [];
  activeTab: 'progress' | 'ranking' = 'progress';

  constructor(
    private metricsService: MetricsService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.metricsService.getProgress().subscribe(p => this.progress = p);
    this.metricsService.getRanking().subscribe(r => this.ranking = r);
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

  get chartDays(): DailyStatDto[] {
    if (!this.progress) return [];
    return this.progress.dailyStats.slice(-30);
  }

  get chartMax(): number {
    const max = Math.max(...this.chartDays.map(d => d.testsTaken), 1);
    return max;
  }

  barHeight(value: number): number {
    return Math.round((value / this.chartMax) * 120);
  }

  myRank(): number {
    const entry = this.ranking.find(r => r.username === this.currentUsername);
    return entry?.rank ?? 0;
  }
}
