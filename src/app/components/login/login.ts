import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DialogComponent, DialogModule } from '@syncfusion/ej2-angular-popups';
import { finalize } from 'rxjs';
import { MasterLoginPayload } from '../../models/login';
import { AdminDataService } from '../../services/admin-data.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule, ButtonModule, DialogModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  @ViewChild('errorDialog') errorDialog!: DialogComponent;

  loginForm: FormGroup;
  dialogMessage = '';
  showPassword = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      login: ['admin', [Validators.required]],
      password: ['123456', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.loginService.isAuthenticated()) {
      void this.router.navigate(['/main/dashboard']);
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.loginForm.getRawValue() as MasterLoginPayload;

    this.loginService
      .masterLogin(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.adminDataService.clearCache();
            this.loginService.saveLocalToken({
              token: response.data.token,
              user: response.data.user
            });
            void this.router.navigate(['/main/dashboard']);
            return;
          }

          this.showError(response.message || 'Falha ao autenticar na plataforma.');
        },
        error: (error) => {
          const message = error?.error?.message || 'Não foi possível autenticar na API do Obrax.';
          this.showError(message);
        }
      });
  }

  showError(message: string): void {
    this.dialogMessage = message;
    this.errorDialog.show();
  }

  closeDialog(): void {
    this.errorDialog.hide();
  }
}
