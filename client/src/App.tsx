import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/AppShell";
import GenerateConcept from "@/pages/generate-concept";
import ValidateStudyIdea from "@/pages/validate-study-idea";
import Reports from "@/pages/reports";
import TournamentList from "@/pages/TournamentList";
import TournamentView from "@/pages/TournamentView";
import { TournamentProvider } from "@/context/TournamentContext";

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/">
          {() => {
            window.location.href = "/generate-concept";
            return null;
          }}
        </Route>
        <Route path="/generate-concept" component={GenerateConcept} />
        <Route path="/validate-study-idea" component={ValidateStudyIdea} />
        <Route path="/validate-synopsis">
          {() => {
            window.location.href = "/validate-study-idea";
            return null;
          }}
        </Route>
        <Route path="/projects">
          {() => {
            window.location.href = "/generate-concept";
            return null;
          }}
        </Route>
        <Route path="/reports" component={Reports} />
        <Route path="/tournaments">
          <TournamentList />
        </Route>
        <Route path="/tournaments/:id">
          {(params) => (
            <TournamentProvider>
              <TournamentView />
            </TournamentProvider>
          )}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
