import { Component, OnInit } from '@angular/core';
import { FeatureFlag, FeatureFlagService } from '../../service/feature-flag.service';

@Component({
  selector: 'app-feature-flags',
  templateUrl: './feature-flags.component.html',
  styleUrls: ['./feature-flags.component.css']
})
export class FeatureFlagsComponent implements OnInit {

  flags: FeatureFlag[] = [];
  loading = true;
  busyKey: string | null = null;
  error = false;

  constructor(private featureFlags: FeatureFlagService) {}

  ngOnInit() {
    this.featureFlags.load().subscribe(flags => {
      this.flags = flags;
      this.loading = false;
    });
  }

  toggle(flag: FeatureFlag) {
    if (this.busyKey) return;
    this.busyKey = flag.key;
    this.error = false;
    this.featureFlags.set(flag.key, !flag.enabled).subscribe({
      next: updated => {
        this.flags = this.flags.map(f => f.key === updated.key ? updated : f);
        this.busyKey = null;
      },
      error: () => { this.error = true; this.busyKey = null; }
    });
  }
}
