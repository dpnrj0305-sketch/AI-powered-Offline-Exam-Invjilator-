// Real AI-powered verification using Lovable Cloud
import { applyAugmentation } from './imageAugmentation';
import { supabase } from '@/integrations/supabase/client';

export const verifyCompliance = async (
  imageFile: File,
  gender: string,
  useAugmentation: boolean = true
): Promise<{
  idCard: number;
  dressCode: number;
  hairstyle: number;
}> => {
  // Apply preprocessing augmentation to improve detection accuracy
  let processedImage = imageFile;
  
  if (useAugmentation) {
    const augmentedBlob = await applyAugmentation(imageFile, {
      rotate: true,      // Correct slight rotations
      brightness: true,  // Normalize lighting
      contrast: true,    // Enhance features
      blur: true,        // Reduce noise
      perspective: false, // Keep perspective as-is
    });
    processedImage = new File([augmentedBlob], imageFile.name, { type: 'image/jpeg' });
  }
  
  // Convert image to base64
  const imageBase64 = await fileToBase64(processedImage);
  
  // Call the edge function for real AI analysis
  const { data, error } = await supabase.functions.invoke('verify-student', {
    body: {
      imageBase64,
      gender,
      useAugmentation
    }
  });

  if (error) {
    console.error('Verification error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
      throw new Error('Too many requests. Please try again in a moment.');
    }
    
    if (error.message?.includes('402') || error.message?.includes('credits')) {
      throw new Error('AI credits exhausted. Please add credits to continue.');
    }
    
    throw new Error('Verification failed. Please try again.');
  }

  if (!data) {
    throw new Error('No response from verification service');
  }

  return {
    idCard: data.idCard,
    dressCode: data.dressCode,
    hairstyle: data.hairstyle,
  };
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
