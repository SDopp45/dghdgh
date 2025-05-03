import React, { createContext, useContext, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

interface MultiStepFormContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  totalSteps: number;
  goToStep: (step: number) => void;
  steps: {
    title: string;
    description?: string;
    optional?: boolean;
  }[];
}

const MultiStepFormContext = createContext<MultiStepFormContextType | undefined>(
  undefined
);

interface MultiStepFormProps {
  children: ReactNode;
  steps: {
    title: string;
    description?: string;
    optional?: boolean;
  }[];
  className?: string;
  initialStep?: number;
  onComplete?: () => void;
}

export function MultiStepForm({
  children,
  steps,
  className,
  initialStep = 0,
  onComplete,
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const context = {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    isFirstStep,
    isLastStep,
    totalSteps: steps.length,
    goToStep,
    steps,
  };

  return (
    <MultiStepFormContext.Provider value={context}>
      <div className={cn("space-y-6", className)}>
        {children}
      </div>
    </MultiStepFormContext.Provider>
  );
}

export const useMultiStepForm = () => {
  const context = useContext(MultiStepFormContext);
  if (!context) {
    throw new Error("useMultiStepForm must be used within a MultiStepForm component");
  }
  return context;
};

interface StepIndicatorProps {
  className?: string;
  variant?: "default" | "numbered" | "progress";
  showLabels?: boolean;
}

export function StepIndicator({
  className,
  variant = "default",
  showLabels = true,
}: StepIndicatorProps) {
  const { steps, currentStep, goToStep } = useMultiStepForm();
  
  return (
    <div className={cn("step-indicator", className)}>
      {variant === "progress" ? (
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      ) : (
        steps.map((step, index) => (
          <div 
            key={index}
            className={cn(
              "step-indicator-item", 
              currentStep === index && "active",
              currentStep > index && "completed"
            )}
            onClick={() => goToStep(index)}
          >
            <div className="step-indicator-number">
              {currentStep > index ? (
                <Check className="h-4 w-4" />
              ) : variant === "numbered" ? (
                index + 1
              ) : (
                ""
              )}
            </div>
            {showLabels && (
              <div className="step-indicator-label">
                {step.title}
                {step.optional && <span className="text-[10px] ml-1">(Optionnel)</span>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

interface StepContentProps {
  step: number;
  children: ReactNode;
  className?: string;
}

export function StepContent({ 
  step, 
  children, 
  className 
}: StepContentProps) {
  const { currentStep } = useMultiStepForm();
  
  if (step !== currentStep) return null;
  
  return (
    <div className={cn("animate-scale-in", className)}>
      {children}
    </div>
  );
}

interface StepNavigationProps {
  className?: string;
  nextLabel?: string;
  prevLabel?: string;
  completeLabel?: string;
  showStepInfo?: boolean;
  nextDisabled?: boolean;
  prevDisabled?: boolean;
}

export function StepNavigation({ 
  className,
  nextLabel = "Suivant",
  prevLabel = "Précédent",
  completeLabel = "Terminer",
  showStepInfo = true,
  nextDisabled = false,
  prevDisabled = false,
}: StepNavigationProps) {
  const { 
    nextStep, 
    prevStep, 
    isFirstStep, 
    isLastStep, 
    currentStep, 
    totalSteps 
  } = useMultiStepForm();
  
  return (
    <div className={cn("flex items-center justify-between mt-8", className)}>
      <Button
        variant="outline"
        onClick={prevStep}
        disabled={isFirstStep || prevDisabled}
        className={cn(
          "flex items-center gap-1",
          isFirstStep && "invisible"
        )}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {prevLabel}
      </Button>
      
      {showStepInfo && (
        <div className="text-sm text-muted-foreground">
          Étape {currentStep + 1} sur {totalSteps}
        </div>
      )}
      
      <Button
        onClick={nextStep}
        disabled={nextDisabled}
        className="flex items-center gap-1"
      >
        {isLastStep ? completeLabel : nextLabel}
        {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
      </Button>
    </div>
  );
} 