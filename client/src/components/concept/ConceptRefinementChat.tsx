import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2, RefreshCw, ChevronDown, ChevronUp, Copy, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudyConcept } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from server
  const { data: chatHistory, isLoading: loadingHistory } = useQuery({
    queryKey: [`/api/study-concepts/${concept.id}/chat-messages`],
    enabled: !!concept.id
  });

  useEffect(() => {
    if (chatHistory && Array.isArray(chatHistory)) {
      const convertedMessages: ChatMessage[] = chatHistory.map((msg: any) => ({
        id: msg.id.toString(),
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        changes: msg.changes,
        cascadingAnalysis: msg.cascadingAnalysis
      }));
      
      // Add system message if no messages exist
      if (convertedMessages.length === 0) {
        const systemMessage: ChatMessage = {
          id: 'system-1',
          type: 'system',
          content: `I can help you refine "${concept.title}" using OpenAI's o3 reasoning model for comprehensive interconnected analysis. I'll dynamically identify ALL cascading effects across clinical design, timeline, financial, regulatory, and strategic dimensions. Any parameter change triggers intelligent analysis of related elements that should also be modified to maintain study coherence and optimization.`,
          timestamp: new Date()
        };
        setMessages([systemMessage]);
      } else {
        setMessages(convertedMessages);
      }
    }
  }, [chatHistory, concept.title]);

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
      const response = await fetch(`/api/study-concepts/${concept.id}/refine`, {
        method: 'POST',
        body: JSON.stringify({
          message: inputValue,
          currentConcept: concept
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refine concept');
      }

      const result = await response.json();
      const { explanation, changes, cascadingAnalysis, chatHistory } = result;

      // Refresh the chat history from server to get the latest messages
      if (chatHistory) {
        const convertedMessages: ChatMessage[] = chatHistory.map((msg: any) => ({
          id: msg.id.toString(),
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          changes: msg.changes,
          cascadingAnalysis: msg.cascadingAnalysis
        }));
        setMessages(convertedMessages);
      }
      
      // Invalidate the query to refresh chat history
      queryClient.invalidateQueries({ queryKey: [`/api/study-concepts/${concept.id}/chat-messages`] });

      // Show appropriate toast based on whether changes were made
      if (changes && changes.length > 0) {
        toast({
          title: "Analysis Complete",
          description: `Identified ${changes.length} optimization${changes.length > 1 ? 's' : ''} with cascading analysis.`
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "Provided guidance without suggesting modifications."
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const copyFormattedAnalysis = async (cascadingAnalysis: any) => {
    try {
      // Format the analysis with proper bullet points and structure
      const sections = [
        { key: 'timelineImpact', title: 'Timeline Impact', value: cascadingAnalysis.timelineImpact },
        { key: 'resourceImpact', title: 'Resource Impact', value: cascadingAnalysis.resourceImpact },
        { key: 'financialImpact', title: 'Financial Impact', value: cascadingAnalysis.financialImpact },
        { key: 'regulatoryImpact', title: 'Regulatory Impact', value: cascadingAnalysis.regulatoryImpact },
        { key: 'strategicImpact', title: 'Strategic Impact', value: cascadingAnalysis.strategicImpact }
      ].filter(section => section.value);

      const formattedText = sections.map(section => {
        const title = `${section.title}:`;
        
        // Enhanced formatting to handle various text patterns
        let content = section.value
          // Convert existing bullets to proper format
          .replace(/^• /gm, '• ') // Ensure bullets at start of line
          .replace(/^\s*-\s+/gm, '• ') // Convert dashes to bullets
          .replace(/^\s*\*\s+/gm, '• ') // Convert asterisks to bullets
          // Handle line breaks and indentation
          .split('\n')
          .map((line: string) => {
            if (line.trim() === '') return '';
            if (line.trim().startsWith('•')) {
              return `    ${line.trim()}`; // Indent bullet points
            } else {
              return `    ${line.trim()}`; // Indent regular lines
            }
          })
          .join('\n')
          .trim();
        
        return `${title}\n${content}`;
      }).join('\n\n');

      await navigator.clipboard.writeText(formattedText);
      toast({
        title: "Formatted Analysis Copied!",
        description: "Analysis copied with preserved formatting"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy formatted analysis",
        variant: "destructive"
      });
    }
  };

  const clearChatHistory = async () => {
    try {
      await fetch(`/api/study-concepts/${concept.id}/chat-messages`, {
        method: 'DELETE'
      });
      
      const systemMessage: ChatMessage = {
        id: 'system-new',
        type: 'system',
        content: `I can help you refine "${concept.title}" using OpenAI's o3 reasoning model for comprehensive interconnected analysis. I'll dynamically identify ALL cascading effects across clinical design, timeline, financial, regulatory, and strategic dimensions.`,
        timestamp: new Date()
      };
      setMessages([systemMessage]);
      
      queryClient.invalidateQueries({ queryKey: [`/api/study-concepts/${concept.id}/chat-messages`] });
      
      toast({
        title: "Chat Cleared",
        description: "Chat history has been cleared"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive"
      });
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
    if (typeof value === 'number' && value > 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    }
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const parentName = parent.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const childName = child.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return `${parentName} → ${childName}`;
    }
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const renderMessage = (message: ChatMessage) => {
    return (
      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4 group`}>
        <div className={`max-w-[85%] rounded-lg px-4 py-2 relative ${
          message.type === 'user' 
            ? 'bg-primary text-primary-foreground' 
            : message.type === 'system'
            ? 'bg-gray-100 text-gray-700 border border-gray-200'
            : 'bg-gray-50 text-gray-900 border border-gray-100'
        }`}>
          {/* Copy button for each message */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyToClipboard(message.content)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          <p className="text-sm whitespace-pre-wrap pr-8">{message.content}</p>
          
          {message.changes && message.changes.length > 0 && (
            <div className="mt-3 space-y-2">
              <Separator />
              <div className="text-xs font-medium text-gray-600">Changes Made:</div>
              {message.changes.map((change, index) => (
                <div key={index} className="bg-white rounded p-2 border text-xs">
                  <div className="font-medium text-primary mb-1">
                    {formatFieldName(change.field)}
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
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        🔗 Cascading Effect: {change.impactArea || 'general'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => copyToClipboard(`${formatFieldName(change.field)}: ${formatChangeValue(change.oldValue)} → ${formatChangeValue(change.newValue)}`)}
                        title="Copy change details"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-auto"
                  onClick={() => copyFormattedAnalysis(message.cascadingAnalysis!)}
                  title="Copy formatted analysis"
                >
                  <Copy className="h-3 w-3" />
                </Button>
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

  const chatWidth = isExpanded ? 'w-[800px]' : 'w-[600px]';
  const chatHeight = isExpanded ? 'h-[800px]' : 'h-[750px]';

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
        <Card className={`${chatWidth} ${chatHeight} shadow-xl border-2 flex flex-col`}>
          {/* Header */}
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <CardTitle className="text-sm">Refine Study Concept</CardTitle>
                {loadingHistory && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                  title={isExpanded ? "Minimize" : "Maximize"}
                >
                  {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChatHistory}
                  className="h-6 w-6 p-0"
                  title="Clear chat history"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Chat Messages */}
          <CardContent className="flex-1 flex flex-col p-3 min-h-0">
            <ScrollArea className="flex-1 pr-3">
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </ScrollArea>
            
            {/* Input */}
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