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
import { useToast } from "@/hooks/use-toast";
import { ValidationResults } from "@/lib/types";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SynopsisUploaderProps {
  onValidationSuccess: (results: ValidationResults) => void;
  isValidating: boolean;
  setIsValidating: (isValidating: boolean) => void;
}

const formSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoal: z.enum(["expand_label", "defend_share", "accelerate_uptake", "real_world_evidence"], {
    required_error: "Please select a strategic goal",
  }),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drugName: "",
      indication: "",
      strategicGoal: undefined,
      studyIdeaText: "",
      additionalContext: "",
      geography: ["US", "EU"],
      studyPhasePref: undefined,
      targetSubpopulation: "",
      comparatorDrugs: [],
      budgetCeilingEur: undefined,
      timelineCeilingMonths: undefined,
      salesImpactThreshold: undefined,
      anticipatedFpiDate: "",
      globalLoeDate: "",
      hasPatentExtensionPotential: false,
    },
  });

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

    try {
      setIsValidating(true);

      // Create a FormData object to send the data
      const formData = new FormData();
      
      // Only append file if using file input method and a file is selected
      if (inputMethod === "file" && selectedFile) {
        formData.append('file', selectedFile);
      }
      
      // Always append these form fields
      formData.append('drugName', values.drugName);
      formData.append('indication', values.indication);
      formData.append('strategicGoal', values.strategicGoal);
      
      // For text input method, ensure studyIdeaText is sent
      if (inputMethod === "text") {
        console.log("Sending study idea text:", values.studyIdeaText);
        formData.append('studyIdeaText', values.studyIdeaText || '');
      } else {
        formData.append('studyIdeaText', '');
      }
      
      // Always send additional context if provided
      formData.append('additionalContext', values.additionalContext || '');

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
