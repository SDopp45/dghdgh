import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificationStore } from '@/lib/stores/useNotificationStore';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationBell() {
  const { unreadCount, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
          {unreadCount > 0 && (
              <motion.span 
                key="badge"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center"
              >
              {unreadCount}
              </motion.span>
          )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <div className="flex items-center justify-between p-2 border-b">
          <h2 className="text-lg font-semibold">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm"
              onClick={markAllAsRead}
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        {/* Onglets Vu/Non vu */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'unread' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveTab('unread')}
          >
            Non vues
          </Button>
          <Button
            variant={activeTab === 'read' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveTab('read')}
          >
            Vues
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}