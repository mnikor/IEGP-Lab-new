import React from "react";
import { BeakerIcon, BellIcon, Heading6 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-neutral-light">
      <div className="px-4 md:px-6 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <BeakerIcon className="w-8 h-8 text-primary" />
            <span className="ml-2 text-lg font-semibold text-neutral-dark hidden md:inline-block">
              Clinical Study Ideator & Validator
            </span>
            <span className="ml-2 text-lg font-semibold text-neutral-dark md:hidden">
              CSI&V
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 text-neutral-medium hover:text-primary rounded-full">
            <BellIcon className="h-5 w-5" />
          </button>
          <button className="p-2 text-neutral-medium hover:text-primary rounded-full">
            <Heading6 className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User profile" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <span className="ml-2 text-sm font-medium text-neutral-dark hidden md:inline-block">
              Dr. Sarah Chen
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
