import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { HomeScreen } from '../../features/events/screens/HomeScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { EventDetailScreen } from '../../features/events/screens/EventDetailScreen';
import { CreateEventScreen } from '../../features/events/screens/CreateEventScreen';
import { MyRSVPsScreen } from '../../features/events/screens/MyRSVPsScreen';
import { EditEventScreen } from '../../features/events/screens/EditEventScreen';
import { DashboardScreen } from '../../features/organizer/screens/DashboardScreen';
import { AttendeesListScreen } from '../../features/organizer/screens/AttendeesListScreen';
import { QRScannerScreen } from '../../features/scanner/screens/QRScannerScreen';
import { RoleSelectionScreen } from '../../features/auth/screens/RoleSelectionScreen';
import { AdminDashboardScreen } from '../../features/admin/screens/AdminDashboardScreen';
import { Navbar } from '../../shared/layout/Navbar';

export const RootRouter: React.FC = () => {
  const { initialize, loading, needsRole } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f7fafc]">
        <div className="h-12 w-12 animate-spin border-4 border-[#1a365d] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Handle role selection before allowing navigation
  if (needsRole) {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-[#f7fafc]">
          <Routes>
            <Route path="*" element={<RoleSelectionScreen />} />
          </Routes>
        </div>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f7fafc] pb-20 md:pb-0">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/events/:id" element={<EventDetailScreen />} />
            <Route path="/my-events" element={<ProtectedRoute><MyRSVPsScreen /></ProtectedRoute>} />
            
            {/* Club / Organizer Routes */}
            <Route 
              path="/organizer/create" 
              element={<ProtectedRoute allowedRoles={['club', 'organizer', 'admin']}><CreateEventScreen /></ProtectedRoute>} 
            />
            <Route 
              path="/events/:id/edit" 
              element={<ProtectedRoute allowedRoles={['club', 'organizer', 'admin']}><EditEventScreen /></ProtectedRoute>} 
            />
            <Route 
              path="/organizer/dashboard" 
              element={<ProtectedRoute allowedRoles={['club', 'organizer', 'admin']}><DashboardScreen /></ProtectedRoute>} 
            />
            <Route 
              path="/organizer/events/:id/attendees" 
              element={<ProtectedRoute allowedRoles={['club', 'organizer', 'admin']}><AttendeesListScreen /></ProtectedRoute>} 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/dashboard" 
              element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardScreen /></ProtectedRoute>} 
            />
            
            <Route 
              path="/scanner" 
              element={<ProtectedRoute allowedRoles={['club', 'organizer', 'admin']}><QRScannerScreen /></ProtectedRoute>} 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  allowedRoles?: ('student' | 'club' | 'admin' | 'attendee' | 'organizer')[];
}> = ({ children, allowedRoles }) => {
  const { user, initialized } = useAuthStore();

  if (!initialized) return null;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};
