import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarService, CalendarJoinPreviewResponse } from '../../service/calendar.service';

@Component({
  selector: 'app-join-group',
  templateUrl: './join-group.component.html',
  styleUrls: ['./join-group.component.css']
})
export class JoinGroupComponent implements OnInit {

  loading = true;
  joining = false;
  joined = false;
  error = false;
  preview: CalendarJoinPreviewResponse | null = null;
  private token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private calendarService: CalendarService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.loading = false;
      this.error = true;
      return;
    }
    this.calendarService.previewJoin(this.token).subscribe({
      next: preview => {
        this.preview = preview;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  join() {
    if (this.joining || !this.token) return;
    this.joining = true;
    this.calendarService.joinByToken(this.token).subscribe({
      next: () => {
        this.joining = false;
        this.joined = true;
      },
      error: () => {
        this.joining = false;
        this.error = true;
      }
    });
  }

  goToCalendar() {
    this.router.navigate(['/calendar']);
  }
}
