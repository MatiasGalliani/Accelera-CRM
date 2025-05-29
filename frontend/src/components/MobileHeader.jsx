import React from "react";
import { Link } from "react-router-dom";
import { NotificationButton } from "@/components/ui/notification-button";
import logo from "@/assets/Accelera_logo.svg";

export default function MobileHeader() {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4">
      {/* Menu Button - Removed since it's handled by SidePanel */}

      {/* Logo */}
      <Link to="/" className="flex items-center justify-center flex-1">
        <img src={logo} alt="Accelera" className="h-10" />
      </Link>

      {/* Notification Button */}
      <NotificationButton
        hasNotifications={false}
        onClick={() => {
          // Handle notification click
          console.log('Notification clicked');
        }}
      />
    </div>
  );
} 