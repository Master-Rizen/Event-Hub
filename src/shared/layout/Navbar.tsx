import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, LayoutDashboard, QrCode, LogIn, User as UserIcon, LogOut, Shield, Ticket } from 'lucide-react';
import { useAuthStore } from '../../app/store/authStore';
import { cn } from '../../shared/lib/utils';
import { Button } from '../ui/Button/Button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getNavItems = () => {
    const items = [
      { to: '/', icon: Home, label: 'Home' },
    ];

    if (!user) return items;

    items.push({ to: '/my-events', icon: Ticket, label: 'My Events' });

    // Club & Admin / Organizer routes
    if (user.role === 'club' || user.role === 'organizer' || user.role === 'admin') {
      items.push({ to: '/scanner', icon: QrCode, label: 'Scan' });
      items.push({ to: '/organizer/create', icon: PlusSquare, label: 'Post' });
      items.push({ to: '/organizer/dashboard', icon: LayoutDashboard, label: 'Admin' });
    }

    // New Super Admin Dash
    if (user.role === 'admin') {
      items.push({ to: '/admin/dashboard', icon: Shield, label: 'System Admin' });
    }

    return items;
  };

  const visibleItems = getNavItems();

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden w-full border-b bg-white md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <NavLink to="/" className="text-xl font-bold text-[#1a365d]">
            EventHub<span className="text-[#ed8936]">.</span>
          </NavLink>

          <nav className="flex items-center space-x-8">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors hover:text-[#1a365d]',
                    isActive ? 'text-[#1a365d]' : 'text-[#718096]'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-[#1a365d] flex items-center justify-center text-white">
                    <UserIcon size={16} />
                  </div>
                  <span className="text-sm font-medium text-[#4a5568]">{user.fullName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate('/login')}>
                <LogIn size={16} className="mr-2" />
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tabs */}
      <nav className="fixed bottom-0 z-40 flex w-full justify-around border-t bg-white p-3 md:hidden">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center transition-colors',
                isActive ? 'text-[#1a365d]' : 'text-[#a0aec0]'
              )
            }
          >
            <item.icon size={20} />
            <span className="mt-1 text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        {!user && (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center transition-colors',
                isActive ? 'text-[#1a365d]' : 'text-[#a0aec0]'
              )
            }
          >
            <LogIn size={20} />
            <span className="mt-1 text-[10px] font-medium">Login</span>
          </NavLink>
        )}
      </nav>
    </>
  );
};
