import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Sparkles } from "lucide-react";

interface AugmentationToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const AugmentationToggle = ({ enabled, onChange }: AugmentationToggleProps) => {
  return (
    <Card className="p-6 bg-card shadow-[var(--shadow-card)] border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="augmentation-toggle" className="text-base font-semibold cursor-pointer">
              Image Preprocessing
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Apply augmentation to enhance detection accuracy
            </p>
          </div>
        </div>
        <Switch
          id="augmentation-toggle"
          checked={enabled}
          onCheckedChange={onChange}
        />
      </div>
      
      {enabled && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Enabled transformations: Rotation correction, brightness/contrast normalization, 
            noise reduction, and perspective adjustment
          </p>
        </div>
      )}
    </Card>
  );
};
