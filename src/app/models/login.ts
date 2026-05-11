export interface NxResult<T> {
  nx_result: boolean;
  status: boolean;
  code: number;
  info: boolean;
  warning: boolean;
  error: boolean;
  message: string;
  error_msg: string;
  data: T;
}

export interface MasterLoginPayload {
  login: string;
  password: string;
}

export interface MasterUser {
  id: number;
  name: string;
  login: string;
  email: string;
  role: string;
}

export interface MasterLoginData {
  token: string;
  user: MasterUser;
}

export interface StoredSession {
  token: string;
  user: MasterUser;
}
