import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudyConcept } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  changes?: ConceptChange[];
  cascadingAnalysis?: {
    timelineImpact?: string;
    resourceImpact?: string;
    financialImpact?: string;
    regulatoryImpact?: string;
    strategicImpact?: string;
  };
}

interface ConceptChange {
  field: string;
  oldValue: any;
  newValue: any;
  impact: {
    mcdaScores?: Partial<{
      scientificValidity: number;
      clinicalImpact: number;
      commercialValue: number;
      feasibility: number;
      overall: number;
    }>;
    feasibilityData?: {
      estimatedCost?: number;
      timeline?: number;
      recruitmentRate?: number;
      completionRisk?: number;
    };
  };
  cascadingEffect?: boolean;
  impactArea?: string;
}

interface ConceptRefinementChatProps {
  concept: StudyConcept;
  onConceptUpdate: (updatedConcept: StudyConcept) => void;
}

const ConceptRefinementChat: React.FC<ConceptRefinementChatProps> = ({
  concept,
  onConceptUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: `I can help you refine "${concept.title}" using OpenAI's o3 reasoning model for comprehensive interconnected analysis. I'll dynamically identify ALL cascading effects across clinical design, timeline, financial, regulatory, and strategic dimensions. Any parameter change triggers intelligent analysis of related elements that should also be modified to maintain study coherence and optimization.`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.type !== 'system')
        .slice(-5) // Only send last 5 messages for context
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      const response = await fetch(`/api/study-concepts/${concept.id}/refine`, {
        method: 'POST',
        body: JSON.stringify({
          message: inputValue,
          currentConcept: concept,
          conversationHistory: conversationHistory
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refine concept');
      }

      const result = await response.json();
      const { updatedConcept, explanation, changes, cascadingAnalysis } = result;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: explanation,
        timestamp: new Date(),
        changes: changes,
        cascadingAnalysis: cascadingAnalysis
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update the concept in the parent component
      if (updatedConcept && changes && changes.length > 0) {
        // Only call update if there were actual changes made
        onConceptUpdate(updatedConcept);
      }

      // Show appropriate toast based on whether changes were made
      if (changes && changes.length > 0) {
        toast({
          title: "Concept Updated",
          description: `Updated ${changes.length} parameter${changes.length > 1 ? 's' : ''} successfully.`
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "Provided guidance without modifying the study concept."
        });
      }

    } catch (error) {
      console.error('Error refining concept:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I encountered an error while processing your request. Please try again or rephrase your modification.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to process your refinement request.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatChangeValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderMessage = (message: ChatMessage) => {
    return (
      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
          message.type === 'user' 
            ? 'bg-primary text-primary-foreground' 
            : message.type === 'system'
            ? 'bg-gray-100 text-gray-700 border border-gray-200'
            : 'bg-gray-50 text-gray-900 border border-gray-100'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {message.changes && message.changes.length > 0 && (
            <div className="mt-3 space-y-2">
              <Separator />
              <div className="text-xs font-medium text-gray-600">Changes Made:</div>
              {message.changes.map((change, index) => (
                <div key={index} className="bg-white rounded p-2 border text-xs">
                  <div className="font-medium text-primary mb-1">
                    {change.field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">From:</span>
                      <div className="font-mono text-xs bg-gray-50 p-1 rounded mt-1">
                        {formatChangeValue(change.oldValue)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">To:</span>
                      <div className="font-mono text-xs bg-green-50 p-1 rounded mt-1">
                        {formatChangeValue(change.newValue)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Cascading Effect Indicator */}
                  {change.cascadingEffect && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        🔗 Cascading Effect: {change.impactArea || 'general'}
                      </Badge>
                    </div>
                  )}
                  
                  {change.impact.mcdaScores && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">MCDA Score Impact:</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(change.impact.mcdaScores).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}: {value?.toFixed(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cascading Analysis Display */}
          {message.cascadingAnalysis && (
            <div className="mt-3 space-y-2">
              <Separator />
              <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <span className="text-blue-600">🧠</span> O3 Reasoning Analysis:
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs space-y-2">
                {message.cascadingAnalysis.timelineImpact && (
                  <div>
                    <span className="font-medium text-blue-800">Timeline Impact:</span>
                    <p className="text-blue-700 mt-1">{message.cascadingAnalysis.timelineImpact}</p>
                  </div>
                )}
                {message.cascadingAnalysis.resourceImpact && (
                  <div>
                    <span className="font-medium text-green-800">Resource Impact:</span>
                    <p className="text-green-700 mt-1">{message.cascadingAnalysis.resourceImpact}</p>
                  </div>
                )}
                {message.cascadingAnalysis.financialImpact && (
                  <div>
                    <span className="font-medium text-emerald-800">Financial Impact:</span>
                    <p className="text-emerald-700 mt-1">{message.cascadingAnalysis.financialImpact}</p>
                  </div>
                )}
                {message.cascadingAnalysis.regulatoryImpact && (
                  <div>
                    <span className="font-medium text-purple-800">Regulatory Impact:</span>
                    <p className="text-purple-700 mt-1">{message.cascadingAnalysis.regulatoryImpact}</p>
                  </div>
                )}
                {message.cascadingAnalysis.strategicImpact && (
                  <div>
                    <span className="font-medium text-orange-800">Strategic Impact:</span>
                    <p className="text-orange-700 mt-1">{message.cascadingAnalysis.strategicImpact}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="text-xs opacity-70 mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-12 w-12 shadow-lg"
          size="sm"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
      
      {isOpen && (
        <Card className="w-96 h-[500px] shadow-xl border-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Refine Study Concept
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="h-full flex flex-col p-3">
            <ScrollArea className="flex-1 pr-3">
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </ScrollArea>
            
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe changes you'd like to make..."
                className="text-sm"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                size="sm"
                className="px-3"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConceptRefinementChat;