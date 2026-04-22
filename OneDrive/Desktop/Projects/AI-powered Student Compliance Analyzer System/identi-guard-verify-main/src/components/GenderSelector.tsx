import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface GenderSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const GenderSelector = ({ value, onChange }: GenderSelectorProps) => {
  return (
    <Card className="p-6 bg-card shadow-[var(--shadow-card)] border-border">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Student Gender</h3>
        <RadioGroup value={value} onValueChange={onChange}>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="boy" id="boy" />
              <Label htmlFor="boy" className="cursor-pointer">Boy</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="girl" id="girl" />
              <Label htmlFor="girl" className="cursor-pointer">Girl</Label>
            </div>
          </div>
        </RadioGroup>
      </div>
    </Card>
  );
};
