import React, { useEffect } from 'react';
import { useEventStore } from '../../../app/store/eventStore';
import { useAuthStore } from '../../../app/store/authStore';
import { EventCard } from '../components/EventCard';
import { Loader2, Ticket, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../../../shared/ui/Button/Button';
import { useNavigate } from 'react-router-dom';

export const MyRSVPsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { userRSVPs, fetchUserRSVPs, loading } = useEventStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      fetchUserRSVPs(user.id);
    }
  }, [user?.id, fetchUserRSVPs]);

  const now = new Date().toISOString();
  const activeRSVPs = userRSVPs.filter(event => (event.endTime >= now && !event.isCancelled));
  const pastRSVPs = userRSVPs.filter(event => (event.endTime < now || event.isCancelled));

  if (loading && userRSVPs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[#1a365d]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-[#1a365d] rounded-2xl">
            <Ticket size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1a365d]">My Registrations</h1>
            <p className="text-[#718096]">Track your upcoming and past campus activities.</p>
          </div>
        </div>
      </header>

      {userRSVPs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#cbd5e0] space-y-6">
          <div className="flex justify-center">
            <div className="p-6 bg-[#f8fafc] rounded-full text-[#a0aec0]">
              <CalendarIcon size={48} />
            </div>
          </div>
          <div className="max-w-xs mx-auto space-y-4">
            <h3 className="text-xl font-bold text-[#1a365d]">No registrations yet</h3>
            <p className="text-[#718096]">
              You haven't registered for any events yet. Explore the campus and find something exciting!
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Explore Events
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Events */}
          <section className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-xl font-bold text-[#1a365d]">Ongoing & Upcoming</h2>
            </div>
            {activeRSVPs.length === 0 ? (
              <p className="text-sm text-[#718096] bg-white p-6 rounded-2xl border border-[#e2e8f0]">No upcoming events at the moment.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activeRSVPs.map(event => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Past/Cancelled Events */}
          {pastRSVPs.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-[#1a365d] opacity-50">Past Activities</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-75 grayscale-[0.2]">
                {pastRSVPs.map(event => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
