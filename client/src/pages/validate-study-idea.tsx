import React, { useEffect } from "react";
import { useLocation } from "wouter";
import ValidateSynopsis from "./validate-synopsis";

const ValidateStudyIdea: React.FC = () => {
  // This is a simple redirect/wrapper component
  // It renders the ValidateSynopsis component directly
  return <ValidateSynopsis />;
};

export default ValidateStudyIdea;