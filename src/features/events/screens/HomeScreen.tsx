import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../../app/store/eventStore';
import { EventCard } from '../components/EventCard';
import { Search, Loader2, Calendar as CalendarIcon, Filter, Sun, ChevronRight } from 'lucide-react';
import { Input } from '../../../shared/ui/Input/Input';
import { Button } from '../../../shared/ui/Button/Button';
import { Tag } from '../../../shared/ui/Tag/Tag';
import { motion } from 'motion/react';

export const HomeScreen: React.FC = () => {
  const { upcomingEvents, fetchUpcomingEvents, loading } = useEventStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  const filteredEvents = upcomingEvents.filter(event => 
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.location.toLowerCase().includes(search.toLowerCase())
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = filteredEvents.filter(e => e.startTime?.startsWith?.(todayStr));
  const weekEvents = filteredEvents.filter(e => e.startTime && !e.startTime.startsWith(todayStr));

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-extrabold text-[#1a365d] tracking-tight">
          What's happening <span className="text-[#ed8936]">on campus?</span>
        </h1>
        <p className="text-[#718096] max-w-2xl mx-auto">
          Discover workshops, free food, and club meetings. Never miss out on campus life again.
        </p>
        
        <div className="max-w-xl mx-auto pt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0aec0]" size={20} />
          <Input 
            className="pl-11 h-14 text-lg shadow-lg border-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-[#ed8936]"
            placeholder="Search events, clubs, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {loading && upcomingEvents.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-[#1a365d]" size={32} />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#cbd5e0] space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-[#f8fafc] rounded-full text-[#a0aec0]">
              <Search size={48} />
            </div>
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className="text-xl font-bold text-[#1a365d]">No events found</h3>
            <p className="text-[#718096] mt-2">
              {search 
                ? `We couldn't find anything matching "${search}". Try another keyword!` 
                : "It's a quiet day on campus. Why not create an event yourself?"}
            </p>
            {search && (
              <Button 
                variant="ghost" 
                className="mt-4 text-[#ed8936]" 
                onClick={() => setSearch('')}
              >
                Clear all searches
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {todayEvents.length > 0 ? (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 text-[#ed8936] rounded-lg">
                    <CalendarIcon size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1a365d]">Today's Events</h2>
                </div>
                <Tag variant="success">{todayEvents.length} events</Tag>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {todayEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : !search && (
            <section className="p-10 rounded-3xl bg-blue-50 border border-blue-100 text-center space-y-4">
              <div className="flex justify-center text-blue-400">
                <Sun size={48} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-bold text-blue-900">No events scheduled for today</h3>
                <p className="text-blue-700 mt-2">
                  Take a breather or look ahead to see what's planned for the rest of the week!
                </p>
              </div>
            </section>
          )}

          {weekEvents.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Filter size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1a365d]">Later this week</h2>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {weekEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
