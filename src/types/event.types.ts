export type EventLocationType = 'indoor' | 'outdoor';

export type EventStatus = 'pending' | 'published' | 'rejected';

export interface Event {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  location: string;
  locationType: EventLocationType;
  startTime: string;
  endTime: string;
  capacity: number | null;
  isCancelled: boolean;
  status: EventStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  imageUrl?: string;
  weatherSuggestion?: string;
  qrSecret: string;
  createdAt: string;
  updatedAt: string;
}

export interface RSVP {
  id: string;
  userId: string;
  eventId: string;
  status: 'going' | 'waitlist';
  createdAt: string;
}

export interface Attendance {
  id: string;
  rsvpId: string;
  checkedInAt: string;
  checkInMethod: 'qr' | 'manual';
}

export interface EventWithStats extends Event {
  rsvpCount: number;
  checkInCount: number;
  isUserRSVPed?: boolean;
  currentUserRSVPStatus?: 'going' | 'waitlist';
}
