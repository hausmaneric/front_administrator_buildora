import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { LoginService } from '../../../services/login.service';

type MenuItem = {
  id: string;
  name: string;
  iconKey: string;
  route: string;
};

type MenuSection = {
  id: string;
  name: string;
  items: MenuItem[];
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  userName = 'Administrador';
  currentRoute = '';

  dashboardItem: MenuItem = {
    id: 'dashboard',
    name: 'Dashboard',
    iconKey: 'home',
    route: '/main/dashboard'
  };

  sections: MenuSection[] = [
    {
      id: 'gestao',
      name: 'GESTAO',
      items: [
        { id: 'accounts', name: 'Empresas / Contas', iconKey: 'briefcase', route: '/main/accounts' },
        { id: 'plans', name: 'Planos', iconKey: 'wallet', route: '/main/plans' },
        { id: 'modules', name: 'Modulos', iconKey: 'grid', route: '/main/modules' },
        { id: 'account-modules', name: 'Modulos por Conta', iconKey: 'link', route: '/main/account-modules' },
        { id: 'subscriptions', name: 'Assinaturas', iconKey: 'receipt', route: '/main/subscriptions' },
        { id: 'storage', name: 'Armazenamento', iconKey: 'cloud', route: '/main/storage' },
        { id: 'master-users', name: 'Usuarios Master', iconKey: 'users', route: '/main/master-users' },
        { id: 'tenant-bootstrap', name: 'Onboarding Tenant', iconKey: 'rocket', route: '/main/tenant-bootstrap' }
      ]
    },
    {
      id: 'support',
      name: 'SUPORTE E CONTROLE',
      items: [
        { id: 'logs', name: 'Logs', iconKey: 'log', route: '/main/logs' },
        { id: 'auditing', name: 'Auditoria', iconKey: 'shield', route: '/main/auditing' },
        { id: 'backup', name: 'Backup', iconKey: 'database', route: '/main/backup' },
        { id: 'support-center', name: 'Suporte', iconKey: 'message', route: '/main/support-center' }
      ]
    },
    {
      id: 'reports',
      name: 'RELATORIOS',
      items: [
        { id: 'metrics', name: 'Metricas', iconKey: 'chart', route: '/main/metrics' },
        { id: 'financial', name: 'Financeiro', iconKey: 'coin', route: '/main/financial' }
      ]
    },
    {
      id: 'settings',
      name: 'CONFIGURACOES',
      items: [
        { id: 'settings-page', name: 'Configuracoes', iconKey: 'settings', route: '/main/settings-page' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentRoute = this.router.url;
      });
  }

  ngOnInit(): void {
    this.userName = this.loginService.getLocalToken()?.user?.name ?? 'Administrador';
    this.currentRoute = this.router.url;
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  navigate(route: string): void {
    if (this.currentRoute === route) {
      return;
    }
    this.currentRoute = route;
    void this.router.navigate([route]);
  }

  logout(): void {
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }
}
