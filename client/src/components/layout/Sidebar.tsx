import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  FileTextIcon, 
  FilePlus2Icon, 
  BarChartIcon, 
  HelpCircleIcon, 
  SettingsIcon,
  BeakerIcon,
  TrophyIcon,
  PlusCircleIcon,
  CheckCircle2,
  CircleDashed,
  InfoIcon,
  BookmarkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STRATEGIC_GOALS } from "@shared/strategicGoals";

const Sidebar: React.FC = () => {
  const [location, navigate] = useLocation();
  const [isNewTournamentOpen, setIsNewTournamentOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    drugName: '',
    indication: '',
    studyPhasePref: 'II',
    strategicGoals: [] as Array<{ goal: string, weight: number }>,
    geography: [] as string[],
    maxRounds: 3,
    lanes: 5
  });
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationStage, setCreationStage] = useState<string>('');
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStrategicGoalChange = (goalId: string, checked: boolean) => {
    const weight = 1; // Default weight
    
    setFormValues(prev => {
      if (checked) {
        return {
          ...prev,
          strategicGoals: [...prev.strategicGoals, { goal: goalId, weight }]
        };
      } else {
        return {
          ...prev,
          strategicGoals: prev.strategicGoals.filter(g => g.goal !== goalId)
        };
      }
    });
  };

  const handleGeographyChange = (displayRegion: string, checked: boolean) => {
    // Map the display region to the server-expected two-letter code
    const regionCode = geographicRegionsMap[displayRegion as keyof typeof geographicRegionsMap];
    
    setFormValues(prev => {
      if (checked) {
        return {
          ...prev,
          geography: [...prev.geography, regionCode]
        };
      } else {
        return {
          ...prev,
          geography: prev.geography.filter(g => g !== regionCode)
        };
      }
    });
  };
  
  // Effect to poll for tournament progress
  useEffect(() => {
    if (tournamentId && isCreating) {
      // Clear any existing interval
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      
      // Start polling for tournament progress
      const interval = window.setInterval(async () => {
        try {
          const response = await fetch(`/api/tournaments/${tournamentId}`);
          const data = await response.json();
          
          // Update progress based on tournament status
          if (data.tournament) {
            const tournament = data.tournament;
            
            // Check if initial ideas exist
            const ideasResponse = await fetch(`/api/tournaments/${tournamentId}/ideas`);
            const ideas = await ideasResponse.json();
            
            if (ideas.length === 0) {
              setCreationStage('Generating initial study concepts...');
              setCreationProgress(10);
            } else if (tournament.currentRound === 0) {
              setCreationStage('Evaluating concepts with review board...');
              setCreationProgress(25);
            } else if (tournament.currentRound === 1) {
              setCreationStage('Processing round 1 challenger ideas...');
              setCreationProgress(50);
            } else if (tournament.currentRound === 2) {
              setCreationStage('Processing round 2 challenger ideas...');
              setCreationProgress(75);
            } else if (tournament.currentRound === 3 || tournament.status === 'completed') {
              setCreationStage('Finalizing tournament results...');
              setCreationProgress(100);
              
              // Tournament is ready, stop polling and navigate
              clearInterval(interval);
              setPollInterval(null);
              setIsCreating(false);
              setIsNewTournamentOpen(false);
              
              // Reset state
              setTournamentId(null);
              setCreationStage('');
              setCreationProgress(0);
              
              // Navigate to the tournament
              navigate(`/tournaments/${tournamentId}`);
            }
          }
        } catch (error) {
          console.error('Error polling tournament progress:', error);
        }
      }, 3000); // Poll every 3 seconds
      
      setPollInterval(interval);
      
      // Clean up on unmount
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [tournamentId, isCreating, navigate]);

  const handleSubmit = async () => {
    setError(null);
    setCreationProgress(0);
    setCreationStage('');
    
    if (!formValues.drugName || !formValues.indication) {
      setError('Drug name and indication are required');
      return;
    }
    
    if (formValues.strategicGoals.length === 0) {
      setError('At least one strategic goal must be selected');
      return;
    }
    
    if (formValues.geography.length === 0) {
      setError('At least one geographic region must be selected');
      return;
    }
    
    setIsCreating(true);
    setCreationStage('Initializing tournament...');
    setCreationProgress(5);
    
    try {
      const response = await apiRequest('POST', '/api/tournaments/new-concept', formValues);
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      
      // Reset form values but keep dialog open to show progress
      setFormValues({
        drugName: '',
        indication: '',
        studyPhasePref: 'II',
        strategicGoals: [],
        geography: [],
        maxRounds: 3,
        lanes: 5
      });
      
      // Store tournament ID to track progress, but don't navigate yet
      if (data && data.tournament_id) {
        setTournamentId(data.tournament_id);
        setCreationStage('Tournament created, generating initial ideas...');
        setCreationProgress(10);
      } else {
        throw new Error('No tournament ID returned from server');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create tournament');
      setIsCreating(false);
      setCreationProgress(0);
      setCreationStage('');
    }
  };

  // Use standardized strategic goals
  const strategicGoalsForTournament = STRATEGIC_GOALS.map(goal => ({
    id: goal.id,
    label: goal.label,
    description: goal.description,
    tooltip: goal.tooltip
  }));
  
  // Predefine some geographic regions with ISO codes
  const geographicRegionsMap = {
    'North America': 'NA',
    'Europe': 'EU',
    'Asia Pacific': 'AP',
    'Latin America': 'LA',
    'Middle East & Africa': 'ME',
    'Global': 'GL'
  };
  
  const geographicRegions = Object.keys(geographicRegionsMap);

  const navItems = [
    { path: "/generate-concept", icon: FilePlus2Icon, label: "New Concept" },
    { path: "/validate-study-idea", icon: FileTextIcon, label: "Validate Study Idea" },
    { path: "/saved-proposals", icon: BookmarkIcon, label: "Saved Proposals" },
    { path: "/tournaments", icon: TrophyIcon, label: "Multi-Agent Tournament" },
    { path: "/reports", icon: BarChartIcon, label: "Reports" },
    { path: "/help", icon: HelpCircleIcon, label: "Help" },
  ];

  return (
    <aside className="w-14 md:w-64 bg-white border-r border-neutral-light flex-shrink-0">
      <nav className="flex flex-col h-full py-4">
        <div className="px-3 mb-6">
          <div className="text-center md:text-left font-medium text-lg text-primary px-2 py-1">
            Clinical Study Ideator
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
        
        <div className="px-2 mt-4">
          <Dialog 
            open={isNewTournamentOpen} 
            onOpenChange={(open) => {
              // If we're in the middle of creating a tournament, confirm before closing
              if (!open && isCreating && tournamentId) {
                if (window.confirm("Tournament creation is still in progress. If you close this dialog, the tournament will continue to be created in the background but you won't see progress. Are you sure you want to close?")) {
                  setIsNewTournamentOpen(false);
                }
              } else {
                setIsNewTournamentOpen(open);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center justify-center md:justify-start w-full p-2 text-primary hover:bg-primary/10 rounded-md group"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span className="ml-3 hidden md:inline-block">New Tournament</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Start a New Concept Tournament</DialogTitle>
                <DialogDescription>
                  Create a tournament to generate and evaluate study concepts using our multi-agent system.
                </DialogDescription>
              </DialogHeader>
              
              {error && (
                <Alert variant="destructive" className="my-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="drugName">Drug Name</Label>
                    <Input 
                      id="drugName" 
                      value={formValues.drugName}
                      onChange={(e) => handleInputChange('drugName', e.target.value)}
                      placeholder="e.g. Aducanumab"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="indication">Indication</Label>
                    <Input 
                      id="indication" 
                      value={formValues.indication}
                      onChange={(e) => handleInputChange('indication', e.target.value)}
                      placeholder="e.g. Alzheimer's Disease"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Study Phase Preference</Label>
                  <Select 
                    value={formValues.studyPhasePref}
                    onValueChange={(value) => handleInputChange('studyPhasePref', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Phase 1</SelectItem>
                      <SelectItem value="II">Phase 2</SelectItem>
                      <SelectItem value="III">Phase 3</SelectItem>
                      <SelectItem value="IV">Phase 4</SelectItem>
                      <SelectItem value="any">Any Phase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Strategic Goals</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {strategicGoalsForTournament.map((goal) => (
                      <div key={goal.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`goal-${goal.id}`}
                          checked={formValues.strategicGoals.some(g => g.goal === goal.id)}
                          onChange={(e) => handleStrategicGoalChange(goal.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <label htmlFor={`goal-${goal.id}`} className="text-sm flex items-center">
                                {goal.label}
                                <InfoIcon className="h-3 w-3 ml-1 text-muted-foreground" />
                              </label>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{goal.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Geographic Regions</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {geographicRegions.map((region) => (
                      <div key={region} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`region-${region}`}
                          checked={formValues.geography.includes(geographicRegionsMap[region as keyof typeof geographicRegionsMap])}
                          onChange={(e) => handleGeographyChange(region, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`region-${region}`} className="text-sm">
                          {region}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxRounds">Max Rounds</Label>
                    <Input 
                      id="maxRounds"
                      type="number"
                      min={1}
                      max={10}
                      value={formValues.maxRounds}
                      onChange={(e) => handleInputChange('maxRounds', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lanes">Number of Lanes</Label>
                    <Input 
                      id="lanes"
                      type="number"
                      min={1}
                      max={10}
                      value={formValues.lanes}
                      onChange={(e) => handleInputChange('lanes', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              {/* Creation Progress UI */}
              {isCreating && tournamentId && (
                <div className="space-y-4 my-4 px-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Creating Tournament</h4>
                    <span className="text-xs text-muted-foreground">{creationProgress}%</span>
                  </div>
                  
                  <Progress value={creationProgress} className="h-2" />
                  
                  <div className="text-sm text-center text-muted-foreground mt-2">
                    {creationStage}
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      {creationProgress >= 5 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-xs">Creating tournament</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {creationProgress >= 10 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-xs">Generating initial ideas</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {creationProgress >= 25 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-xs">Expert review of initial ideas</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {creationProgress >= 50 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-xs">Processing round 1</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {creationProgress >= 75 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-xs">Processing round 2</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {creationProgress >= 100 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300" />
                      )}
                      <span className="text-xs">Finalizing tournament</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-center text-muted-foreground mt-4">
                    This process may take 1-5 minutes to complete.
                    <br />
                    You'll be redirected automatically when ready.
                  </div>
                </div>
              )}
              
              <DialogFooter>
                {isCreating && tournamentId ? (
                  <Button type="button" variant="outline" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    onClick={handleSubmit}
                    disabled={isCreating}
                  >
                    {isCreating && !tournamentId && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Start Tournament
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="px-2 mt-2">
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
