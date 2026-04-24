import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getCountFromServer, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../app/store/authStore';
import { EventWithStats } from '../../../types/event.types';
import { format } from 'date-fns';
import { Loader2, Users, CheckCircle, AlertCircle, BarChart3, ChevronRight, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../shared/ui/Button/Button';
import { Tag } from '../../../shared/ui/Tag/Tag';
import { Link } from 'react-router-dom';
import { cn } from '../../../shared/lib/utils';

export const DashboardScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'events'), where('organizerId', '==', user.id));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const eventPromises = snapshot.docs.map(async (eventDoc) => {
          const eventId = eventDoc.id;
          
          try {
            // Fetch RSVP count
            const rsvpQuery = query(collection(db, 'rsvps'), where('eventId', '==', eventId));
            const rsvpSnap = await getCountFromServer(rsvpQuery);
            
            // Fetch Attendance count
            const attendanceQuery = query(collection(db, 'events', eventId, 'attendances'));
            const attendanceSnap = await getCountFromServer(attendanceQuery);

            return {
              id: eventId,
              ...eventDoc.data(),
              rsvpCount: rsvpSnap.data().count,
              checkInCount: attendanceSnap.data().count
            } as EventWithStats;
          } catch (err) {
            console.error(`Dashboard: Failed to fetch stats for event ${eventId}`, err);
            return {
              id: eventId,
              ...eventDoc.data(),
              rsvpCount: 0,
              checkInCount: 0
            } as EventWithStats;
          }
        });
        
        const eventList = await Promise.all(eventPromises);
        setEvents(eventList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
      } catch (error) {
        console.error("Dashboard: Snapshot processing failed", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Dashboard: Snapshot listener failed", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleCancel = async (eventId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        isCancelled: !currentStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#1a365d]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1a365d]">Organizer Dashboard</h1>
        <p className="text-[#718096]">Track RSVPs and check-in rates for your events.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard 
          icon={<Users className="text-blue-600" />}
          label="Total RSVPs-to-Date"
          value={events.reduce((acc, curr) => acc + curr.rsvpCount, 0)}
          color="bg-blue-50"
        />
        <StatCard 
          icon={<CheckCircle className="text-green-600" />}
          label="Total Check-ins"
          value={events.reduce((acc, curr) => acc + curr.checkInCount, 0)}
          color="bg-green-50"
        />
        <StatCard 
          icon={<BarChart3 className="text-[#ed8936]" />}
          label="Avg. Attendance Rate"
          value={
            events.length > 0 
              ? `${Math.round((events.reduce((acc, curr) => acc + (curr.rsvpCount > 0 ? (curr.checkInCount / curr.rsvpCount) : 0), 0) / events.length) * 100)}%`
              : '0%'
          }
          color="bg-orange-50"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1a365d]">Your Events</h2>
        
        {events.length > 0 ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-[#e2e8f0]">
            <ul className="divide-y divide-[#e2e8f0]">
              {events.map((event) => (
                <li key={event.id} className="group hover:bg-[#f8fafc] transition-colors">
                  <div className="flex flex-col p-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        {event.isCancelled ? (
                          <Tag variant="warning">Cancelled</Tag>
                        ) : (
                          <StatusBadge status={event.status} />
                        )}
                        <span className="text-xs text-[#718096]">
                          {format(new Date(event.startTime), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#1a365d] group-hover:text-[#ed8936] transition-colors">
                        {event.title}
                      </h3>
                      {event.status === 'rejected' && event.rejectionReason && (
                        <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100 italic">
                          <XCircle size={12} className="inline mr-1" />
                          Rejection Reason: {event.rejectionReason}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 text-sm text-[#718096]">
                        <p className="flex items-center">
                          <Users size={14} className="mr-1" />
                          {event.rsvpCount} RSVPs • {event.checkInCount} Check-ins
                        </p>
                        <Link 
                          to={`/organizer/events/${event.id}/attendees`}
                          className="text-blue-600 hover:underline font-medium text-xs flex items-center"
                        >
                          View attendee list →
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center space-x-3 md:mt-0">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden mr-4 hidden md:block">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${event.rsvpCount > 0 ? (event.checkInCount / event.rsvpCount) * 100 : 0}%` }}
                        />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleCancel(event.id, event.isCancelled)}
                      >
                        {event.isCancelled ? 'Reactivate' : 'Cancel Event'}
                      </Button>
                      
                      <Link to={`/events/${event.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight size={20} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#cbd5e0] text-[#718096]">
            <p>You haven't created any events yet.</p>
            <Link to="/organizer/create" className="text-[#1a365d] font-bold mt-2 inline-block">Create your first event →</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] flex items-center space-x-4">
    <div className={`p-4 rounded-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-[#a0aec0] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold text-[#1a365d]">{value}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    pending: "bg-yellow-50 text-yellow-600 border-yellow-100",
    published: "bg-green-50 text-green-600 border-green-100",
    rejected: "bg-red-50 text-red-600 border-red-100",
  }[status] || "bg-gray-50 text-gray-600 border-gray-100";

  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", styles)}>
      {status}
    </span>
  );
};
