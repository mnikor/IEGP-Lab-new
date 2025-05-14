import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ValidationResults, StrategicGoal, strategicGoalLabels } from "@/lib/types";
import { Upload, FileText, AlertCircle, X, UploadCloud } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SynopsisUploaderProps {
  onValidationSuccess: (results: ValidationResults) => void;
  isValidating: boolean;
  setIsValidating: (isValidating: boolean) => void;
}

const formSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoals: z.array(z.enum(["expand_label", "defend_share", "accelerate_uptake", "real_world_evidence"])).min(1, "Please select at least one strategic goal"),
  studyIdeaText: z.string().optional(),
  additionalContext: z.string().optional(),
  
  // Additional fields from concept generation
  geography: z.array(z.string()).min(1, "At least one geography is required").optional(),
  studyPhasePref: z.enum(["I", "II", "III", "IV", "any"], {
    required_error: "Please select a study phase",
  }).optional(),
  targetSubpopulation: z.string().optional(),
  comparatorDrugs: z.array(z.string()).optional(),
  budgetCeilingEur: z.coerce.number().positive().optional(),
  timelineCeilingMonths: z.coerce.number().positive().optional(),
  salesImpactThreshold: z.coerce.number().positive().optional(),
  
  // Timeline and LOE fields
  anticipatedFpiDate: z.string().optional(),
  globalLoeDate: z.string().optional(),
  hasPatentExtensionPotential: z.boolean().optional().default(false),
});

const SynopsisUploader: React.FC<SynopsisUploaderProps> = ({ 
  onValidationSuccess, 
  isValidating,
  setIsValidating 
}) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [inputMethod, setInputMethod] = useState<string>("file");
  
  // Geography handling
  const [selectedGeographies, setSelectedGeographies] = useState<string[]>(["US", "EU"]);
  const [selectedStrategicGoals, setSelectedStrategicGoals] = useState<StrategicGoal[]>([]);
  const [comparatorDrugs, setComparatorDrugs] = useState<string[]>(["Standard of Care"]);
  const [newComparatorDrug, setNewComparatorDrug] = useState<string>("");
  
  // Strategic goals handling
  const addStrategicGoal = (goal: StrategicGoal) => {
    if (!selectedStrategicGoals.includes(goal)) {
      setSelectedStrategicGoals([...selectedStrategicGoals, goal]);
    }
  };
  
  const removeStrategicGoal = (goal: StrategicGoal) => {
    setSelectedStrategicGoals(selectedStrategicGoals.filter(g => g !== goal));
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drugName: "",
      indication: "",
      strategicGoals: [],
      studyIdeaText: "",
      additionalContext: "",
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
  
  // Geography handling functions
  const addGeography = (geo: string) => {
    if (!selectedGeographies.includes(geo)) {
      setSelectedGeographies([...selectedGeographies, geo]);
    }
  };

  const removeGeography = (geo: string) => {
    setSelectedGeographies(selectedGeographies.filter(g => g !== geo));
  };
  
  // Comparator drug handling functions
  const addComparatorDrug = () => {
    if (newComparatorDrug.trim() && !comparatorDrugs.includes(newComparatorDrug.trim())) {
      setComparatorDrugs([...comparatorDrugs, newComparatorDrug.trim()]);
      setNewComparatorDrug("");
    }
  };
  
  const removeComparatorDrug = (drug: string) => {
    setComparatorDrugs(comparatorDrugs.filter(d => d !== drug));
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Check if the file is a valid type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOCX, DOC, PPTX, or PPT file.",
        variant: "destructive",
      });
      return;
    }
    
    // Set the selected file
    setSelectedFile(file);
    
    toast({
      title: "File Selected",
      description: `${file.name} is ready for validation.`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // If using file upload method, check for file
    if (inputMethod === "file" && !selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please upload a synopsis document to validate.",
        variant: "destructive",
      });
      return;
    }

    // If using text input method, check for text
    if (inputMethod === "text" && !values.studyIdeaText?.trim()) {
      toast({
        title: "No Study Idea Provided",
        description: "Please enter your study idea text to validate.",
        variant: "destructive",
      });
      return;
    }
    
    // Check for geography selection
    if (selectedGeographies.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one geography",
        variant: "destructive",
      });
      return;
    }
    
    // Check for strategic goals selection
    if (selectedStrategicGoals.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one strategic goal",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsValidating(true);
      
      // Format dates properly
      let formattedFpiDate = values.anticipatedFpiDate;
      if (formattedFpiDate && formattedFpiDate.trim() !== '') {
        try {
          const dateObj = new Date(formattedFpiDate);
          if (!isNaN(dateObj.getTime())) {
            formattedFpiDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error("Error formatting FPI date:", e);
        }
      }
      
      // Ensure LOE date is in correct format
      const formattedGlobalLoeDate = values.globalLoeDate ? 
        new Date(values.globalLoeDate).toISOString().split('T')[0] : undefined;

      // Create a FormData object to send the data
      const formData = new FormData();
      
      // Only append file if using file input method and a file is selected
      if (inputMethod === "file" && selectedFile) {
        formData.append('file', selectedFile);
      }
      
      // Always append basic form fields
      formData.append('drugName', values.drugName);
      formData.append('indication', values.indication);
      
      // Append strategic goals as an array
      selectedStrategicGoals.forEach(goal => {
        formData.append('strategicGoals[]', goal);
      });
      
      // For text input method, ensure studyIdeaText is sent
      if (inputMethod === "text") {
        formData.append('studyIdeaText', values.studyIdeaText || '');
      } else {
        formData.append('studyIdeaText', '');
      }
      
      // Send additional context
      formData.append('additionalContext', values.additionalContext || '');
      
      // Append geographies
      selectedGeographies.forEach(geo => {
        formData.append('geography[]', geo);
      });
      
      // Append study phase preference
      formData.append('studyPhasePref', values.studyPhasePref || 'any');
      
      // Append target subpopulation if provided
      if (values.targetSubpopulation) {
        formData.append('targetSubpopulation', values.targetSubpopulation);
      }
      
      // Append comparator drugs
      comparatorDrugs.forEach(drug => {
        formData.append('comparatorDrugs[]', drug);
      });
      
      // Append budget constraints if provided
      if (values.budgetCeilingEur) {
        formData.append('budgetCeilingEur', values.budgetCeilingEur.toString());
      }
      
      if (values.timelineCeilingMonths) {
        formData.append('timelineCeilingMonths', values.timelineCeilingMonths.toString());
      }
      
      if (values.salesImpactThreshold) {
        formData.append('salesImpactThreshold', values.salesImpactThreshold.toString());
      }
      
      // Append timeline and LOE information
      if (formattedFpiDate) {
        formData.append('anticipatedFpiDate', formattedFpiDate);
      }
      
      if (formattedGlobalLoeDate) {
        formData.append('globalLoeDate', formattedGlobalLoeDate);
      }
      
      formData.append('hasPatentExtensionPotential', values.hasPatentExtensionPotential ? 'true' : 'false');

      // Make the API call
      const response = await fetch('/api/synopsis-validations/validate', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const validationResults = await response.json();

      toast({
        title: "Validation Complete",
        description: "Your synopsis has been successfully validated.",
      });

      onValidationSuccess(validationResults);
    } catch (error) {
      console.error("Failed to validate synopsis:", error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Study Synopsis Validation</CardTitle>
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

                <div>
                  <FormLabel>Strategic Goals</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-1 mb-2">
                    {selectedStrategicGoals.map(goal => (
                      <Badge key={goal} variant="secondary" className="bg-blue-100 text-primary hover:bg-blue-200">
                        {strategicGoalLabels[goal]}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 ml-1 text-blue-500 hover:text-blue-700 hover:bg-transparent"
                          onClick={() => removeStrategicGoal(goal)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    <Select 
                      onValueChange={(value) => addStrategicGoal(value as StrategicGoal)}
                      value=""
                    >
                      <SelectTrigger className="w-auto border-dashed">
                        <span className="text-xs">+ Add</span>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(strategicGoalLabels) as StrategicGoal[])
                          .filter(goal => !selectedStrategicGoals.includes(goal))
                          .map(goal => (
                            <SelectItem key={goal} value={goal}>
                              {strategicGoalLabels[goal]}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedStrategicGoals.length === 0 && (
                    <p className="text-sm text-destructive">Please select at least one strategic goal</p>
                  )}
                </div>
                
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
                        {[
                          { code: "US", name: "United States" },
                          { code: "EU", name: "European Union" },
                          { code: "JP", name: "Japan" },
                          { code: "CN", name: "China" },
                          { code: "UK", name: "United Kingdom" },
                          { code: "CA", name: "Canada" },
                          { code: "AU", name: "Australia" },
                          { code: "BR", name: "Brazil" },
                        ]
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Global LOE Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <p className="text-xs text-neutral-medium mt-1">
                            When will the drug lose patent exclusivity?
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
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

                <Tabs value={inputMethod} onValueChange={setInputMethod} className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Upload File</TabsTrigger>
                    <TabsTrigger value="text">Enter Text</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="file" className="mt-4">
                    <div>
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center ${
                          dragActive ? "border-primary bg-blue-50" : "border-neutral-light"
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <Upload className="mx-auto h-12 w-12 text-neutral-medium" />
                        <h3 className="mt-2 text-sm font-medium text-neutral-dark">
                          {selectedFile ? selectedFile.name : "Drop your synopsis file here"}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-medium">
                          or{" "}
                          <label className="text-primary font-medium cursor-pointer">
                            browse
                            <input
                              type="file"
                              className="hidden"
                              onChange={handleFileInput}
                              accept=".pdf,.doc,.docx,.ppt,.pptx"
                            />
                          </label>
                        </p>
                        <p className="mt-2 text-xs text-neutral-medium">
                          Supports PDF, DOCX, DOC, PPTX, PPT files
                        </p>
                      </div>
                    </div>

                    {selectedFile && (
                      <Alert className="mt-4">
                        <FileText className="h-4 w-4" />
                        <AlertTitle>File Selected</AlertTitle>
                        <AlertDescription>
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="studyIdeaText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Study Idea Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your study idea or paste your synopsis text here..." 
                              className="h-40 resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="additionalContext"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Context</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Regulatory approval is expected on date ..., market access it expected in key markets on ....date" 
                              className="h-24 resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <div className="border-t border-neutral-light pt-4 flex justify-end">
                  <Button type="button" variant="outline" className="mr-3">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isValidating}>
                    {isValidating ? "Validating..." : "Validate Synopsis"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Validation Process</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-medium mb-4">
              The synopsis validator analyzes your study protocol against best practices and current evidence to identify areas for improvement.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  1
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Upload your synopsis document</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  2
                </div>
                <p className="ml-3 text-sm text-neutral-medium">AI extracts PICO framework and key elements</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  3
                </div>
                <p className="ml-3 text-sm text-neutral-medium">System benchmarks against current evidence</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  4
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Identifies risk factors and improvement areas</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  5
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Provides revised economics and SWOT analysis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>File Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-neutral-medium">
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                Supported formats: PDF, DOCX, DOC, PPTX, PPT
              </li>
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                Maximum file size: 10MB
              </li>
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                Study synopsis should include PICO elements
              </li>
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                Ensure document is not password protected
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SynopsisUploader;
