import { CheckCircle2, XCircle, IdCard, Shirt, Scissors } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ConfidenceMeter } from "./ConfidenceMeter";

interface VerificationResultsProps {
  results: {
    idCard: number;
    dressCode: number;
    hairstyle: number;
  } | null;
}

export const VerificationResults = ({ results }: VerificationResultsProps) => {
  if (!results) return null;

  // Count failures - pass if fewer than 2 conditions fail
  const failConditions = [results.idCard, results.dressCode, results.hairstyle]
    .filter(score => score <= 60).length;
  const isPassed = failConditions < 2;

  return (
    <Card className="p-6 bg-card shadow-[var(--shadow-elevated)] border-border animate-in fade-in slide-in-from-bottom-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Verification Results</h3>
          <Badge 
            variant={isPassed ? "default" : "destructive"}
            className={isPassed ? "bg-success hover:bg-success/90" : ""}
          >
            {isPassed ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                PASS
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                FAIL
              </>
            )}
          </Badge>
        </div>

        <div className="space-y-4">
          <ConfidenceMeter
            label="ID Card Detection"
            value={results.idCard}
            icon={<IdCard className="h-5 w-5 text-muted-foreground" />}
            delay={100}
          />
          <ConfidenceMeter
            label="Dress Code Compliance"
            value={results.dressCode}
            icon={<Shirt className="h-5 w-5 text-muted-foreground" />}
            delay={200}
          />
          <ConfidenceMeter
            label="Hairstyle Standards"
            value={results.hairstyle}
            icon={<Scissors className="h-5 w-5 text-muted-foreground" />}
            delay={300}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span>Pass criteria: Fewer than 2 conditions below 60%</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
