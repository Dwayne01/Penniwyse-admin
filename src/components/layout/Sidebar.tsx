import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FolderTree,
  Store,
  Lightbulb,
  Trophy,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  FolderOpen,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Transactions', path: '/transactions', icon: CreditCard },
  { label: 'Categories', path: '/categories', icon: FolderTree },
  { label: 'Merchants', path: '/merchants', icon: Store },
  { label: 'Insights', path: '/insights', icon: Lightbulb },
  { label: 'Gamification', path: '/gamification', icon: Trophy },
  { label: 'Subscriptions', path: '/subscriptions', icon: Receipt },
  { label: 'Content', path: '/content', icon: FileText },
  { label: 'Files & Jobs', path: '/files-and-jobs', icon: FolderOpen },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Waitlist', path: '/waitlist', icon: Mail },
  { label: 'Feedbacks', path: '/feedbacks', icon: MessageSquare },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Penniwyse Admin</h1>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        )
                      }
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}

