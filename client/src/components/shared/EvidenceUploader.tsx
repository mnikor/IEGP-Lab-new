import React, { useRef, useState } from 'react';
import { EvidenceFile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { File, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EvidenceUploaderProps {
  onFilesSelected: (files: EvidenceFile[]) => void;
  existingFiles: EvidenceFile[];
  onFileRemove: (fileName: string) => void;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  onFilesSelected,
  existingFiles,
  onFileRemove,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
      'application/vnd.ms-powerpoint',
      'text/plain'
    ];

    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid File Type",
        description: "Some files were skipped. Please upload PDF, DOCX, DOC, PPTX, PPT, or TXT files.",
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) return;

    const newEvidenceFiles: EvidenceFile[] = validFiles.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    onFilesSelected(newEvidenceFiles);
    
    toast({
      title: "Files Uploaded",
      description: `${validFiles.length} file(s) have been uploaded.`,
    });
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
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
        <h3 className="mt-2 text-sm font-medium text-neutral-dark">Drop files to upload</h3>
        <p className="mt-1 text-sm text-neutral-medium">
          or{" "}
          <button 
            type="button" 
            className="text-primary font-medium hover:underline"
            onClick={handleButtonClick}
          >
            browse
          </button>
        </p>
        <input 
          ref={fileInputRef} 
          type="file" 
          className="hidden" 
          onChange={handleFileInput} 
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
        />
      </div>

      {existingFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-neutral-dark mb-2">Attached Evidence</h3>
          <ul className="divide-y divide-neutral-light">
            {existingFiles.map((file, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div className="flex items-center">
                  <File className="h-5 w-5 text-neutral-medium mr-2" />
                  <span className="text-sm text-neutral-dark">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-neutral-medium hover:text-destructive"
                  onClick={() => onFileRemove(file.name)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
