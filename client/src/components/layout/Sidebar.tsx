import React from "react";
import { Link, useLocation } from "wouter";
import { 
  PlusIcon, 
  HomeIcon, 
  FileTextIcon, 
  FilePlus2Icon, 
  BarChartIcon, 
  HelpCircleIcon, 
  SettingsIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Sidebar: React.FC = () => {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: HomeIcon, label: "Dashboard" },
    { path: "/projects", icon: FileTextIcon, label: "Projects" },
    { path: "/generate-concept", icon: FilePlus2Icon, label: "New Concept" },
    { path: "/validate-study-idea", icon: FileTextIcon, label: "Validate Study Idea" },
    { path: "/reports", icon: BarChartIcon, label: "Reports" },
    { path: "/help", icon: HelpCircleIcon, label: "Help" },
  ];

  return (
    <aside className="w-14 md:w-64 bg-white border-r border-neutral-light flex-shrink-0">
      <nav className="flex flex-col h-full py-4">
        <div className="px-3 mb-6">
          <div className="relative md:hidden">
            <Button variant="outline" size="icon" className="w-full flex justify-center text-primary border-primary">
              <PlusIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="hidden md:block">
            <Button className="w-full flex items-center justify-center md:justify-start space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>New Project</span>
            </Button>
          </div>
        </div>
        
        <div className="space-y-1 px-2 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center justify-center md:justify-start p-2 rounded-md group",
                location === item.path 
                  ? "text-primary bg-blue-50" 
                  : "text-neutral-medium hover:text-primary hover:bg-blue-50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="ml-3 hidden md:inline-block">{item.label}</span>
            </Link>
          ))}
        </div>
        
        <div className="px-2 mt-6">
          <Link 
            href="/settings"
            className="flex items-center justify-center md:justify-start p-2 text-neutral-medium hover:text-primary hover:bg-blue-50 rounded-md group"
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="ml-3 hidden md:inline-block">Settings</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
