"use client";

import {
  InteractiveImageViewer,
  type ImageData,
  type BoxData,
} from "@/components/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RecipePage from "../recipe";

interface ResidentInfo {
  name: string;
  password: string;
  age?: number;
  medicalConditions?: string;
  medications?: string;
  foodAllergies?: string;
  specialSupportiveServices?: string;
}

interface ExampleUsagePageProps {
  onGenerateRecipes?: (residentName: string) => void; // Updated to include residentName
  buttonText?: string; // Optional prop for button text
}

export default function ExampleUsagePage({
  buttonText = "Generate Recipes",
}: ExampleUsagePageProps) {
  const imageFilename = "How-to-Stock-your-Pantry-2.jpg"; // Change as needed
  const imagePath = `http://localhost:8000/original-image/${imageFilename}`;

  const [detectionData, setDetectionData] = useState<ImageData>({});
  const [residentName, setResidentName] = useState<string>("");
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  // Fetch residents data
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/get-residents-info"
        );
        const data = await response.json();

        if (data.success && data.residents) {
          setResidents(data.residents);
        }
      } catch (error) {
        console.error("Error fetching residents:", error);
      }
    };

    fetchResidents();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const filename = imagePath.split("/").pop();
      console.log(filename);
      try {
        console.log("I got here");
        const res = await fetch(
          `http://localhost:8000/refresh-detections/${filename}`
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

  // Handle Generate Recipes button click
  const handleGenerateRecipes = async () => {
    if (!residentName) {
      alert("Please select a resident first");
      return;
    }

    setIsLoading(true);

    // try {
    //   const response = await fetch(
    //     `http://localhost:8000/get-recipes-by-name/${residentName}`
    //   );
    //   const data = await response.json();

    //   console.log(data);
    setResidentName(residentName);

    setActiveTab("recipes");
    // } catch (error) {
    //   console.error("Error generating recipes:", error);
    //   alert("An error occurred while generating recipes.");
    // } finally {
    setIsLoading(false);
    //   }
  };
  return (
    <div className="container mx-auto p-8">
      {activeTab == "upload" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold mb-8">
            Interactive Object Detection
          </h1>

          <div className="mb-12">
            <p className="mb-4">
              View detected objects in the image. You can also add your own
              custom labels by clicking "Add New Box".
            </p>

            {/* Resident Selection */}
            <div className="mb-6">
              <div className="max-w-md mx-auto">
                <label
                  htmlFor="resident-select"
                  className="block text-sm font-medium mb-2"
                >
                  Select Resident for Recipe Generation
                </label>
                <Select value={residentName} onValueChange={setResidentName}>
                  <SelectTrigger
                    id="resident-select"
                    className="w-full bg-white dark:bg-gray-800"
                  >
                    <SelectValue placeholder="Select a resident" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg">
                    {residents.length > 0 ? (
                      residents.map((resident) => (
                        <SelectItem
                          key={resident.name}
                          value={resident.name}
                          className="hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {resident.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        Loading residents...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {!residentName && (
                  <p className="mt-1 text-xs text-gray-500">
                    Please select a resident before generating recipes
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <Button
                variant="default"
                size="lg"
                className="font-medium text-lg px-8 py-6 h-14"
                onClick={handleGenerateRecipes}
                disabled={!residentName || isLoading}
              >
                {isLoading ? "Generating..." : buttonText}
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
      )}

      {activeTab == "recipes" && (
        <div className="container mx-auto p-8">
          <RecipePage residentName={residentName}></RecipePage>
        </div>
      )}
    </div>
  );
}
