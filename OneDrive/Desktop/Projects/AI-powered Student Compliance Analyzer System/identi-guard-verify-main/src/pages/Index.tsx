import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { GenderSelector } from "@/components/GenderSelector";
import { AugmentationToggle } from "@/components/AugmentationToggle";
import { VerificationResults } from "@/components/VerificationResults";
import { Navigation } from "@/components/Navigation";
import { verifyCompliance } from "@/utils/verification";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gender, setGender] = useState<string>("boy");
  const [useAugmentation, setUseAugmentation] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<{
    idCard: number;
    dressCode: number;
    hairstyle: number;
  } | null>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
  };

  const handleVerify = async () => {
    if (!selectedImage) {
      toast.error("Please upload a student image first");
      return;
    }

    setIsVerifying(true);
    setResults(null);

    try {
      const verificationResults = await verifyCompliance(selectedImage, gender, useAugmentation);
      setResults(verificationResults);
      
      // Count failures - pass if fewer than 2 conditions fail
      const failConditions = [
        verificationResults.idCard,
        verificationResults.dressCode,
        verificationResults.hairstyle
      ].filter(score => score <= 60).length;
      
      const isPassed = failConditions < 2;
      
      if (isPassed) {
        toast.success("Compliance verification passed!");
      } else {
        toast.error("Compliance verification failed");
      }
    } catch (error) {
      toast.error("Error during verification. Please try again.");
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Student Compliance Verification</h1>
                <p className="text-sm text-muted-foreground">Automated ID, dress code, and hairstyle verification system</p>
              </div>
            </div>
            <Navigation />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <ImageUpload onImageSelect={handleImageSelect} previewUrl={previewUrl} />
          
          <GenderSelector value={gender} onChange={setGender} />
          
          <AugmentationToggle enabled={useAugmentation} onChange={setUseAugmentation} />

          <div className="flex justify-center">
            <Button
              onClick={handleVerify}
              disabled={!selectedImage || isVerifying}
              size="lg"
              className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary/90 shadow-md"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 mr-2" />
                  Verify Compliance
                </>
              )}
            </Button>
          </div>

          {results && <VerificationResults results={results} />}
        </div>

        {/* Info Footer */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-lg p-6 border border-border">
            <h3 className="font-semibold text-foreground mb-2">About This System</h3>
            <p className="text-sm text-muted-foreground mb-3">
              This verification system uses simulated image analysis with browser-based preprocessing. 
              Image augmentation techniques include rotation correction, brightness/contrast normalization, 
              Gaussian blur for noise reduction, and perspective adjustments.
            </p>
            <p className="text-sm text-muted-foreground">
              For production use with real computer vision capabilities (OpenCV-based detection with 
              adaptive thresholding, contour analysis, and aspect ratio checking), connect to Lovable Cloud 
              for backend image processing.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
