import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NodeClickEventArgs, TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [TreeViewModule, CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  userName = 'Administrador';

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {}

  public hierarchicalData: any[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      iconKey: 'home',
      route: '/main/dashboard'
    },
    {
      id: 'gestao',
      name: 'GESTÃO',
      expanded: true,
      category: true,
      subChild: [
        { id: 'accounts', name: 'Empresas / Contas', iconKey: 'briefcase', route: '/main/accounts' },
        { id: 'plans', name: 'Planos', iconKey: 'wallet', route: '/main/plans' },
        { id: 'modules', name: 'Módulos', iconKey: 'grid', route: '/main/modules' },
        { id: 'account-modules', name: 'Módulos por Conta', iconKey: 'link', route: '/main/account-modules' },
        { id: 'subscriptions', name: 'Assinaturas', iconKey: 'receipt', route: '/main/subscriptions' },
        { id: 'storage', name: 'Armazenamento', iconKey: 'cloud', route: '/main/storage' },
        { id: 'master-users', name: 'Usuários Master', iconKey: 'users', route: '/main/master-users' },
        { id: 'tenant-bootstrap', name: 'Onboarding Tenant', iconKey: 'rocket', route: '/main/tenant-bootstrap' }
      ]
    },
    {
      id: 'support',
      name: 'SUPORTE E CONTROLE',
      expanded: true,
      category: true,
      subChild: [
        { id: 'logs', name: 'Logs', iconKey: 'log', route: '/main/logs' },
        { id: 'auditing', name: 'Auditoria', iconKey: 'shield', route: '/main/auditing' },
        { id: 'backup', name: 'Backup', iconKey: 'database', route: '/main/backup' },
        { id: 'support-center', name: 'Suporte', iconKey: 'message', route: '/main/support-center' }
      ]
    },
    {
      id: 'reports',
      name: 'RELATÓRIOS',
      expanded: true,
      category: true,
      subChild: [
        { id: 'metrics', name: 'Métricas', iconKey: 'chart', route: '/main/metrics' },
        { id: 'financial', name: 'Financeiro', iconKey: 'coin', route: '/main/financial' }
      ]
    },
    {
      id: 'settings',
      name: 'CONFIGURAÇÕES',
      expanded: true,
      category: true,
      subChild: [{ id: 'settings-page', name: 'Configurações', iconKey: 'settings', route: '/main/settings-page' }]
    }
  ];

  public field: object = {
    dataSource: this.hierarchicalData,
    id: 'id',
    text: 'name',
    child: 'subChild'
  };

  ngOnInit(): void {
    this.userName = this.loginService.getLocalToken()?.user?.name ?? 'Administrador';
  }

  public nodeClicked(args: NodeClickEventArgs): void {
    const id = args.node.getAttribute('data-uid');
    if (!id) {
      return;
    }

    const item = this.findNode(this.hierarchicalData, id);
    if (!item || item.category || !item.route) {
      return;
    }

    this.router.navigate([item.route]);
  }

  logout(): void {
    this.loginService.clearToken();
    this.router.navigate(['/login']);
  }

  private findNode(data: any[], id: string): any {
    for (const item of data) {
      if (item.id === id) {
        return item;
      }

      if (item.subChild) {
        const found = this.findNode(item.subChild, id);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }
}
