import React, { useState } from 'react';
import { useAuthStore } from '../../../app/store/authStore';
import { motion } from 'motion/react';
import { User, Users, CheckCircle2, ChevronRight, Loader2, Shield } from 'lucide-react';
import { Button } from '../../../shared/ui/Button/Button';
import { cn } from '../../../shared/lib/utils';

export const RoleSelectionScreen: React.FC = () => {
  const { createProfile, logout } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<'student' | 'club' | 'admin' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      await createProfile(selectedRole);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'student' as const,
      title: 'Student',
      description: 'Discover events, RSVP, and join campus activities.',
      icon: User,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      activeColor: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50',
    },
    {
      id: 'club' as const,
      title: 'Club / Organization',
      description: 'Create and manage events for your student organization.',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      activeColor: 'ring-2 ring-purple-500 border-purple-500 bg-purple-50',
    },
    {
      id: 'admin' as const,
      title: 'Administrator',
      description: 'Moderate events and manage platform permissions.',
      icon: Shield,
      color: 'bg-red-50 text-red-600 border-red-100',
      activeColor: 'ring-2 ring-red-500 border-red-500 bg-red-50',
    },
  ];

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-[#e2e8f0]"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a365d]">Welcome to EventHub!</h1>
          <p className="text-[#4a5568]">How will you be using the platform?</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "relative flex flex-col items-center text-center p-6 rounded-2xl border transition-all duration-200 group",
                selectedRole === role.id ? role.activeColor : "bg-white border-[#e2e8f0] hover:border-gray-300 hover:shadow-md"
              )}
            >
              {selectedRole === role.id && (
                <div className="absolute top-3 right-3 text-current">
                  <CheckCircle2 size={20} />
                </div>
              )}
              <div className={cn("mb-4 p-4 rounded-full transition-transform duration-200 group-hover:scale-110", role.color)}>
                <role.icon size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#1a365d] mb-2">{role.title}</h3>
              <p className="text-sm text-[#718096] leading-relaxed">
                {role.description}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <div className="space-y-4 pt-4">
          <Button 
            onClick={handleContinue} 
            disabled={!selectedRole || loading}
            className="w-full py-6 text-lg font-bold rounded-2xl shadow-lg shadow-blue-900/10"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
            Complete Setup
            <ChevronRight className="ml-2" />
          </Button>

          <button 
            onClick={() => logout()}
            className="w-full text-center text-sm font-medium text-[#718096] hover:text-[#1a365d] transition-colors"
          >
            Cancel and Log Out
          </button>
        </div>

        <p className="text-xs text-center text-[#a0aec0] px-8">
          Note: Your university email domain will be verified to ensure campus authenticity. 
          Club accounts may require admin verification.
        </p>
      </motion.div>
    </div>
  );
};
