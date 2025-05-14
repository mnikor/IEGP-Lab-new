import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EvidenceUploader } from "@/components/shared/EvidenceUploader";
import { StudyConcept, EvidenceFile, GenerateConceptRequest } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConceptFormProps {
  onGenerateSuccess: (concepts: StudyConcept[]) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

const formSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoal: z.enum(["expand_label", "defend_share", "accelerate_uptake", "real_world_evidence"], {
    required_error: "Please select a strategic goal",
  }),
  studyPhasePref: z.enum(["I", "II", "III", "IV", "any"], {
    required_error: "Please select a study phase preference",
  }),
  targetSubpopulation: z.string().optional(),
  budgetCeilingEur: z.number().optional().or(
    z.string().transform(val => val === "" ? undefined : Number(val))
  ).refine(val => val === undefined || (val !== undefined && !isNaN(val) && val > 0), {
    message: "Budget ceiling must be a positive number",
  }),
  timelineCeilingMonths: z.number().optional().or(
    z.string().transform(val => val === "" ? undefined : Number(val))
  ).refine(val => val === undefined || (val !== undefined && !isNaN(val) && val > 0), {
    message: "Timeline ceiling must be a positive number",
  }),
  salesImpactThreshold: z.number().optional().or(
    z.string().transform(val => val === "" ? undefined : Number(val))
  ).refine(val => val === undefined || (val !== undefined && !isNaN(val) && val > 0), {
    message: "Sales impact threshold must be a positive number",
  }),
  anticipatedFpiDate: z.string().optional(),
  globalLoeDate: z.string().optional(),
  hasPatentExtensionPotential: z.boolean().optional().default(false),
});

const ConceptForm: React.FC<ConceptFormProps> = ({ 
  onGenerateSuccess, 
  isGenerating,
  setIsGenerating 
}) => {
  const { toast } = useToast();
  const [selectedGeographies, setSelectedGeographies] = useState<string[]>(["US", "EU"]);
  const [comparatorDrugs, setComparatorDrugs] = useState<string[]>(["Standard of Care"]);
  const [newComparatorDrug, setNewComparatorDrug] = useState<string>("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [regionalLoeDates, setRegionalLoeDates] = useState<{region: string; date: string}[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drugName: "",
      indication: "",
      strategicGoal: undefined,
      studyPhasePref: "any",
      targetSubpopulation: "",
      budgetCeilingEur: undefined,
      timelineCeilingMonths: undefined,
      salesImpactThreshold: undefined,
      anticipatedFpiDate: "",
      globalLoeDate: "",
      hasPatentExtensionPotential: false,
    },
  });

  const addComparatorDrug = () => {
    if (newComparatorDrug.trim() && !comparatorDrugs.includes(newComparatorDrug.trim())) {
      setComparatorDrugs([...comparatorDrugs, newComparatorDrug.trim()]);
      setNewComparatorDrug("");
    }
  };

  const removeComparatorDrug = (drug: string) => {
    setComparatorDrugs(comparatorDrugs.filter(d => d !== drug));
  };

  const addGeography = (geo: string) => {
    if (!selectedGeographies.includes(geo)) {
      setSelectedGeographies([...selectedGeographies, geo]);
    }
  };

  const removeGeography = (geo: string) => {
    setSelectedGeographies(selectedGeographies.filter(g => g !== geo));
  };

  const handleEvidenceUpload = (files: EvidenceFile[]) => {
    setEvidenceFiles([...evidenceFiles, ...files]);
  };

  const removeEvidenceFile = (fileName: string) => {
    setEvidenceFiles(evidenceFiles.filter(file => file.name !== fileName));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedGeographies.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one geography",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      // Prepare regional LOE dates based on selected geographies if global LOE date is set
      let processedRegionalLoeDates;
      if (values.globalLoeDate && values.globalLoeDate.trim() !== '') {
        // Use either user-defined regional dates or create them based on global date
        if (regionalLoeDates.length > 0) {
          processedRegionalLoeDates = regionalLoeDates;
        } else {
          // Create region-specific LOE dates based on the global date
          processedRegionalLoeDates = selectedGeographies.map(region => {
            // Create a new date object from the global date
            // We can safely use globalLoeDate now as we've verified it exists and is not empty
            const date = new Date(values.globalLoeDate as string);
            
            // Slightly adjust the date based on region for realism
            // (some regions may have different patent expiration dates)
            if (region === "US") {
              // US patents may have slightly longer terms in some cases
              date.setMonth(date.getMonth() + 3);
            } else if (region === "EU") {
              // EU might have different patent terms
              date.setMonth(date.getMonth() - 2);
            } else if (region === "JP") {
              // Japan may have its own timeline
              date.setMonth(date.getMonth() + 1);
            }
            
            return {
              region,
              date: date.toISOString().split('T')[0]
            };
          });
        }
      }
      
      // Log the date value before sending
      console.log("Form anticipatedFpiDate value:", values.anticipatedFpiDate);
      
      // Normalize the date format - ensure it's in ISO format
      let formattedFpiDate = values.anticipatedFpiDate;
      if (formattedFpiDate && formattedFpiDate.trim() !== '') {
        // Create a Date object and get the ISO date (YYYY-MM-DD)
        try {
          const dateObj = new Date(formattedFpiDate);
          if (!isNaN(dateObj.getTime())) {
            formattedFpiDate = dateObj.toISOString().split('T')[0];
            console.log("Normalized FPI date format:", formattedFpiDate);
          }
        } catch (e) {
          console.error("Error formatting FPI date:", e);
        }
      }
      
      const requestData: GenerateConceptRequest = {
        ...values,
        geography: selectedGeographies,
        comparatorDrugs: comparatorDrugs.length > 0 ? comparatorDrugs : undefined,
        currentEvidenceRefs: evidenceFiles.map(f => f.name),
        regionalLoeDates: values.globalLoeDate ? processedRegionalLoeDates : undefined,
        anticipatedFpiDate: formattedFpiDate,
      };
      
      // Log the final request data
      console.log("Final request data:", requestData);

      const response = await apiRequest("POST", "/api/study-concepts/generate", requestData);
      const conceptsData = await response.json();

      toast({
        title: "Concepts Generated",
        description: `Successfully generated ${conceptsData.length} study concepts.`,
      });

      onGenerateSuccess(conceptsData);
    } catch (error) {
      console.error("Failed to generate concepts:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const geographyOptions = [
    { code: "US", name: "United States" },
    { code: "EU", name: "European Union" },
    { code: "JP", name: "Japan" },
    { code: "CN", name: "China" },
    { code: "UK", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "BR", name: "Brazil" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Study Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="drugName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drug Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Pembrolizumab" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="indication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indication</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Non-small cell lung cancer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="strategicGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategic Goal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a strategic goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expand_label">Expand Label</SelectItem>
                          <SelectItem value="defend_share">Defend Market Share</SelectItem>
                          <SelectItem value="accelerate_uptake">Accelerate Uptake</SelectItem>
                          <SelectItem value="real_world_evidence">Real World Evidence</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Geography</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-1 mb-2">
                    {selectedGeographies.map(geo => (
                      <Badge key={geo} variant="secondary" className="bg-blue-100 text-primary hover:bg-blue-200">
                        {geo}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 ml-1 text-blue-500 hover:text-blue-700 hover:bg-transparent"
                          onClick={() => removeGeography(geo)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    <Select onValueChange={(value) => addGeography(value)}>
                      <SelectTrigger className="w-auto border-dashed">
                        <span className="text-xs">+ Add</span>
                      </SelectTrigger>
                      <SelectContent>
                        {geographyOptions
                          .filter(g => !selectedGeographies.includes(g.code))
                          .map(geo => (
                            <SelectItem key={geo.code} value={geo.code}>
                              {geo.name} ({geo.code})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedGeographies.length === 0 && (
                    <p className="text-sm text-destructive">Please select at least one geography</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="studyPhasePref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study Phase Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a phase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">Any Phase</SelectItem>
                            <SelectItem value="I">Phase I</SelectItem>
                            <SelectItem value="II">Phase II</SelectItem>
                            <SelectItem value="III">Phase III</SelectItem>
                            <SelectItem value="IV">Phase IV</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetSubpopulation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Subpopulation (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Elderly patients with comorbidities" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormLabel>Comparator Drugs (Optional)</FormLabel>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={newComparatorDrug}
                      onChange={(e) => setNewComparatorDrug(e.target.value)}
                      placeholder="Add a comparator drug"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addComparatorDrug();
                        }
                      }}
                    />
                    <Button type="button" onClick={addComparatorDrug}>
                      Add
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comparatorDrugs.map(drug => (
                      <Badge key={drug} variant="secondary" className="bg-blue-100 text-primary hover:bg-blue-200">
                        {drug}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 ml-1 text-blue-500 hover:text-blue-700 hover:bg-transparent"
                          onClick={() => removeComparatorDrug(drug)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="budgetCeilingEur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Ceiling (EUR)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 2000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timelineCeilingMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeline Ceiling (Months)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 24" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salesImpactThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Impact Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 10000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Study Timeline Section */}
                <div className="mt-6 border-t pt-4 border-neutral-light">
                  <h3 className="text-sm font-medium mb-4">Study Timeline Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="anticipatedFpiDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anticipated FPI Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-neutral-medium mt-1">
                            When do you expect First Patient In (FPI)? If not provided, defaults to 12 months from now.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* LOE (Loss of Exclusivity) Section */}
                <div className="mt-6 border-t pt-4 border-neutral-light">
                  <h3 className="text-sm font-medium mb-4">Patent Exclusivity Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="globalLoeDate"
                      render={({ field }) => {
                        // Add debug logging to trace the LOE date value
                        console.log("Form field globalLoeDate value:", field.value);
                        return (
                          <FormItem>
                            <FormLabel>Global LOE Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} onChange={(e) => {
                                field.onChange(e);
                                // Add debug logging for date changes
                                console.log("LOE date changed to:", e.target.value);
                              }} />
                            </FormControl>
                            <p className="text-xs text-neutral-medium mt-1">
                              When will the drug lose patent exclusivity?
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hasPatentExtensionPotential"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-primary border-neutral-medium rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Patent Extension Potential
                            </FormLabel>
                            <p className="text-xs text-neutral-medium">
                              Could this study potentially extend patent exclusivity?
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-light pt-4 flex justify-end">
                  <Button type="button" variant="outline" className="mr-3">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Concepts"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current Evidence References (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <EvidenceUploader 
              onFilesSelected={handleEvidenceUpload} 
              existingFiles={evidenceFiles}
              onFileRemove={removeEvidenceFile}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-medium mb-3">
              The concept generator uses AI to create evidence-based clinical study designs aligned with your strategic goals.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  1
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Enter basic study parameters</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  2
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Our system searches latest evidence using Perplexity API</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  3
                </div>
                <p className="ml-3 text-sm text-neutral-medium">LLM analyzes findings & generates concepts</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  4
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Each concept is scored for feasibility and impact</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  5
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Export complete reports for decision-making</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recently Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* This would be populated from API data */}
              <a href="#" className="block p-3 border border-neutral-light rounded-md hover:bg-neutral-lightest">
                <h3 className="text-sm font-medium text-primary">Pembrolizumab in NSCLC with Brain Metastases</h3>
                <p className="text-xs text-neutral-medium mt-1">Generated on May 12, 2023</p>
              </a>
              <a href="#" className="block p-3 border border-neutral-light rounded-md hover:bg-neutral-lightest">
                <h3 className="text-sm font-medium text-primary">Combination Therapy: JAK Inhibitors + Anti-TNF</h3>
                <p className="text-xs text-neutral-medium mt-1">Generated on April 27, 2023</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConceptForm;
