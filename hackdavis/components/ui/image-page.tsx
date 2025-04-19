"use client";

import {
  InteractiveImageViewer,
  type ImageData,
  type BoxData,
} from "@/components/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ExampleUsagePageProps {
  onGenerateRecipes?: () => void; // New prop for button click handler
  buttonText?: string; // Optional prop for button text
}

export default function ExampleUsagePage({
  onGenerateRecipes,
  buttonText = "Generate Recipes",
}: ExampleUsagePageProps) {
  const imageFilename = "How-to-Stock-your-Pantry-2.jpg"; // Change as needed
  const imagePath = `http://localhost:8000/original-image/${imageFilename}`;

  const [detectionData, setDetectionData] = useState<ImageData>({});

  useEffect(() => {
    const fetchData = async () => {
      const filename = imagePath.split("/").pop();
      console.log(filename);
      try {
        const res = await fetch(
          `http://localhost:8000/get-detections/${filename}`
        );
        const data = await res.json();
        setDetectionData(data);
      } catch (err) {
        console.error("Failed to fetch detection data:", err);
      }
    };

    fetchData();
  }, [imagePath]);

  // Handle box removal
  const handleBoxRemoved = (id: number) => {
    console.log(`Box ${id} was removed`);
    // Create a new object without the removed box
    const newData = { ...detectionData };
    delete newData[id];
    setDetectionData(newData);
    removeFromBackend(id);
  };

  const removeFromBackend = async (id: number) => {
    try {
      await fetch(`http://localhost:8000/remove-detection/${id}`, {
        method: "DELETE",
      });
      console.log(`Deleted detection ${id}`);
    } catch (err) {
      console.error("Failed to delete detection:", err);
    }
  };

  // Handle filter changes
  const handleFiltersChanged = (selectedLabels: string[]) => {
    console.log("Selected labels:", selectedLabels);
  };

  // Handle adding a new box
  const handleBoxAdded = (boxData: BoxData) => {
    // Generate a new unique ID
    const newId =
      Math.max(0, ...Object.keys(detectionData || {}).map(Number)) + 1;

    // Add the new box to the detection data
    setDetectionData({
      ...detectionData,
      [newId]: boxData,
    });

    console.log(`Added new box with ID ${newId}:`, boxData);

    // Here you could also send the updated data to your backend
    saveToBackend(newId, boxData);
  };

  // Optional: Function to save new box to backend
  const saveToBackend = async (id: number, boxData: BoxData) => {
    try {
      await fetch(`http://localhost:8000/add-detection/${imageFilename}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          data: boxData,
        }),
      });
    } catch (err) {
      console.error("Failed to save new detection:", err);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Interactive Object Detection</h1>

      <div className="mb-12">
        <p className="mb-4">
          View detected objects in the image. You can also add your own custom
          labels by clicking "Add New Box".
        </p>

        <div className="flex justify-center mb-6">
          <Button
            variant="default"
            size="lg"
            className="font-medium text-lg px-8 py-6 h-14"
            onClick={onGenerateRecipes}
          >
            {buttonText}
          </Button>
        </div>

        {/* Interactive image viewer with custom box adding capability */}
        <InteractiveImageViewer
          imageSrc={imagePath}
          imageWidth={600}
          imageHeight={900}
          detectionData={detectionData}
          title="Kitchen Items Detection"
          onBoxRemoved={handleBoxRemoved}
          onFiltersChanged={handleFiltersChanged}
          onBoxAdded={handleBoxAdded}
        />
      </div>
    </div>
  );
}
