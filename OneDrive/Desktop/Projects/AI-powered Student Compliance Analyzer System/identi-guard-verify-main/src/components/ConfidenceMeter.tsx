import { useEffect, useState } from "react";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  delay?: number;
}

export const ConfidenceMeter = ({ label, value, icon, delay = 0 }: ConfidenceMeterProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const isPass = displayValue >= 60;
  const progressColor = isPass 
    ? "bg-success" 
    : displayValue >= 40 
    ? "bg-yellow-500" 
    : "bg-destructive";

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <span className={cn(
          "text-2xl font-bold transition-colors",
          isPass ? "text-success" : "text-destructive"
        )}>
          {displayValue}%
        </span>
      </div>
      <Progress 
        value={displayValue} 
        className="h-2"
        indicatorClassName={progressColor}
      />
    </div>
  );
};
