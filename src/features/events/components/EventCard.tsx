import React from 'react';
import { Calendar, MapPin, Users, CloudRain, Sun } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { EventWithStats } from '../../../types/event.types';
import { cn } from '../../../shared/lib/utils';
import { Tag } from '../../../shared/ui/Tag/Tag';

interface EventCardProps {
  event: EventWithStats;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const isOutdoor = event.locationType === 'outdoor';
  const hasWarning = event.weatherSuggestion?.includes('⚠️');

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "group overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-md border border-[#e2e8f0]",
        event.isCancelled && "opacity-60 saturate-50"
      )}
    >
      <Link to={`/events/${event.id}`}>
        <div className="aspect-video relative overflow-hidden">
          <img 
            src={event.imageUrl || `https://picsum.photos/seed/${event.id}/600/400`} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          {event.isCancelled && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                Cancelled
              </span>
            </div>
          )}
          {event.status && event.status !== 'published' && !event.isCancelled && (
            <div className="absolute top-2 left-2 z-10">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm border",
                event.status === 'pending' ? "bg-yellow-500 text-white border-yellow-600" : "bg-red-500 text-white border-red-600"
              )}>
                {event.status}
              </span>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <Tag variant={event.isCancelled ? 'warning' : (isOutdoor ? 'success' : 'info')}>
              {event.isCancelled ? 'Cancelled' : (isOutdoor ? 'Outdoor' : 'Indoor')}
            </Tag>
            {event.weatherSuggestion && !event.isCancelled && (
              <div className={cn(
                "flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs font-medium",
                hasWarning ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
              )}>
                {hasWarning ? <CloudRain size={12} /> : <Sun size={12} />}
                <span className="truncate max-w-[100px]">
                  {hasWarning ? 'Alert' : 'Perfect'}
                </span>
              </div>
            )}
          </div>

          <h3 className={cn(
            "mb-2 text-lg font-bold line-clamp-1 transition-colors",
            event.isCancelled ? "text-[#a0aec0] line-through" : "text-[#1a365d] group-hover:text-[#ed8936]"
          )}>
            {event.title}
          </h3>

          <div className="space-y-2 text-sm text-[#718096]">
            <div className="flex items-center">
              <Calendar size={14} className="mr-2" />
              {format(new Date(event.startTime), 'EEE, MMM d • h:mm a')}
            </div>
            <div className="flex items-center">
              <MapPin size={14} className="mr-2" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center">
              <Users size={14} className="mr-2" />
              {event.capacity ? `${event.rsvpCount} / ${event.capacity} Going` : `${event.rsvpCount} Going`}
            </div>
          </div>
        </div>

        <div className="bg-[#f8fafc] px-5 py-3 text-xs font-medium text-[#1a365d] flex justify-between items-center group-hover:bg-[#f0f4f8] transition-colors">
          <span>View Details</span>
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: 4 }}
          >
            →
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
};
