"use client";
import { useState, useEffect, useRef } from "react"; // Add useRef
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ui/image-processor";
import ExampleUsagePage from "@/components/ui/image-page";
import { FaExclamationTriangle } from "react-icons/fa";
import ResidentAlert from "@/components/ui/resident-alert";

// Define the emergency request type
interface EmergencyRequest {
  id: string;
  resident_id: string;
  resident_name: string;
  timestamp: string;
  emergency_type: string;
  status: string;
}

interface EmergencySummaryEntry {
  resident_info: {
    name: string;
    age: string;
    medical_conditions: string;
    medications: string;
    food_allergies: string;
    special_supportive_services: string;
  };
  summary: string;
}

interface EmergencyData {
  resident_data: {
    name: string;
    age: string;
    medical_conditions: string;
    medications: string;
    food_allergies: string;
    special_supportive_services: string;
  };
  ai_response: string;
}

export default function CaretakerPortal() {
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null); // Add a WebSocket reference
  const [activeTab, setActiveTab] = useState("home");
  const [emergencyRequests, setEmergencyRequests] = useState<
    EmergencyRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emergencySummary, setEmergencySummary] = useState<
    EmergencySummaryEntry[] | null
  >(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // On component mount, set up WebSocket connection and perform initial fetch
  useEffect(() => {
    // Initial fetch only once
    fetchEmergencySummary();

    // Set up WebSocket connection
    const ws = new WebSocket("ws://localhost:8000/ws/emergency-updates");
    wsRef.current = ws;

    // Listen for WebSocket messages
    ws.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);

      if (data.type === "emergency_update") {
        // Update state with the new emergency summary
        setEmergencySummary(data.data);
      } else if (data.type === "new_emergency") {
        // Handle notification of new emergency
        console.log("New emergency notification:", data.data);
        // You could play a sound, show a notification, etc.
        // Then fetch the full details
        fetchEmergencySummary();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    // Clean up WebSocket on component unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Only keep the emergency requests polling if needed, or convert that to WebSocket too
  useEffect(() => {
    fetchEmergencyRequests();
    const intervalId = setInterval(fetchEmergencyRequests, 30000); // 30 seconds is reasonable
    return () => clearInterval(intervalId);
  }, []);

  const updateEmergencyStatus = async (residentName: string, index: number) => {
    try {
      console.log(`Attempting to resolve emergency for: ${residentName}`);

      // Call the FastAPI endpoint with the resident name as emergency_id
      const response = await fetch(
        `http://localhost:8000/update-emergency-status/${encodeURIComponent(
          residentName
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = await response.json();
      console.log("Response from server:", responseData);

      if (!response.ok) {
        throw new Error(
          responseData.detail || "Failed to update emergency status"
        );
      }

      // Update UI to reflect the resolved status
      const updatedElement = document.querySelector(
        `[data-emergency-index="${index}"] .status-badge`
      );
      if (updatedElement) {
        updatedElement.textContent = "RESOLVED";
        updatedElement.classList.remove("bg-red-100", "text-red-700");
        updatedElement.classList.add("bg-green-100", "text-green-700");
      }

      // Refresh emergency data after a short delay
      setTimeout(() => {
        fetchEmergencySummary();
      }, 500);
    } catch (error) {
      console.error("Error updating emergency status:", error);
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to update emergency"
        }`
      );
    }
  };

  // Function to fetch emergency summary from backend
  const fetchEmergencySummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);

      console.log("Fetching emergency summary...");
      const response = await fetch(
        "http://localhost:8000/get-emergency-summary",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      console.log("Response status:", response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No active emergencies found");
          setEmergencySummary(null);
          setSummaryLoading(false);
          return;
        }

        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("Emergency summary data:", data);

      // Handle different response formats
      if (data.emergency_summaries && Array.isArray(data.emergency_summaries)) {
        // Old format
        setEmergencySummary(data.emergency_summaries);
      } else if (data.emergencies && Array.isArray(data.emergencies)) {
        // New format - convert to expected format for the UI
        const formattedSummaries = data.emergencies.map(
          (emergency: EmergencyData) => ({
            resident_info: emergency.resident_data,
            summary: emergency.ai_response,
          })
        );
        setEmergencySummary(formattedSummaries);
      } else {
        setEmergencySummary(null);
        console.warn(
          "Unexpected data format from emergency summary API:",
          data
        );
      }

      setSummaryLoading(false);
    } catch (error: unknown) {
      console.error("Failed to fetch emergency summary:", error);

      // Type guard to safely access error properties
      const err = error as { name?: string; message?: string };

      if (err.name === "AbortError") {
        setSummaryError("Request timed out. Backend server might be down.");
      } else {
        setSummaryError(
          `Failed to load emergency summary: ${err.message || "Unknown error"}`
        );
      }
      setSummaryLoading(false);
    }
  };

  const onGenerateRecipes = async () => {
    const res = await fetch("http://localhost:8000/get-recipes");
    const data = await res.json();
    setActiveTab("recipes");
    console.log(data);
  };

  // Function to fetch emergency requests from backend
  const fetchEmergencyRequests = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/get-emergency-requests"
      );

      if (!response.ok) {
        throw new Error(`API returned status code: ${response.status}`);
      }

      const data = await response.json();
      setEmergencyRequests(data.requests || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch emergency requests:", err);
      setError("Failed to load emergency requests. Please try again.");
      setLoading(false);
    }
  };

  // Format the timestamp to be more readable
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " on " +
      date.toLocaleDateString()
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-red-50">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-md">
        <h1 className="text-xl font-bold text-red-500">Caretaker Portal</h1>
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "home"
                ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("home")}
          >
            Dashboard
          </button>

          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "upload"
                ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            Upload Pantry Image
          </button>
          <button
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            onClick={() => router.push("/select-role")}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-1 flex-col p-6">
        {activeTab === "home" && (
          <div className="container mx-auto">
            <h2 className="mb-4 text-3xl font-bold text-gray-700">
              Welcome, Caretaker
            </h2>
            <p className="mb-6 text-lg text-gray-600">
              Monitor resident emergencies and care requests here.
            </p>

            {/* AI Emergency Summary Section */}
            {emergencySummary && emergencySummary.length > 0 ? (
              emergencySummary.map((entry, index) => (
                <div
                  key={index}
                  data-emergency-index={index}
                  className="mb-8 bg-red-50 border border-red-300 rounded-lg shadow-md p-6"
                >
                  <div className="flex justify-between mb-4">
                    <h3 className="text-xl font-bold">
                      Resident: {entry.resident_info.name}
                    </h3>
                    <span className="status-badge bg-red-100 text-red-700 px-3 py-1 h-fit rounded-full text-sm font-medium">
                      PENDING
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-red-700 mb-2">
                        Resident Information
                      </h4>
                      <div className="bg-white p-4 rounded-md h-full">
                        <p>
                          <strong>Age:</strong> {entry.resident_info.age}
                        </p>
                        <p>
                          <strong>Medical Conditions:</strong>{" "}
                          {entry.resident_info.medical_conditions}
                        </p>
                        <p>
                          <strong>Medications:</strong>{" "}
                          {entry.resident_info.medications}
                        </p>
                        <p>
                          <strong>Allergies:</strong>{" "}
                          {entry.resident_info.food_allergies}
                        </p>
                        <p>
                          <strong>Supportive Services:</strong>{" "}
                          {entry.resident_info.special_supportive_services}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-red-700 mb-2">
                        AI Medical Assessment
                      </h4>
                      <div className="bg-white p-4 rounded-md h-full">
                        <ResidentAlert data={JSON.parse(entry.summary)} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 flex justify-end">
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                      onClick={() =>
                        updateEmergencyStatus(entry.resident_info.name, index)
                      }
                    >
                      Mark as Resolved
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="mb-8 p-6 bg-white rounded-lg shadow-md text-center">
                <p className="text-lg text-gray-600">
                  No active emergencies found
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  All residents are currently safe
                </p>
              </div>
            )}

            {/* Display error message if there's a problem with summary fetch */}
            {summaryError && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-700 mb-2">Error</h3>
                <p className="text-red-600">{summaryError}</p>
                <button
                  onClick={fetchEmergencySummary}
                  className="mt-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg"
                >
                  Try Again
                </button>
              </div>
            )}

            {summaryLoading && !emergencySummary && (
              <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-500">Loading emergency summary...</p>
              </div>
            )}

            {/* Emergency Requests Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-red-600 flex items-center">
                <FaExclamationTriangle className="mr-2" />
                Emergency Requests
              </h3>

              {loading ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-lg">Loading emergency requests...</p>
                </div>
              ) : error ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-red-500">{error}</p>
                  <button
                    className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    onClick={fetchEmergencyRequests}
                  >
                    Retry
                  </button>
                </div>
              ) : emergencyRequests.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-lg text-gray-600">
                    No active emergency requests
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    All residents are currently safe
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left p-4 text-red-600">Resident</th>
                        <th className="text-left p-4 text-red-600">Time</th>
                        <th className="text-left p-4 text-red-600">Type</th>
                        <th className="text-left p-4 text-red-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emergencyRequests.map((request) => (
                        <tr
                          key={request.id}
                          className={`border-b ${
                            request.status === "PENDING" ? "bg-red-50" : ""
                          }`}
                        >
                          <td className="p-4 font-medium">
                            {request.resident_name}
                          </td>
                          <td className="p-4">
                            {formatTimestamp(request.timestamp)}
                          </td>
                          <td className="p-4">
                            {request.emergency_type === "HELP_REQUESTED"
                              ? "Help Needed"
                              : request.emergency_type}
                          </td>
                          <td className="p-4">
                            {request.status === "PENDING" ? (
                              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                                Pending
                              </span>
                            ) : (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                Resolved
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-red-500">
                  Resident Summary
                </h3>
                <p className="py-1">Total Residents: 24</p>
                <p className="py-1">Active Care Plans: 18</p>
                <p className="py-1">New Admissions: 3</p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-red-500">
                  Medication Schedule
                </h3>
                <p className="py-1">Morning Round: Complete</p>
                <p className="py-1">Afternoon Round: 2:00 PM</p>
                <p className="py-1">Evening Round: 8:00 PM</p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-red-500">
                  Today&apos;s Activities
                </h3>
                <p className="py-1">10:00 AM - Group Exercise</p>
                <p className="py-1">1:00 PM - Art Therapy</p>
                <p className="py-1">4:00 PM - Community Social</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <main className="container mx-auto py-10 px-4 md:px-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  Pantry Image Upload
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Upload your pantry images by dragging and dropping or selecting a
                  file.
                </p>
              </div>

              <ImageUpload onImageUpload={() => setActiveTab("interact")} />
            </div>
          </main>
        )}

        {activeTab == "interact" && (
          <ExampleUsagePage
            onGenerateRecipes={() => onGenerateRecipes()}
            buttonText="Generate Recipes from Ingredients"
          />
        )}

        {activeTab === "kitchen" && (
          <div className="container mx-auto">
            <h2 className="mb-4 text-3xl font-bold text-gray-700">
              Kitchen Management
            </h2>
            <p className="mb-6 text-lg text-gray-600">
              Oversee kitchen operations and meal planning.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-xl font-semibold mb-2 text-red-500">
                  Today&apos;s Menu
                </h3>
                <div className="space-y-2">
                  <div className="p-2 border-b">
                    <p className="font-semibold">Breakfast</p>
                    <p>Oatmeal, Fruit Salad, Yogurt</p>
                  </div>
                  <div className="p-2 border-b">
                    <p className="font-semibold">Lunch</p>
                    <p>Vegetable Soup, Sandwiches, Apple Juice</p>
                  </div>
                  <div className="p-2">
                    <p className="font-semibold">Dinner</p>
                    <p>Grilled Chicken, Rice, Steamed Vegetables</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-xl font-semibold mb-2 text-red-500">
                  Dietary Restrictions
                </h3>
                <div className="space-y-2">
                  <div className="p-2 border-b">
                    <p>Room 101: Low sodium</p>
                  </div>
                  <div className="p-2 border-b">
                    <p>Room 105: Gluten-free</p>
                  </div>
                  <div className="p-2">
                    <p>Room 108: Dairy-free</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
