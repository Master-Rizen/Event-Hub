import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../app/store/authStore';
import { Loader2, ChevronLeft, UserCheck, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../shared/ui/Button/Button';
import { Event } from '../../../types/event.types';

interface AttendeeInfo {
  id: string;
  attendeeId: string;
  checkedInAt: string;
  checkInMethod: string;
  fullName: string;
  email: string;
}

export const AttendeesListScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      
      try {
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (eventDoc.exists()) {
          const eventData = eventDoc.id ? { id: eventDoc.id, ...eventDoc.data() } as Event : null;
          if (eventData?.organizerId !== user.id) {
            navigate('/');
            return;
          }
          setEvent(eventData);
        }

        const attendanceQuery = query(
          collection(db, 'events', id, 'attendances'),
          orderBy('checkedInAt', 'desc')
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        
        const attendeePromises = attendanceSnap.docs.map(async (attendDoc) => {
          try {
            const data = attendDoc.data();
            const userDoc = await getDoc(doc(db, 'users', data.attendeeId));
            const userData = userDoc.exists() ? userDoc.data() : { fullName: 'Unknown Student', email: '' };
            
            return {
              id: attendDoc.id,
              attendeeId: data.attendeeId,
              checkedInAt: data.checkedInAt,
              checkInMethod: data.checkInMethod,
              fullName: userData.fullName,
              email: userData.email
            };
          } catch (err) {
            console.error(`AttendeesList: Failed to fetch user ${attendDoc.data().attendeeId}`, err);
            return {
              id: attendDoc.id,
              attendeeId: attendDoc.data().attendeeId,
              checkedInAt: attendDoc.data().checkedInAt,
              checkInMethod: attendDoc.data().checkInMethod,
              fullName: 'Error Loading User',
              email: ''
            };
          }
        });

        const attendeeList = await Promise.all(attendeePromises);
        setAttendees(attendeeList);
      } catch (error) {
        console.error("AttendeesList: Fetch failed", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  const exportCSV = () => {
    if (!event) return;
    const headers = ['Name', 'Email', 'Check-in Time', 'Method'];
    const rows = attendees.map(a => [
      a.fullName,
      a.email,
      format(new Date(a.checkedInAt), 'yyyy-MM-dd HH:mm:ss'),
      a.checkInMethod
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#1a365d]" size={32} />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-medium text-[#718096] hover:text-[#1a365d] transition-colors"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Dashboard
        </button>

        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download size={14} className="mr-1" />
          Export CSV
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1a365d]">{event.title}</h1>
            <p className="text-sm text-[#718096]">Attendee List • {attendees.length} Checked In</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <UserCheck size={24} />
          </div>
        </div>

        {attendees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-xs font-bold text-[#718096] uppercase tracking-wider">
                  <th className="px-4 py-3">Attendee Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Check-in Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="text-sm hover:bg-[#f8fafc] transition-colors">
                    <td className="px-4 py-4 font-medium text-[#1a365d]">{attendee.fullName}</td>
                    <td className="px-4 py-4 text-[#718096]">{attendee.email}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end text-[#718096]">
                        <Clock size={12} className="mr-1" />
                        {format(new Date(attendee.checkedInAt), 'h:mm a')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#718096]">
            <p>No attendees checked in yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
