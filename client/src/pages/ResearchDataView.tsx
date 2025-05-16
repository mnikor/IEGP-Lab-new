import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LucideArrowLeft, LucideLoader } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import axios from 'axios';

const ResearchDataView = () => {
  const params = useParams();
  const [, navigate] = useLocation();
  const tournamentId = parseInt(params.id || '0');
  const [researchData, setResearchData] = useState<{ content: string, citations: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { tournament } = useTournament();
  
  useEffect(() => {
    const fetchResearchData = async () => {
      try {
        setIsLoading(true);
        // Fetch research data related to this tournament
        const response = await axios.get(`/api/tournaments/${tournamentId}/research-data`);
        setResearchData(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch research data:', err);
        setError('Failed to load research data. Please try again.');
        setIsLoading(false);
      }
    };
    
    if (tournamentId) {
      fetchResearchData();
    }
  }, [tournamentId]);
  
  const processMarkdown = (text: string) => {
    // Basic markdown processing for section headers
    return text
      .replace(/## (.*?)\n/g, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/\n\n/g, '<br/><br/>');
  };
  
  const formatResearchContent = (content: string) => {
    // Split content into sections based on search rounds
    const sections = content.split('## Search Round');
    
    if (sections.length <= 1) {
      return <div dangerouslySetInnerHTML={{ __html: processMarkdown(content) }} />;
    }
    
    // Extract section titles and content for tabs
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Evidence</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory Status</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
          <TabsTrigger value="recent">Recent Trials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-bold mb-4">Research Overview</h2>
            <p>This research was conducted using Perplexity AI to gather evidence about {tournament?.drugName} for {tournament?.indication}. 
            The search was focused on several key areas:</p>
            <ul className="list-disc pl-6 mt-3 mb-3">
              <li>Clinical evidence and current studies</li>
              <li>Regulatory status and approvals</li>
              <li>Competitive landscape and alternatives</li>
              <li>Recent clinical trials and emerging evidence</li>
            </ul>
            <p>This data was used to inform the generation of study ideas in the tournament.</p>
            
            <h2 className="text-xl font-bold mt-6 mb-3">Citations</h2>
            <div className="bg-muted/30 p-4 rounded-md text-sm">
              {researchData?.citations && researchData.citations.map((citation, index) => (
                <div key={index} className="mb-2">
                  {index + 1}. <a href={citation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{citation}</a>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="clinical">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-bold mb-4">Clinical Evidence</h2>
            <div dangerouslySetInnerHTML={{ 
              __html: processMarkdown(sections[1] ? sections[1].split('Clinical Evidence')[1] || '' : '') 
            }} />
          </div>
        </TabsContent>
        
        <TabsContent value="regulatory">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-bold mb-4">Regulatory Status</h2>
            <div dangerouslySetInnerHTML={{ 
              __html: processMarkdown(sections[2] ? sections[2].split('Regulatory Status')[1] || '' : '') 
            }} />
          </div>
        </TabsContent>
        
        <TabsContent value="competitive">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-bold mb-4">Competitive Landscape</h2>
            <div dangerouslySetInnerHTML={{ 
              __html: processMarkdown(sections[3] ? sections[3].split('Competitive Landscape')[1] || '' : '') 
            }} />
          </div>
        </TabsContent>
        
        <TabsContent value="recent">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-bold mb-4">Recent Trials</h2>
            <div dangerouslySetInnerHTML={{ 
              __html: processMarkdown(sections[4] ? sections[4].split('Recent Trials')[1] || '' : '') 
            }} />
          </div>
        </TabsContent>
      </Tabs>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LucideLoader className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading research data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Button onClick={() => navigate(`/tournaments/${tournamentId}`)} className="mb-4">
          <LucideArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem loading the research data</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <Button onClick={() => navigate(`/tournaments/${tournamentId}`)} className="mb-4">
        <LucideArrowLeft className="w-4 h-4 mr-2" />
        Back to Tournament
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Research Data for {tournament?.drugName} in {tournament?.indication}</CardTitle>
          <CardDescription>
            This data was collected via Perplexity Search API to inform the tournament's idea generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {researchData?.content ? (
            formatResearchContent(researchData.content)
          ) : (
            <p>No research data available for this tournament</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearchDataView;