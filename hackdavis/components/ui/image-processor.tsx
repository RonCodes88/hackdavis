"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Upload, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUpload?: (file: File) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function ImageUpload({
  onImageUpload,
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    setError(null);

    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Please upload ${acceptedTypes.join(", ")}`);
      return false;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const timer = setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);

      if (onImageUpload) {
        onImageUpload(file);

        setIsUploading(false);
      }
    }, 3000);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImage(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {!image ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-lg p-6 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50",
            className
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={acceptedTypes.join(",")}
            className="sr-only"
            aria-label="Upload image"
          />

          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col space-y-1">
              <h3 className="text-base font-medium">
                Drag & drop your image here
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                or click to browse files
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supports:{" "}
                {acceptedTypes.map((type) => type.split("/")[1]).join(", ")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Max size: {maxSizeMB}MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              className="mt-2"
            >
              Select File
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="absolute top-2 right-2 z-10 flex space-x-2">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={removeImage}
              className="h-8 w-8 rounded-full"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
            <img
              src={image || "/placeholder.svg"}
              alt="Uploaded preview"
              className="h-full w-full object-contain"
            />

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          {!isUploading && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                {uploadSuccess
                  ? "Image uploaded to server successfully"
                  : "Image ready for upload"}
              </span>
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </div>
  );
}
