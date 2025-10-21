import React from "react";
import { BeakerIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const Header: React.FC = () => {
  const [location] = useLocation();
  const navItems = [
    { path: "/generate-concept", label: "Generate Concept" },
    { path: "/validate-study-idea", label: "Validate Study Idea" },
    { path: "/reports", label: "Reports" },
  ];

  return (
    <header className="bg-white border-b border-neutral-light">
      <div className="px-4 md:px-6 py-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <BeakerIcon className="w-8 h-8 text-primary" />
          <span className="ml-2 text-lg font-semibold text-neutral-dark hidden sm:inline-block">
            Clinical Study Ideator & Validator
          </span>
          <span className="ml-2 text-lg font-semibold text-neutral-dark sm:hidden">
            CSI&V
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  buttonVariants({ variant: isActive ? "default" : "outline", size: "sm" }),
                  "min-w-[160px] justify-center"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
