"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Loading() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success">("loading");
  const [agentName, setAgentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiCallCompleted = useRef(false);

  useEffect(() => {
    // If we've already done the API call, don't do it again
    if (apiCallCompleted.current) return;

    const fetchData = async () => {
      try {
        // Mark that we're starting the API call
        apiCallCompleted.current = true;

        const residentDataString = localStorage.getItem("residentData");

        if (!residentDataString) {
          console.error("No resident data found in localStorage");
          setError("No resident information found");
          return;
        }

        const residentData = JSON.parse(residentDataString);
        console.log("Retrieved resident data:", residentData);

        // Make the API call to backend
        const response = await fetch("http://localhost:8000/assign-caretaker", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(residentData),
          // Add cache control to prevent duplicate requests
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API response:", data);

        // Extract agent name
        const assignedAgentName = data.agent?.name;
        setAgentName(assignedAgentName);

        // Set success status
        setStatus("success");

        // Navigate to portal after a short delay
        setTimeout(() => {
          router.push(
            `/resident-portal?agentName=${encodeURIComponent(
              assignedAgentName
            )}&residentName=${data.resident_name || "unknown"}&residentId=${
              data.resident_id || "unknown"
            }`
          );

          localStorage.removeItem("residentData");
        }, 1500); // 1.5 seconds delay
      } catch (error) {
        console.error("Error:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
        // Reset the flag if there's an error so user can try again
        apiCallCompleted.current = false;
      }
    };

    fetchData();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50">
      {status === "loading" && (
        <>
          <div className="mb-6 flex items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-red-300 border-t-red-500"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-700">
            Assigning you to a caretaker agent, currently looking for available
            caretakers...
          </h1>
        </>
      )}

      {status === "success" && (
        <>
          <h1 className="text-3xl font-bold text-gray-700">
            Great! Caretaker found and agent initialized.
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Preparing your personalized portal...
          </p>
          {agentName && (
            <p className="mt-2 text-md text-gray-600">
              Your caretaker agent: {agentName}
            </p>
          )}
        </>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <button
            onClick={() => router.push("/new-resident")}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
