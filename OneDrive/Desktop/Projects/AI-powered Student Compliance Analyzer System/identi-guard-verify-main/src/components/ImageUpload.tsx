import { Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  previewUrl: string | null;
}

export const ImageUpload = ({ onImageSelect, previewUrl }: ImageUploadProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <Card className="p-6 bg-card shadow-[var(--shadow-card)] border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Student Image</h3>
          <label htmlFor="image-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </span>
            </Button>
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Student preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-2 opacity-50" />
              <p className="text-sm">No image selected</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
