export interface AdminAccount {
  id: number;
  code: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  status: number;
  plan_id: number;
  storage_limit_mb: number;
  storage_used_mb: number;
  expiration_date: string;
  active: boolean;
}

export interface AdminPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  max_companies: number;
  max_users: number;
  max_works: number;
  max_storage_mb: number;
  active: boolean;
}

export interface AdminModule {
  id: number;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface AdminMasterUser {
  id: number;
  name: string;
  login: string;
  email: string;
  role: string;
  active?: boolean;
}

export interface AdminAccountModule {
  id: number;
  account_id: number;
  account_name?: string;
  module_id?: number;
  module_code?: string;
  module_name?: string;
  active: boolean;
}

export interface AdminPagedResponse<T> {
  items: T[];
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    total: number;
    has_next: boolean;
  };
  filters?: {
    search: string;
    sort_field: string;
    sort_direction: string;
  };
}
