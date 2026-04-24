export interface User {
  id: string;
  email: string;
  fullName: string | null;
  universityDomain: string;
  createdAt: string;
  lastLogin: string | null;
}

export interface UserProfile extends User {
  role: 'student' | 'club' | 'admin' | 'attendee' | 'organizer';
}
