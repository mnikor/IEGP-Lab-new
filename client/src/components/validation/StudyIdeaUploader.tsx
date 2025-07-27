import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

interface StudyIdeaUploaderProps {
  onValidationSuccess: (results: ValidationResults) => void;
  isValidating: boolean;
  setIsValidating: (isValidating: boolean) => void;
  onStudyParamsCapture?: (params: any) => void;
}

const formSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoals: z.array(z.enum([
    "expand_label", 
    "defend_market_share", 
    "accelerate_uptake", 
    "facilitate_market_access", 
    "generate_real_world_evidence", 
    "optimise_dosing", 
    "validate_biomarker", 
    "manage_safety_risk", 
    "extend_lifecycle_combinations", 
    "secure_initial_approval",
    "demonstrate_poc",
    "other"
  ])).min(1, "Please select at least one strategic goal"),
  otherStrategicGoalText: z.string().optional(),
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
  
  // AI model selection
  aiModel: z.enum(["gpt-4o", "gpt-4-turbo", "o3-mini", "o3"]).default("gpt-4o"),
});

const StudyIdeaUploader: React.FC<StudyIdeaUploaderProps> = ({ 
  onValidationSuccess, 
  isValidating,
  setIsValidating,
  onStudyParamsCapture 
}) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [inputMethod, setInputMethod] = useState<string>("file");
  
  // Geography handling
  const [selectedGeographies, setSelectedGeographies] = useState<string[]>(["US", "EU"]);
  const [selectedStrategicGoals, setSelectedStrategicGoals] = useState<StrategicGoal[]>([]);
  const [otherStrategicGoalText, setOtherStrategicGoalText] = useState<string>("");
  const [comparatorDrugs, setComparatorDrugs] = useState<string[]>(["Standard of Care"]);
  const [newComparatorDrug, setNewComparatorDrug] = useState<string>("");
  
  // Strategic goals handling
  const addStrategicGoal = (goal: StrategicGoal) => {
    if (!selectedStrategicGoals.includes(goal)) {
      const updatedGoals = [...selectedStrategicGoals, goal];
      setSelectedStrategicGoals(updatedGoals);
      
      // Update the form value and trigger validation
      form.setValue('strategicGoals', updatedGoals as any);
      form.trigger('strategicGoals');
    }
  };
  
  const removeStrategicGoal = (goal: StrategicGoal) => {
    const updatedGoals = selectedStrategicGoals.filter(g => g !== goal);
    setSelectedStrategicGoals(updatedGoals);
    
    // Update the form value and trigger validation
    form.setValue('strategicGoals', updatedGoals as any);
    form.trigger('strategicGoals');
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
      aiModel: "gpt-4o",
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
    try {
      console.log("FORM SUBMIT TRIGGERED");
      console.log("Form values:", values);
      console.log("Form strategicGoals:", values.strategicGoals);
      console.log("Selected strategic goals:", selectedStrategicGoals);
      
      // If using file upload method, check for file
      if (inputMethod === "file" && !selectedFile) {
        toast({
          title: "No File Selected",
          description: "Please upload a study idea document to validate.",
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
      
      // For the form to validate, these values should be in sync
      if (values.strategicGoals.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one strategic goal",
          variant: "destructive",
        });
        return;
      }
      
      // Check for "other" strategic goal text if "other" is selected
      if (selectedStrategicGoals.includes("other") && !otherStrategicGoalText.trim()) {
        toast({
          title: "Validation Error",
          description: "Please specify your custom strategic goal",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Error in form pre-submission validation:", error);
      toast({
        title: "Form Error",
        description: "An error occurred while validating the form",
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
      // Make sure we use the values from the form, which should be synced with state
      const goalsToSend = values.strategicGoals.length > 0 ? values.strategicGoals : selectedStrategicGoals;
      console.log("Sending strategic goals:", goalsToSend);
      
      goalsToSend.forEach(goal => {
        formData.append('strategicGoals[]', goal);
      });
      
      // If "other" strategic goal is selected, append the text
      if (selectedStrategicGoals.includes("other")) {
        formData.append('otherStrategicGoalText', otherStrategicGoalText);
      }
      
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
      
      // Append AI model selection
      formData.append('aiModel', values.aiModel || 'gpt-4o');

      // Capture study parameters for research section
      if (onStudyParamsCapture) {
        onStudyParamsCapture({
          drugName: values.drugName,
          indication: values.indication,
          strategicGoals: selectedStrategicGoals,
          studyPhase: values.studyPhasePref,
          geography: selectedGeographies,
          additionalContext: values.additionalContext,
          targetSubpopulation: values.targetSubpopulation,
          comparatorDrugs: comparatorDrugs,
          budgetCeilingEur: values.budgetCeilingEur,
          timelineCeilingMonths: values.timelineCeilingMonths,
          salesImpactThreshold: values.salesImpactThreshold
        });
      }

      // Log formData for debugging
      console.log("Submitting form with data:");
      const entries = Array.from(formData.entries());
      entries.forEach(entry => {
        console.log(entry[0], entry[1]);
      });
      
      // Make the API call
      console.log("Making API call to /api/study-idea-validations/validate");
      const response = await fetch('/api/study-idea-validations/validate', {
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
        description: "Your study idea has been successfully validated.",
      });

      onValidationSuccess(validationResults);
    } catch (error) {
      console.error("Failed to validate study idea:", error);
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
            <CardTitle>Study Idea Validation</CardTitle>
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
                  
                  {selectedStrategicGoals.includes("other") && (
                    <div className="mt-2">
                      <FormLabel htmlFor="otherStrategicGoalText" className="text-sm">Please specify other strategic goal</FormLabel>
                      <Input
                        id="otherStrategicGoalText"
                        value={otherStrategicGoalText}
                        onChange={(e) => setOtherStrategicGoalText(e.target.value)}
                        placeholder="Enter custom strategic goal"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <Tabs defaultValue="file" onValueChange={(value) => setInputMethod(value)}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="file">File Upload</TabsTrigger>
                      <TabsTrigger value="text">Text Input</TabsTrigger>
                    </TabsList>
                    <TabsContent value="file">
                      <div 
                        className={`border-2 border-dashed rounded-md p-6 text-center ${dragActive ? 'border-primary bg-blue-50' : 'border-gray-300'}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <Upload className="mx-auto h-12 w-12 text-neutral-medium" />
                        <h3 className="mt-2 text-sm font-medium text-neutral-dark">
                          {selectedFile ? selectedFile.name : "Drop your study idea file here"}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-medium">
                          or{" "}
                          <label className="text-primary font-medium cursor-pointer">
                            browse
                            <input
                              type="file"
                              className="sr-only"
                              onChange={handleFileInput}
                              accept=".pdf,.docx,.doc,.pptx,.ppt"
                            />
                          </label>
                        </p>
                        <p className="mt-2 text-xs text-neutral-medium">
                          PDF, DOCX, DOC, PPTX, or PPT up to 10MB
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="text">
                      <FormField
                        control={form.control}
                        name="studyIdeaText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Study Idea Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your study idea or paste your study text here..." 
                                className="h-40 resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
                
                <FormField
                  control={form.control}
                  name="additionalContext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Context</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Include any additional information such as target submission date, regulatory requirements, etc." 
                          className="h-20 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="mt-6">
                  <h3 className="font-medium text-neutral-dark mb-2">Geographic Focus</h3>
                  <div className="flex flex-wrap gap-2">
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
                    <Select 
                      onValueChange={addGeography}
                      value=""
                    >
                      <SelectTrigger className="w-auto border-dashed">
                        <span className="text-xs">+ Add</span>
                      </SelectTrigger>
                      <SelectContent>
                        {["US", "EU", "Japan", "China", "Global"]
                          .filter(geo => !selectedGeographies.includes(geo))
                          .map(geo => (
                            <SelectItem key={geo} value={geo}>{geo}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="studyPhasePref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Study Phase</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select phase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I">Phase I</SelectItem>
                            <SelectItem value="II">Phase II</SelectItem>
                            <SelectItem value="III">Phase III</SelectItem>
                            <SelectItem value="IV">Phase IV</SelectItem>
                            <SelectItem value="any">Any</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="aiModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select AI model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o (Latest)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="o3-mini">o3-mini (Reasoning)</SelectItem>
                            <SelectItem value="o3">o3 (Advanced Reasoning)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          o3 models use advanced reasoning but don't support temperature control
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetSubpopulation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Subpopulation (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., PD-L1 high expressors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <h3 className="font-medium text-neutral-dark mb-2">Comparator Drugs</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
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
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add comparator drug"
                      value={newComparatorDrug}
                      onChange={(e) => setNewComparatorDrug(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addComparatorDrug}
                    >
                      Add
                    </Button>
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
                          <Input type="number" placeholder="e.g., 5000000" {...field} />
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
                        <FormLabel>Timeline Ceiling (months)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 36" {...field} />
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
                        <FormLabel>Sales Impact Threshold (EUR)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 10000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="anticipatedFpiDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anticipated FPI Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="globalLoeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Global LOE Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="hasPatentExtensionPotential"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Patent Extension Potential</FormLabel>
                        <p className="text-sm text-neutral-medium">
                          Indicates if this study could potentially result in patent extensions
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end pt-2">
                  <Button type="button" variant="outline" className="mr-3">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isValidating}>
                    {isValidating ? "Validating..." : "Validate Study Idea"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Validation Process</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-medium mb-4">
              The study idea validator analyzes your study protocol against best practices and current evidence to identify areas for improvement.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  1
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Upload your study idea document</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  2
                </div>
                <p className="ml-3 text-sm text-neutral-medium">The system extracts PICO elements</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  3
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Enhanced AI validates your study design</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-primary text-sm font-medium">
                  4
                </div>
                <p className="ml-3 text-sm text-neutral-medium">Review validation results and improvement suggestions</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium text-neutral-dark mb-2">Tips for Success</h3>
              <ul className="space-y-2 text-xs">
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
                Study idea should include PICO elements
              </li>
              <li className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                Ensure document is not password protected
              </li>
            </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudyIdeaUploader;