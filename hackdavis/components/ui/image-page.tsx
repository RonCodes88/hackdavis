"use client";

import { InteractiveImageViewer, type ImageData } from "@/components/image";
import { useState, useEffect } from "react";

// Sample data structure based on your code

export default function ExampleUsagePage() {
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
  };

  // Handle filter changes
  const handleFiltersChanged = (selectedLabels: string[]) => {
    console.log("Selected labels:", selectedLabels);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Custom Page</h1>

      <div className="mb-12">
        <p className="mb-4">
          This is an example of how to use the component on your own page.
        </p>

        {/* Basic usage */}
        <InteractiveImageViewer
          imageSrc={imagePath}
          imageWidth={600}
          imageHeight={900}
          detectionData={detectionData}
          title="Kitchen Items Detection"
          onBoxRemoved={handleBoxRemoved}
          onFiltersChanged={handleFiltersChanged}
        />
      </div>
    </div>
  );
}
