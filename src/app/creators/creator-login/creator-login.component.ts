import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api-service';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-creator-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creator-login.component.html',
  styleUrls: ['./creator-login.component.scss']
})
export class CreatorLoginComponent {
  email = '';
  otp = '';
  otpSent = false;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  sendEmailOtp() {
    this.api.post('/auth/v2/send-otp', { useremail: this.email }).subscribe({
      next: () => { this.otpSent = true; },
      error: (e: any) => alert('Failed to send OTP')
    });
  }

  verifyEmailOtp() {
    this.api.post('/auth/v2/login?useremail='+this.email+"&otp="+this.otp,{}).subscribe({
      next: (res: any) => {
        if (res?.access_token) {
          this.auth.saveToken(res.access_token);
          this.auth.saveRefreshToken(res.refresh_token);
          this.auth.saveUuid(res.uuid);
          this.router.navigate(['/creator/dashboard']);
        }
      },
      error: (err: any) => alert('OTP verification failed')
    });
  }
}
