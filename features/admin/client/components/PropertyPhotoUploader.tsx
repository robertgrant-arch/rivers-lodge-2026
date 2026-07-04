import { useState } from "react";
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { Upload, X, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Photo {
  id?: number;
  url: string;
  caption: string;
  sortOrder: number;
  file?: File;  // For new uploads
}

export function PropertyPhotoUploader({
  propertyId,
  photos: initialPhotos,
  onPhotosChange,
}: {
  propertyId?: number;
  photos?: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos || []);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const newPhotos: Photo[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      // Create preview URL
      const url = URL.createObjectURL(file);
      newPhotos.push({
        url,
        caption: "",
        sortOrder: photos.length + newPhotos.length,
        file,
      });
    }

    const updated = [...photos, ...newPhotos];
    setPhotos(updated);
    onPhotosChange(updated);
    toast.success(`Added ${newPhotos.length} photo(s)`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onPhotosChange(updated);
  };

  const updateCaption = (index: number, caption: string) => {
    const updated = [...photos];
    updated[index].caption = caption;
    setPhotos(updated);
    onPhotosChange(updated);
  };

  const movePhoto = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= photos.length) return;

    const updated = [...photos];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    // Update sort orders
    updated.forEach((p, i) => {
      p.sortOrder = i;
    });

    setPhotos(updated);
    onPhotosChange(updated);
  };

  return (
    <div className="space-y-4">
      <Label className="text-stone-300 text-sm">Property Photos</Label>

      {/* Drag & drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging
            ? "border-amber-500 bg-amber-900/20"
            : "border-stone-700 bg-stone-800/50 hover:border-stone-600"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="photo-input"
        />
        <label htmlFor="photo-input" className="cursor-pointer block space-y-2">
          <Upload className="w-8 h-8 text-stone-400 mx-auto" />
          <p className="text-stone-300 text-sm font-medium">Drop images here or click to browse</p>
          <p className="text-stone-500 text-xs">PNG, JPG, WebP up to 10MB each</p>
        </label>
      </div>

      {/* Photos grid */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">{photos.length} photo(s)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {photos.map((photo, idx) => (
              <div
                key={idx}
                className="bg-stone-800 border border-stone-700 rounded-lg p-3 space-y-2"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-stone-900 rounded overflow-hidden flex items-center justify-center">
                  <img
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Caption input */}
                <input
                  type="text"
                  placeholder="Photo caption (optional)"
                  value={photo.caption}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 placeholder-stone-500"
                />

                {/* Controls */}
                <div className="flex items-center gap-1">
                  {idx > 0 && (
                    <button
                      onClick={() => movePhoto(idx, "up")}
                      className="flex-1 p-1 bg-stone-700 hover:bg-stone-600 rounded text-stone-300 hover:text-stone-100 text-xs"
                    >
                      ↑ Move up
                    </button>
                  )}
                  {idx < photos.length - 1 && (
                    <button
                      onClick={() => movePhoto(idx, "down")}
                      className="flex-1 p-1 bg-stone-700 hover:bg-stone-600 rounded text-stone-300 hover:text-stone-100 text-xs"
                    >
                      Move down ↓
                    </button>
                  )}
                  <button
                    onClick={() => removePhoto(idx)}
                    className="p-1 bg-red-900/30 hover:bg-red-900/50 rounded text-red-300 hover:text-red-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* First photo indicator */}
                {idx === 0 && (
                  <div className="text-xs bg-amber-900/30 text-amber-300 px-2 py-1 rounded text-center">
                    Hero photo (first on member portal)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
