export interface UserProfile {
  _id: string;
  openid: string;
  nickname: string;
  avatar: string;
  phone?: string;
  town?: string;
  created_at: string;
}

export interface UserState {
  profile: UserProfile | null;
  token: string | null;
  isLoggedIn: boolean;
}
