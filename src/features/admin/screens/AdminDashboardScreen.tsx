import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../app/store/authStore';
import { Event } from '../../../types/event.types';
import { UserProfile } from '../../../types/user.types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, XCircle, Clock, AlertCircle, 
  Users, Calendar, Shield, Search, Filter,
  MoreVertical, Check, X, Eye
} from 'lucide-react';
import { Button } from '../../../shared/ui/Button/Button';
import { cn } from '../../../shared/lib/utils';
import { format } from 'date-fns';

type Tab = 'pending' | 'events' | 'users';

export const AdminDashboardScreen: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Real-time listener for events
    const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
      setLoading(false);
    });

    // Real-time listener for users
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    });

    return () => {
      unsubscribeEvents();
      unsubscribeUsers();
    };
  }, []);

  const handleApprove = async (eventId: string) => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'published',
        approvedBy: currentUser?.id,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to approve event", err);
    }
  };

  const handleReject = async (eventId: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;

    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to reject event", err);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'student' | 'club' | 'admin') => {
    if (userId === currentUser?.id) {
      alert("You cannot change your own role.");
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to update user role", err);
    }
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  
  const filteredEvents = events.filter(e => {
    // Treat legacy events with no status as published
    const status = e.status || 'published';
    return e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           e.organizerId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1a365d]">Admin Control Center</h1>
          <p className="text-[#4a5568]">Manage campus events, approvals, and user roles.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-[#e2e8f0] shadow-sm">
          <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} icon={Clock}>
            Pending
            {pendingEvents.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                {pendingEvents.length}
              </span>
            )}
          </TabButton>
          <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={Calendar}>Events</TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users}>Users</TabButton>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
        />
      </div>

      <div className="grid gap-6">
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingEvents.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#e2e8f0]">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-[#1a365d]">All Caught Up!</h3>
                <p className="text-gray-500">No events currently awaiting approval.</p>
              </div>
            ) : (
              pendingEvents.map(event => (
                <ApprovalCard key={event.id} event={event} onApprove={handleApprove} onReject={handleReject} />
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-3xl border border-[#e2e8f0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Event</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Organizer</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Scheduled</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredEvents.map(event => (
                    <tr key={event.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#1e293b]">{event.title}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{event.organizerId.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{format(new Date(event.startTime), 'MMM d, h:mm a')}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={event.status || 'published'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-[#e2e8f0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">User</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Email</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Role</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b]">Joined</th>
                    <th className="px-6 py-4 text-sm font-semibold text-[#64748b] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#1e293b]">{user.fullName || 'No Name'}</div>
                        <div className="text-xs text-gray-400">{user.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          user.role === 'admin' ? "bg-red-50 text-red-600" :
                          user.role === 'club' ? "bg-purple-50 text-purple-600" :
                          "bg-blue-50 text-blue-600"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{format(new Date(user.createdAt), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {user.role !== 'club' && (
                            <Button variant="outline" size="sm" onClick={() => handleRoleUpdate(user.id, 'club')}>
                              Make Club
                            </Button>
                          )}
                          {user.role !== 'admin' && (
                            <Button variant="outline" size="sm" onClick={() => handleRoleUpdate(user.id, 'admin')} className="border-red-100 text-red-600 hover:bg-red-50">
                              Make Admin
                            </Button>
                          )}
                          {user.role !== 'student' && (
                            <Button variant="ghost" size="sm" onClick={() => handleRoleUpdate(user.id, 'student')}>
                              Reset
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: any, children: React.ReactNode }> = ({ active, onClick, icon: Icon, children }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
      active ? "bg-[#1a365d] text-white shadow-lg" : "text-[#718096] hover:bg-gray-50"
    )}
  >
    <Icon size={18} />
    {children}
  </button>
);

const ApprovalCard: React.FC<{ event: Event, onApprove: (id: string) => void, onReject: (id: string) => void }> = ({ event, onApprove, onReject }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm hover:shadow-md transition-shadow gap-6"
  >
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-bold text-[#1a365d]">{event.title}</h3>
        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-bold uppercase rounded border border-yellow-100">
          Pending
        </span>
      </div>
      <p className="text-sm text-gray-500 line-clamp-1">{event.description}</p>
      <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-400">
        <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(event.startTime), 'MMM d, h:mm a')}</span>
        <span className="flex items-center gap-1"><Users size={14} /> Organizer: {event.organizerId.slice(0, 8)}...</span>
      </div>
    </div>

    <div className="flex items-center gap-3 w-full md:w-auto">
      <Button 
        variant="ghost" 
        onClick={() => window.open(`/events/${event.id}`, '_blank')}
        className="flex-1 md:flex-none"
      >
        <Eye size={18} className="mr-2" />
        Preview
      </Button>
      <Button 
        className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50"
        variant="outline"
        onClick={() => onReject(event.id)}
      >
        <X size={18} className="mr-2" />
        Reject
      </Button>
      <Button 
        className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
        onClick={() => onApprove(event.id)}
      >
        <Check size={18} className="mr-2" />
        Approve
      </Button>
    </div>
  </motion.div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    pending: "bg-yellow-50 text-yellow-600 border-yellow-100",
    published: "bg-green-50 text-green-600 border-green-100",
    rejected: "bg-red-50 text-red-600 border-red-100",
  }[status] || "bg-gray-50 text-gray-600 border-gray-100";

  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase border", styles)}>
      {status}
    </span>
  );
};
