import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '../../../lib/firebase';
import { Button } from '../../../shared/ui/Button/Button';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-sm"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a365d]">
            Welcome to EventHub
          </h1>
          <p className="text-[#718096]">
            Sign in with your university account to RSVP and check-in to events.
          </p>
        </div>

        <div className="py-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-[#f7fafc] p-6 text-[#1a365d]">
              <LogIn size={48} />
            </div>
          </div>
        </div>

        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleLogin}
        >
          Sign in with Google
        </Button>

        <p className="text-xs text-[#a0aec0]">
          By signing in, you agree to our terms of service and recognize that access is restricted to authorized university domains.
        </p>
      </motion.div>
    </div>
  );
};
