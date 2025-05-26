import React from 'react';
import { Bell, BellRinging } from '@phosphor-icons/react';
import { Button } from './button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function NotificationButton({ hasNotifications = false, onClick, className }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative !h-8 !w-8 [&_svg]:!size-6", className)}
        >
          {hasNotifications ? (
            <BellRinging weight="fill" />
          ) : (
            <Bell weight="regular" />
          )}
          {hasNotifications && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              <span className="text-xs">!</span>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 mr-6">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Notifiche</h4>
          {hasNotifications ? (
            <div className="text-sm">
              Hai nuove notifiche
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Nessuna nuova notifica
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 