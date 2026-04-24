import { create } from 'zustand';
import { UserProfile } from '../../types/user.types';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  needsRole: boolean;
  setUser: (user: UserProfile | null) => void;
  initialize: () => void;
  createProfile: (role: 'student' | 'club' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  needsRole: false,
  setUser: (user) => set({ user, loading: false }),
  initialize: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            set({ 
              user: userDoc.data() as UserProfile, 
              loading: false, 
              initialized: true,
              needsRole: false 
            });
          } else {
            // New user - stay in initialized state but flag that role is needed
            set({ 
              user: null, 
              loading: false, 
              initialized: true, 
              needsRole: true 
            });
          }
        } else {
          set({ user: null, loading: false, initialized: true, needsRole: false });
        }
      } catch (error) {
        console.error("AuthStore: Initialization failed", error);
        set({ user: null, loading: false, initialized: true, needsRole: false });
      }
    });
  },
  createProfile: async (role) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("No authenticated user");

    // Auto-promote developer email to admin for testing purposes
    const finalRole = firebaseUser.email === 'b1a9b7u8@gmail.com' ? 'admin' : role;

    const newUser: UserProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      fullName: firebaseUser.displayName,
      universityDomain: firebaseUser.email?.split('@')[1] || '',
      role: finalRole,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    set({ user: newUser, needsRole: false });
  },
  logout: async () => {
    await signOut(auth);
    set({ user: null });
  },
}));
