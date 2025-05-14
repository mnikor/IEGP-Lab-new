import React from "react";
import { BeakerIcon } from "lucide-react";

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
        {/* Right side header content removed */}
      </div>
    </header>
  );
};

export default Header;
