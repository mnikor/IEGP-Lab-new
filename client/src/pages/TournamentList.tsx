import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, AlertCircle, Beaker, ChevronRight, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Tournament {
  id: number;
  drugName: string;
  indication: string;
  strategicGoals: Array<{
    goal: string;
    weight: number;
  }>;
  geography: string[];
  studyPhasePref: string;
  maxRounds: number;
  lanes: number;
  currentRound: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

const TournamentList = () => {
  const [, navigate] = useLocation();
  const [isNewTournamentOpen, setIsNewTournamentOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    drugName: '',
    indication: '',
    studyPhasePref: '2',
    strategicGoals: [] as Array<{ goal: string, weight: number }>,
    geography: [] as string[],
    maxRounds: 3,
    lanes: 5
  });
  const [error, setError] = useState<string | null>(null);

  const { data: tournaments, isLoading, isError } = useQuery({
    queryKey: ['/api/tournaments'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const createTournament = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/tournaments/new-concept', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      setIsNewTournamentOpen(false);
      setFormValues({
        drugName: '',
        indication: '',
        studyPhasePref: '2',
        strategicGoals: [],
        geography: [],
        maxRounds: 3,
        lanes: 5
      });
      
      // Navigate to the new tournament
      if (data && data.tournament_id) {
        navigate(`/tournaments/${data.tournament_id}`);
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStrategicGoalChange = (goal: string, checked: boolean) => {
    const weight = 1; // Default weight, can be made configurable later
    
    setFormValues(prev => {
      if (checked) {
        return {
          ...prev,
          strategicGoals: [...prev.strategicGoals, { goal, weight }]
        };
      } else {
        return {
          ...prev,
          strategicGoals: prev.strategicGoals.filter(g => g.goal !== goal)
        };
      }
    });
  };

  const handleGeographyChange = (region: string, checked: boolean) => {
    setFormValues(prev => {
      if (checked) {
        return {
          ...prev,
          geography: [...prev.geography, region]
        };
      } else {
        return {
          ...prev,
          geography: prev.geography.filter(g => g !== region)
        };
      }
    });
  };

  const handleSubmit = () => {
    setError(null);
    
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
    
    createTournament.mutate(formValues);
  };

  const viewTournament = (id: number) => {
    navigate(`/tournaments/${id}`);
  };

  // Predefine some strategic goals
  const strategicGoals = [
    'PRIMARY_EFFICACY',
    'SECONDARY_EFFICACY',
    'SAFETY_PROFILE',
    'DOSING_OPTIMIZATION',
    'MECHANISM_OF_ACTION',
    'POPULATION_EXPANSION',
    'COMPARATIVE_EFFECTIVENESS',
    'HEALTH_ECONOMICS',
    'REGULATORY_APPROVAL'
  ];
  
  // Predefine some geographic regions
  const geographicRegions = [
    'North America',
    'Europe',
    'Asia Pacific',
    'Latin America',
    'Middle East & Africa',
    'Global'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2">Loading tournaments...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-7xl mx-auto py-12 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load tournaments. Please try again.</AlertDescription>
        </Alert>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Concept Tournaments</h1>
          <p className="text-muted-foreground mt-2">
            Generate and evaluate study concepts using our multi-agent tournament system
          </p>
        </div>
        
        <Dialog open={isNewTournamentOpen} onOpenChange={setIsNewTournamentOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Beaker className="mr-2 h-4 w-4" />
              New Tournament
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
                    <SelectItem value="1">Phase 1</SelectItem>
                    <SelectItem value="2">Phase 2</SelectItem>
                    <SelectItem value="3">Phase 3</SelectItem>
                    <SelectItem value="4">Phase 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Strategic Goals</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {strategicGoals.map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`goal-${goal}`}
                        checked={formValues.strategicGoals.some(g => g.goal === goal)}
                        onChange={(e) => handleStrategicGoalChange(goal, e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor={`goal-${goal}`} className="text-sm">
                        {goal.replace(/_/g, ' ')}
                      </label>
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
                        checked={formValues.geography.includes(region)}
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
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={createTournament.isPending}
              >
                {createTournament.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Tournament
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament: Tournament) => (
            <Card key={tournament.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{tournament.drugName}</CardTitle>
                  <Badge variant={tournament.status === 'completed' ? 'default' : 'secondary'}>
                    {tournament.status}
                  </Badge>
                </div>
                <CardDescription>{tournament.indication}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>
                        Round {tournament.currentRound} of {tournament.maxRounds}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 h-4 w-4" />
                      <span>
                        {format(new Date(tournament.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {tournament.strategicGoals.map((goal, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {goal.goal.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tournament.geography.map((region, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-accent">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  {tournament.lanes} concept lanes
                </div>
                <Button variant="ghost" onClick={() => viewTournament(tournament.id)}>
                  View Details
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-6 mb-4">
            <Beaker className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-medium mt-2">No tournaments found</h3>
          <p className="text-muted-foreground mt-1">
            Start a new tournament to begin generating study concepts
          </p>
          <Button 
            className="mt-4" 
            onClick={() => setIsNewTournamentOpen(true)}
          >
            Create Your First Tournament
          </Button>
        </div>
      )}
    </div>
  );
};

export default TournamentList;