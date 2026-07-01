import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService, UserResponse } from '../service/account.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  user: UserResponse | null = null;
  loading = true;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) { this.notFound = true; this.loading = false; return; }
      this.accountService.getUserById(id).subscribe({
        next: (u) => { this.user = u; this.loading = false; },
        error: () => { this.notFound = true; this.loading = false; }
      });
    });
  }

  get displayName(): string {
    return this.user?.username === 'admin' ? 'Janusz Pawlacz' : (this.user?.username ?? '');
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
