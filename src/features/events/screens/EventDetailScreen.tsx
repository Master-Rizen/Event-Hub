import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, getCountFromServer, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../app/store/authStore';
import { Event, RSVP } from '../../../types/event.types';
import { cn } from '../../../shared/lib/utils';
import { Calendar, MapPin, Users, Loader2, ChevronLeft, QrCode, CloudRain, Sun, Download, Trash2, Edit3, Clock, Ban, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../shared/ui/Button/Button';
import { Tag } from '../../../shared/ui/Tag/Tag';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

export const EventDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'waitlist' | null>(null);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const now = new Date().toISOString();
  const hasStarted = event ? event.startTime <= now : false;
  const isOrganizer = user?.id === event?.organizerId;

  const handleCancelEvent = async () => {
    if (!id || !isOrganizer) return;
    
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'events', id), {
        isCancelled: true,
        updatedAt: new Date().toISOString(),
      });
      setEvent(prev => prev ? { ...prev, isCancelled: true } : null);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          // Normalize dates for detail screen too
          const startTime = typeof data.startTime === 'string' ? data.startTime : data.startTime?.toDate?.()?.toISOString() || new Date().toISOString();
          const endTime = typeof data.endTime === 'string' ? data.endTime : data.endTime?.toDate?.()?.toISOString() || new Date().toISOString();

          setEvent({ id: eventDoc.id, ...data, startTime, endTime } as Event);
        }

        // Fetch RSVP count
        const countSnap = await getCountFromServer(query(collection(db, 'rsvps'), where('eventId', '==', id)));
        setRsvpCount(countSnap.data().count);

        if (user) {
          const rsvpQuery = query(
            collection(db, 'rsvps'),
            where('eventId', '==', id),
            where('userId', '==', user.id)
          );
          const rsvpSnap = await getDocs(rsvpQuery);
          if (!rsvpSnap.empty) {
            setRsvpStatus(rsvpSnap.docs[0].data().status);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleRSVP = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!id || !event) return;

    setRsvpLoading(true);
    setRsvpError(null);
    try {
      if (rsvpStatus) {
        // Cancel RSVP
        const rsvpId = `${user.id}_${id}`;
        await deleteDoc(doc(db, 'rsvps', rsvpId));
        setRsvpStatus(null);
        setRsvpCount(prev => Math.max(0, prev - 1));
      } else {
        // Add RSVP
        const rsvpId = `${user.id}_${id}`;
        await setDoc(doc(db, 'rsvps', rsvpId), {
          userId: user.id,
          eventId: id,
          status: 'going',
          createdAt: new Date().toISOString(),
        });
        setRsvpStatus('going');
        setRsvpCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
      setRsvpError("Failed to update RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const downloadICS = () => {
    if (!event) return;
    const title = event.title;
    const start = format(new Date(event.startTime), "yyyyMMdd'T'HHmmss'Z'");
    const end = format(new Date(event.endTime), "yyyyMMdd'T'HHmmss'Z'");
    const details = event.description;
    const location = event.location;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${title}
DESCRIPTION:${details}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-${event.id}.ics`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#1a365d]" size={32} />
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-12">Event not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-medium text-[#718096] hover:text-[#1a365d] transition-colors"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to search
        </button>

        {isOrganizer && (
          <div className="flex items-center space-x-2">
            {!confirmCancel && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/events/${id}/edit`)}
                className="text-xs"
              >
                <Edit3 size={14} className="mr-1" />
                Edit
              </Button>
            )}
            
            {confirmCancel && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setConfirmCancel(false)}
                className="text-xs text-gray-500"
              >
                No, keep it
              </Button>
            )}

            {!event.isCancelled && (
              <Button 
                variant={confirmCancel ? "primary" : "outline"}
                size="sm" 
                onClick={handleCancelEvent}
                className={cn(
                  "text-xs transition-all",
                  !confirmCancel && "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700",
                  confirmCancel && "bg-red-600 hover:bg-red-700 border-red-600 text-white"
                )}
                isLoading={actionLoading}
              >
                <Ban size={14} className="mr-1" />
                {confirmCancel ? 'Yes, Cancel Event' : 'Cancel Event'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {event.imageUrl && (
            <div className="aspect-video rounded-2xl overflow-hidden border border-[#e2e8f0]">
              <img 
                src={event.imageUrl} 
                alt={event.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Tag variant={event.locationType === 'outdoor' ? 'success' : 'info'}>
                {event.locationType === 'outdoor' ? 'Outdoor' : 'Indoor'}
              </Tag>
              {event.isCancelled && <Tag variant="warning">Cancelled</Tag>}
            </div>
            
            <h1 className={`text-4xl font-extrabold tracking-tight ${event.isCancelled ? 'text-[#a0aec0] line-through' : 'text-[#1a365d]'}`}>
              {event.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-[#4a5568]">
              <div className="flex items-center">
                <Calendar size={18} className="mr-2 text-[#ed8936]" />
                <span className="font-medium">{format(new Date(event.startTime), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
              </div>
              <div className="flex items-center">
                <MapPin size={18} className="mr-2 text-[#ed8936]" />
                <span className="font-medium">{event.location}</span>
              </div>
              <div className="flex items-center">
                <Users size={18} className="mr-2 text-[#ed8936]" />
                <span className="font-medium">{rsvpCount} students going</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]">
            <h2 className="text-xl font-bold text-[#1a365d] mb-4">About this event</h2>
            <p className="text-[#4a5568] leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>

          {event.weatherSuggestion && (
            <div className={`p-4 rounded-xl flex items-start space-x-3 ${event.weatherSuggestion.includes('⚠️') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
              {event.weatherSuggestion.includes('⚠️') ? <CloudRain className="mt-1 flex-shrink-0" /> : <Sun className="mt-1 flex-shrink-0" />}
              <div>
                <h3 className="font-bold">Weather Tip</h3>
                <p className="text-sm">{event.weatherSuggestion}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0] sticky top-24">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[#718096] text-sm">Status</span>
                <span className="font-bold text-[#1a365d]">
                  {rsvpStatus === 'going' ? 'Going' : 'Not Registered'}
                </span>
              </div>

              <div className="space-y-3">
                {rsvpError && (
                  <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    {rsvpError}
                  </p>
                )}
                
                {hasStarted && !rsvpStatus && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-1">
                    <p className="text-sm font-bold text-gray-500">Registration Closed</p>
                    <p className="text-[10px] text-gray-400">This event has already started.</p>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleRSVP}
                  isLoading={rsvpLoading}
                  variant={rsvpStatus ? 'outline' : 'primary'}
                  disabled={hasStarted && !rsvpStatus}
                >
                  {rsvpStatus ? 'Cancel RSVP' : (hasStarted ? 'Registration Closed' : "I'm Going!")}
                </Button>

                {rsvpStatus === 'going' && (
                  <>
                    <Button 
                      className="w-full" 
                      variant="secondary"
                      onClick={() => setShowQR(!showQR)}
                    >
                      <QrCode size={18} className="mr-2" />
                      {showQR ? 'Hide Check-in QR' : 'Show Check-in QR'}
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="ghost" 
                      onClick={downloadICS}
                    >
                      <Download size={18} className="mr-2" />
                      Add to Calendar
                    </Button>
                  </>
                )}
              </div>

              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-[#f7fafc] rounded-xl p-4 flex flex-col items-center"
                  >
                    <p className="text-xs font-bold text-[#1a365d] uppercase tracking-wider mb-3">Check-in QR Code</p>
                    <div className="p-3 bg-white rounded-lg shadow-inner">
                      <QRCodeSVG value={`${event.id}.${event.qrSecret}.${user?.id}`} size={160} />
                    </div>
                    <p className="text-[10px] text-center mt-3 text-[#718096]">
                      Show this code to the organizer at the entrance.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
