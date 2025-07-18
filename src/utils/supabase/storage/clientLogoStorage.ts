// utils/supabase/storage/clientLogoStorage.ts
import { createClient } from "@/utils/supabase/client";

export class ClientLogoStorageService {
  private static BUCKET_NAME = 'fpo-logos';
  private static MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  private static ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  static async uploadLogo(file: File, fpoId: string): Promise<string | undefined> {
    try {
      const supabase = createClient();
      
      // Validate file
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      }
      
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size too large. Maximum size is 2MB.');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${fpoId}/logo-${Date.now()}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  }

  static async updateLogo(file: File, fpoId: string, oldLogoUrl?: string): Promise<string | undefined> {
    try {
      // Delete old logo if exists
      if (oldLogoUrl) {
        await this.deleteLogo(oldLogoUrl);
      }

      // Upload new logo
      return await this.uploadLogo(file, fpoId);
    } catch (error) {
      console.error('Error updating logo:', error);
      throw error;
    }
  }

  static async deleteLogo(logoUrl: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // Extract file path from URL
      const urlParts = logoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const fpoId = urlParts[urlParts.length - 2];
      const filePath = `${fpoId}/${fileName}`;

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting logo:', error);
      return false;
    }
  }

  static async getPublicUrl(fileName: string): Promise<string> {
    const supabase = createClient();
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(fileName);
    
    return publicUrl;
  }
}