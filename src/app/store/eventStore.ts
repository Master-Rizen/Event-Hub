import { create } from 'zustand';
import { Event, EventWithStats } from '../../types/event.types';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer, doc, getDoc } from 'firebase/firestore';

interface EventState {
  events: EventWithStats[];
  loading: boolean;
  upcomingEvents: EventWithStats[];
  userRSVPs: EventWithStats[];
  fetchEvents: () => Promise<void>;
  fetchUpcomingEvents: () => Promise<void>;
  fetchUserRSVPs: (userId: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  upcomingEvents: [],
  userRSVPs: [],
  loading: false,
  fetchEvents: async () => {
    set({ loading: true });
    try {
      const q = query(
        collection(db, 'events'), 
        orderBy('startTime', 'asc'), 
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const fetchedEvents: EventWithStats[] = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Filter: only show published events, OR pending events owned by the current user
          const currentUser = auth.currentUser;
          const isOwner = currentUser && data.organizerId === currentUser.uid;
          
          if (data.status && data.status !== 'published' && !isOwner) return null;
          const rsvpQuery = query(collection(db, 'rsvps'), where('eventId', '==', docSnap.id));
          const countSnap = await getCountFromServer(rsvpQuery);
          
          // Normalize dates (handle both strings and Timestamps)
          const startTime = typeof data.startTime === 'string' 
            ? data.startTime 
            : (data.startTime?.toDate?.() ? data.startTime.toDate().toISOString() : new Date().toISOString());
          const endTime = typeof data.endTime === 'string' 
            ? data.endTime 
            : (data.endTime?.toDate?.() ? data.endTime.toDate().toISOString() : new Date().toISOString());

          return { 
            id: docSnap.id, 
            ...data,
            startTime,
            endTime,
            rsvpCount: countSnap.data().count, 
            checkInCount: 0 
          } as EventWithStats;
        })
      );
      
      const validEvents = fetchedEvents.filter((e): e is EventWithStats => e !== null);
      set({ events: validEvents, loading: false });
    } catch (error) {
      console.error("Error fetching events:", error);
      set({ loading: false });
    }
  },
  fetchUpcomingEvents: async () => {
    set({ loading: true });
    try {
      // Fetch more events and filter in memory to be more robust 
      // and handle legacy data / time overlaps better.
      const q = query(
        collection(db, 'events'), 
        orderBy('startTime', 'asc'),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const fetchedEvents: EventWithStats[] = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          // Filter: only show published events, OR pending events owned by the current user
          const currentUser = auth.currentUser;
          const isOwner = currentUser && data.organizerId === currentUser.uid;

          if (data.status && data.status !== 'published' && !isOwner) return null;
          
          // Legacy events with no status are treated as published
          
          // Basic time filtering: Only show events that haven't started yet
          const now = new Date();
          const nowIso = now.toISOString();
          
          // Normalize dates (handle both strings and Timestamps)
          const startTime = typeof data.startTime === 'string' 
            ? data.startTime 
            : (data.startTime?.toDate?.() ? data.startTime.toDate().toISOString() : new Date().toISOString());
          const endTime = typeof data.endTime === 'string' 
            ? data.endTime 
            : (data.endTime?.toDate?.() ? data.endTime.toDate().toISOString() : new Date().toISOString());

          // Filter out events that have already started for the general public
          if (startTime < nowIso && !isOwner) return null;

          // Filter out cancelled or rejected events from the general view 
          // (Owners can see them in their dashboard, but not in general "Upcoming" list)
          if (data.isCancelled || data.status === 'rejected') return null;

          const rsvpQuery = query(collection(db, 'rsvps'), where('eventId', '==', docSnap.id));
          const countSnap = await getCountFromServer(rsvpQuery);
          
          return { 
            id: docSnap.id, 
            ...data,
            startTime,
            endTime,
            rsvpCount: countSnap.data().count, 
            checkInCount: 0 
          } as EventWithStats;
        })
      );
      
      const validEvents = fetchedEvents.filter((e): e is EventWithStats => e !== null);
      set({ upcomingEvents: validEvents, loading: false });
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      set({ loading: false });
    }
  },
  fetchUserRSVPs: async (userId: string) => {
    set({ loading: true });
    try {
      const rsvpQuery = query(collection(db, 'rsvps'), where('userId', '==', userId));
      const rsvpSnapshot = await getDocs(rsvpQuery);
      
      const eventIds = rsvpSnapshot.docs.map(doc => doc.data().eventId);
      
      if (eventIds.length === 0) {
        set({ userRSVPs: [], loading: false });
        return;
      }

      // Firestore 'in' query supports up to 10 items. For simplicity and scalability,
      // we'll fetch them individually or in chunks if needed, but let's fetch them
      // individually for now since typically a user won't have hundreds of active RSVPs.
      const fetchedEvents: EventWithStats[] = await Promise.all(
        eventIds.map(async (eventId) => {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (!eventDoc.exists()) return null;
          
          const data = eventDoc.data();
          const rsvpCountQuery = query(collection(db, 'rsvps'), where('eventId', '==', eventId));
          const countSnap = await getCountFromServer(rsvpCountQuery);
          
          const startTime = typeof data.startTime === 'string' 
            ? data.startTime 
            : (data.startTime?.toDate?.() ? data.startTime.toDate().toISOString() : new Date().toISOString());
          const endTime = typeof data.endTime === 'string' 
            ? data.endTime 
            : (data.endTime?.toDate?.() ? data.endTime.toDate().toISOString() : new Date().toISOString());

          return { 
            id: eventDoc.id, 
            ...data,
            startTime,
            endTime,
            rsvpCount: countSnap.data().count, 
            checkInCount: 0 
          } as EventWithStats;
        })
      );

      const validEvents = fetchedEvents.filter((e): e is EventWithStats => e !== null);
      set({ userRSVPs: validEvents, loading: false });
    } catch (error) {
      console.error("Error fetching user RSVPs:", error);
      set({ loading: false });
    }
  }
}));
