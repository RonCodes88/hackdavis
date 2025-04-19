"use client";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import {
  FaPhone,
  FaPills,
  FaCalendarCheck,
  FaExclamationTriangle,
  FaUserNurse,
  FaFileUpload,
  FaFilePdf,
  FaTrash,
} from "react-icons/fa";

export default function Portal() {
  const searchParams = useSearchParams();
  const agentName = searchParams.get("agentName") || "Your Caretaker";
  const residentName = searchParams.get("residentName") || "Unknown Resident";
  const residentId = searchParams.get("residentId") || "Unknown Resident ID";
  const router = useRouter();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<
    "sending" | "success" | "error" | null
  >(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle emergency request
  const handleEmergencyRequest = async () => {
    try {
      // Set status to sending
      setEmergencyStatus("sending");

      // Show modal immediately
      setShowEmergencyModal(true);

      // Make API call to backend
      const response = await fetch(
        "http://localhost:8000/push-emergency-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            residentId,
            residentName,
            timestamp: new Date().toISOString(),
            emergencyType: "HELP_REQUESTED",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Set status to success
      setEmergencyStatus("success");

      // Optional: You can get and process response data
      const data = await response.json();
      console.log("Emergency request sent successfully:", data);
    } catch (error) {
      console.error("Failed to send emergency request:", error);
      setEmergencyStatus("error");
    }
  };

  // Function to handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const pdfFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf"
      );
      setUploadedFiles((prevFiles) => [...prevFiles, ...pdfFiles]);
    }
  };

  // Function to handle file upload
  const handleFileUpload = async () => {
    if (uploadedFiles.length === 0) return;

    setUploadStatus("uploading");
    try {
      // Create FormData for file upload
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("residentId", residentId);

      // Example API call - replace with your actual endpoint
      const response = await fetch("http://localhost:8000/upload-documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      setUploadStatus("success");
      // Optionally clear files after successful upload
      // setUploadedFiles([]);
    } catch (error) {
      console.error("File upload failed:", error);
      setUploadStatus("error");
    }
  };

  // Function to remove a file from the upload list
  const removeFile = (index: number) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-red-50">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-md">
        <h1 className="text-xl font-bold text-red-500">Resident Portal</h1>
        <div className="flex space-x-4">
          <button className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            Dashboard
          </button>
          <button className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
            Profile
          </button>
          <button className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
            Settings
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
      <main className="flex flex-1 flex-col p-6 md:p-10">
        <h2 className="mb-2 text-2xl font-bold text-gray-700">
          Welcome, {residentName}
        </h2>
        <p className="mb-6 text-lg text-gray-600">
          Your caretaker today is:{" "}
          <span className="font-semibold text-red-500">{agentName}</span>
        </p>

        {/* Emergency and Care Request Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* HELP ME Card */}
          <button
            onClick={handleEmergencyRequest} // Call our new function
            disabled={emergencyStatus === "sending"} // Disable when sending
            className="flex flex-col items-center justify-center rounded-xl bg-red-600 p-8 text-white shadow-lg transition hover:bg-red-700 hover:shadow-xl disabled:opacity-75"
          >
            <FaExclamationTriangle className="mb-4 text-6xl" />
            <h3 className="text-3xl font-bold">HELP ME</h3>
            <p className="mt-2 text-lg">For emergency assistance</p>
          </button>

          {/* REQUEST CARE Card */}
          <button className="flex flex-col items-center justify-center rounded-xl bg-blue-500 p-8 text-white shadow-lg transition hover:bg-blue-600 hover:shadow-xl">
            <FaUserNurse className="mb-4 text-6xl" />
            <h3 className="text-3xl font-bold">REQUEST CARE</h3>
            <p className="mt-2 text-lg">For non-emergency assistance</p>
          </button>
        </div>

        {/* Additional Features Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Medication Reminder */}
          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex items-center">
              <FaPills className="mr-3 text-3xl text-purple-600" />
              <h3 className="text-xl font-bold text-gray-700">Medications</h3>
            </div>
            <div className="mt-4 space-y-2">
              <p className="flex items-center justify-between border-b border-gray-200 py-2">
                <span className="font-medium">Blood Pressure Med</span>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                  8:00 AM
                </span>
              </p>
              <p className="flex items-center justify-between border-b border-gray-200 py-2">
                <span className="font-medium">Vitamin D</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                  Taken
                </span>
              </p>
              <p className="flex items-center justify-between py-2">
                <span className="font-medium">Cholesterol Med</span>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                  6:00 PM
                </span>
              </p>
            </div>
          </div>

          {/* Call Family */}
          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex items-center">
              <FaPhone className="mr-3 text-3xl text-green-600" />
              <h3 className="text-xl font-bold text-gray-700">Family Calls</h3>
            </div>
            <div className="mt-6 space-y-4">
              <button className="flex w-full items-center justify-between rounded-lg bg-green-500 px-4 py-3 text-white hover:bg-green-600">
                <span className="text-lg font-medium">
                  Call Susan (Daughter)
                </span>
                <FaPhone />
              </button>
              <button className="flex w-full items-center justify-between rounded-lg bg-green-500 px-4 py-3 text-white hover:bg-green-600">
                <span className="text-lg font-medium">Call Robert (Son)</span>
                <FaPhone />
              </button>
            </div>
          </div>

          {/* Daily Check-in */}
          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex items-center">
              <FaCalendarCheck className="mr-3 text-3xl text-blue-600" />
              <h3 className="text-xl font-bold text-gray-700">
                Daily Check-in
              </h3>
            </div>
            <div className="mt-4">
              <p className="mb-4 text-gray-600">How are you feeling today?</p>
              <div className="grid grid-cols-3 gap-2">
                <button className="rounded-lg bg-green-100 p-3 text-green-700 hover:bg-green-200">
                  Great
                </button>
                <button className="rounded-lg bg-yellow-100 p-3 text-yellow-700 hover:bg-yellow-200">
                  Okay
                </button>
                <button className="rounded-lg bg-red-100 p-3 text-red-700 hover:bg-red-200">
                  Not well
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="mt-8">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex items-center mb-4">
              <FaFilePdf className="mr-3 text-3xl text-red-600" />
              <h3 className="text-xl font-bold text-gray-700">
                Medical Documents
              </h3>
            </div>

            <div
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
              onClick={triggerFileInput}
            >
              <div className="flex flex-col items-center justify-center py-6">
                <FaFileUpload className="text-4xl text-red-400 mb-3" />
                <p className="text-lg font-medium text-gray-700">
                  Upload PDF Documents
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Click to select files or drag and drop
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="application/pdf"
                  multiple
                />
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">
                  Selected Files ({uploadedFiles.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-100 p-3 rounded-lg"
                    >
                      <div className="flex items-center">
                        <FaFilePdf className="text-red-500 mr-2" />
                        <span className="text-gray-800 truncate max-w-xs">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center">
                  <button
                    onClick={handleFileUpload}
                    disabled={uploadStatus === "uploading"}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 disabled:opacity-70 flex items-center"
                  >
                    {uploadStatus === "uploading"
                      ? "Uploading..."
                      : "Upload Documents"}
                  </button>

                  {uploadStatus === "success" && (
                    <span className="ml-3 text-green-600">
                      Files uploaded successfully!
                    </span>
                  )}
                  {uploadStatus === "error" && (
                    <span className="ml-3 text-red-600">
                      Upload failed. Please try again.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-2">
                Recently Uploaded Documents
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-200 py-3">
                  <div className="flex items-center">
                    <FaFilePdf className="text-red-500 mr-2" />
                    <span>Medical History.pdf</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Uploaded 2 days ago
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-200 py-3">
                  <div className="flex items-center">
                    <FaFilePdf className="text-red-500 mr-2" />
                    <span>Prescription Details.pdf</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Uploaded 1 week ago
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                    <FaFilePdf className="text-red-500 mr-2" />
                    <span>Insurance Information.pdf</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Uploaded 3 weeks ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Emergency Modal with dynamic content based on status */}
      {showEmergencyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="max-w-md rounded-xl bg-white p-8 shadow-xl">
            <h3 className="mb-6 text-2xl font-bold text-red-600">
              Emergency Assistance
            </h3>

            {emergencyStatus === "sending" && (
              <p className="mb-6 text-lg">Sending your emergency request...</p>
            )}

            {emergencyStatus === "error" && (
              <p className="mb-6 text-lg text-red-600">
                There was a problem sending your request. Staff has been
                notified by our backup system.
              </p>
            )}

            {(emergencyStatus === "success" || emergencyStatus === null) && (
              <p className="mb-6 text-lg">
                Help has been requested. A caretaker will be with you shortly.
              </p>
            )}

            <p className="mb-8 text-lg font-bold">
              Please remain calm and stay where you are.
            </p>
            <button
              className="w-full rounded-lg bg-blue-500 py-3 text-xl font-bold text-white hover:bg-blue-600"
              onClick={() => {
                setShowEmergencyModal(false);
                // Reset status after modal is closed
                setTimeout(() => setEmergencyStatus(null), 300);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
