import React from "react";
import Header from "./Header";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-lightest">
        <div className="container mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
