import { motion } from "framer-motion";
import { Circle, Scissors, Wand2, Download, Check } from "lucide-react";

interface WorkflowStepsProps {
  currentStep: "recording" | "editing" | "trimming" | "done";
}

const STEPS = [
  { key: "recording", label: "Record", icon: Circle },
  { key: "editing", label: "Edit", icon: Wand2 },
  { key: "done", label: "Export", icon: Download },
] as const;

const WorkflowSteps = ({ currentStep }: WorkflowStepsProps) => {
  const stepOrder = ["recording", "editing", "trimming", "done"];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-1 mb-6"
    >
      {STEPS.map((step, i) => {
        const stepIdx = stepOrder.indexOf(step.key);
        const isActive = step.key === currentStep || (currentStep === "trimming" && step.key === "editing");
        const isComplete = stepIdx < currentIdx && !(currentStep === "trimming" && step.key === "editing");
        const Icon = isComplete ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors ${isComplete ? "bg-primary" : "bg-border"}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isComplete
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon size={14} />
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

export default WorkflowSteps;
