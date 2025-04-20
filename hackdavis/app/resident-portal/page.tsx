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
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [medications, setMedications] = useState([
    { name: "Blood Pressure Med", time: "8:00 AM", status: "pending" },
    { name: "Vitamin D", time: "9:00 AM", status: "taken" },
    { name: "Cholesterol Med", time: "6:00 PM", status: "pending" },
  ]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedTime, setNewMedTime] = useState("");
  const [showMedForm, setShowMedForm] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState([
    { name: "Medical History.pdf", uploadedDate: "2 days ago" },
    { name: "Prescription Details.pdf", uploadedDate: "1 week ago" },
  ]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    age: "",
    medicalConditions: "",
    medications: "",
    foodAllergies: "",
    specialSupportiveServices: "",
  });
  const [showEmergencyInput, setShowEmergencyInput] = useState(false);
  const [emergencyDescription, setEmergencyDescription] = useState("");
  const [showCareRequestInput, setShowCareRequestInput] = useState(false);
  const [careRequestDescription, setCareRequestDescription] = useState("");
  const [careRequestStatus, setCareRequestStatus] = useState<
    "sending" | "success" | "error" | null
  >(null);

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
            description: emergencyDescription || "No details provided",
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

      // Reset the description field
      setEmergencyDescription("");
      setShowEmergencyInput(false);
    } catch (error) {
      console.error("Failed to send emergency request:", error);
      setEmergencyStatus("error");
    }
  };

  const handleCareRequest = async () => {
    try {
      // Set status to sending
      setCareRequestStatus("sending");

      // Make API call to backend
      const response = await fetch(
        "http://localhost:8000/request-non-emergency-care",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            residentId,
            residentName,
            timestamp: new Date().toISOString(),
            description:
              careRequestDescription || "General assistance requested",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Set status to success
      setCareRequestStatus("success");

      // Get and process response data
      const data = await response.json();
      console.log("Care request sent successfully:", data);

      // Reset the description field and close modal after a short delay
      setTimeout(() => {
        setCareRequestDescription("");
        setShowCareRequestInput(false);
        setCareRequestStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to send care request:", error);
      setCareRequestStatus("error");
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

    // Debug what residentId actually is
    console.log("ResidentId before parsing:", residentId);

    const parsedId = parseInt(residentId);
    console.log("Parsed residentId:", parsedId);

    if (isNaN(parsedId)) {
      console.error("Invalid resident ID - cannot parse to integer");
      setUploadStatus("error");
      return;
    }

    setUploadStatus("uploading");
    try {
      const file = uploadedFiles[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resident_id", String(parsedId));

      // Log the form data to verify it's being set correctly
      console.log("Form data resident_id:", formData.get("resident_id"));

      const response = await fetch(
        "http://localhost:8000/upload-medical-history-pdf",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      setUploadStatus("success");
      const data = await response.json();
      console.log("Upload response:", data);

      // Add the newly uploaded files to the recent documents list
      const newRecentDocs = uploadedFiles.map((file) => ({
        name: file.name,
        uploadedDate: "Just now",
      }));

      // Combine with existing documents, keeping only the most recent ones
      setRecentDocuments(
        (prev) => [...newRecentDocs, ...prev].slice(0, 5) // Keeping only 5 most recent documents
      );

      // Clear the uploaded files list after successful upload
      setUploadedFiles([]);
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

  // Function to handle mood selection
  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
  };

  // Function to add new medication
  const addMedication = () => {
    if (newMedName.trim() === "" || newMedTime.trim() === "") return;

    // Format time to include AM/PM
    const timeObj = new Date(`2023-01-01T${newMedTime}`);
    const formattedTime = timeObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const newMed = {
      name: newMedName,
      time: formattedTime,
      status: "pending",
    };

    setMedications([...medications, newMed]);
    setNewMedName("");
    setNewMedTime("");
    setShowMedForm(false);
  };

  // Function to toggle medication status
  const toggleMedicationStatus = (index: number) => {
    const updatedMeds = [...medications];
    updatedMeds[index].status =
      updatedMeds[index].status === "taken" ? "pending" : "taken";
    setMedications(updatedMeds);
  };

  // Add this function to load profile data
  const loadProfileData = () => {
    // Try to get data from localStorage first
    const storedData = localStorage.getItem("residentData");

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setProfileData({
          name: parsedData.name || residentName || "",
          age: parsedData.age?.toString() || "",
          medicalConditions: parsedData.medicalConditions || "",
          medications: parsedData.medications || "",
          foodAllergies: parsedData.foodAllergies || "",
          specialSupportiveServices: parsedData.specialSupportiveServices || "",
        });
      } catch (error) {
        console.error("Error parsing stored resident data:", error);
      }
    } else {
      // Set default values based on current resident name
      setProfileData({
        name: residentName || "",
        age: "",
        medicalConditions: "",
        medications: "",
        foodAllergies: "",
        specialSupportiveServices: "",
      });
    }

    setShowProfileModal(true);
  };

  // Add this function to save profile data
  const saveProfileData = async () => {
    try {
      // Save to localStorage
      const dataToSave = {
        name: profileData.name,
        password: localStorage.getItem("password") || "",
        age: profileData.age ? parseInt(profileData.age, 10) : null,
        medicalConditions: profileData.medicalConditions || null,
        medications: profileData.medications || null,
        foodAllergies: profileData.foodAllergies || null,
        specialSupportiveServices:
          profileData.specialSupportiveServices || null,
      };

      localStorage.setItem("residentData", JSON.stringify(dataToSave));

      // Save to Supabase
      const parsedId = parseInt(residentId);

      if (!isNaN(parsedId)) {
        const response = await fetch(
          "http://localhost:8000/update-resident-profile",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              resident_id: parsedId,
              ...dataToSave,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update profile: ${response.status}`);
        }

        const result = await response.json();
        console.log("Profile updated successfully:", result);
      }

      setShowProfileModal(false);
    } catch (error) {
      console.error("Error saving profile data:", error);
      alert("There was a problem saving your profile. Please try again.");
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
          <button
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            onClick={loadProfileData}
          >
            Profile
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
        {/* Emergency and Care Request Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* HELP ME Card */}
          <button
            onClick={() => setShowEmergencyInput(true)}
            className="flex flex-col items-center justify-center rounded-xl bg-red-600 p-8 text-white shadow-lg transition hover:bg-red-700 hover:shadow-xl"
          >
            <FaExclamationTriangle className="mb-4 text-6xl" />
            <h3 className="text-3xl font-bold">HELP ME</h3>
            <p className="mt-2 text-lg">For emergency assistance</p>
          </button>

          {/* REQUEST CARE Card */}
          <button
            onClick={() => setShowCareRequestInput(true)}
            className="flex flex-col items-center justify-center rounded-xl bg-blue-500 p-8 text-white shadow-lg transition hover:bg-blue-600 hover:shadow-xl"
          >
            <FaUserNurse className="mb-4 text-6xl" />
            <h3 className="text-3xl font-bold">REQUEST CARE</h3>
            <p className="mt-2 text-lg">For non-emergency assistance</p>
          </button>
        </div>

        {/* Additional Features Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Medication Reminder - Updated */}
          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaPills className="mr-3 text-3xl text-purple-600" />
                <h3 className="text-xl font-bold text-gray-700">Medications</h3>
              </div>
              <button
                onClick={() => setShowMedForm(!showMedForm)}
                className="rounded-full bg-purple-100 p-2 text-purple-600 hover:bg-purple-200"
              >
                {showMedForm ? "×" : "+"}
              </button>
            </div>

            {showMedForm && (
              <div className="mt-4 rounded-lg bg-purple-50 p-3">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Medication Name
                  </label>
                  <input
                    type="text"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter medication name"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newMedTime}
                    onChange={(e) => setNewMedTime(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={addMedication}
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    Add Medication
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {medications.map((med, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-gray-200 py-2"
                  onClick={() => toggleMedicationStatus(index)}
                  style={{ cursor: "pointer" }}
                >
                  <span className="font-medium">{med.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      med.status === "taken"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {med.status === "taken" ? "Taken" : med.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Call Family */}
          <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex items-center">
              <FaPhone className="mr-3 text-3xl text-green-600" />
              <h3 className="text-xl font-bold text-gray-700">Family Calls</h3>
            </div>
            <div className="mt-6 space-y-4">
              <button className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-white transition bg-green-500 hover:bg-green-600">
                <span className="text-lg font-medium">
                  Call Susan (Daughter)
                </span>
                <FaPhone />
              </button>

              <button className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-white transition bg-green-500 hover:bg-green-600">
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
                <button
                  className={`rounded-lg p-3 transition ${
                    selectedMood === "great"
                      ? "bg-green-300 text-green-800"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                  onClick={() => handleMoodSelect("great")}
                >
                  Great
                </button>
                <button
                  className={`rounded-lg p-3 transition ${
                    selectedMood === "okay"
                      ? "bg-yellow-300 text-yellow-800"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  }`}
                  onClick={() => handleMoodSelect("okay")}
                >
                  Okay
                </button>
                <button
                  className={`rounded-lg p-3 transition ${
                    selectedMood === "notWell"
                      ? "bg-red-300 text-red-800"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                  onClick={() => handleMoodSelect("notWell")}
                >
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
                {recentDocuments.length > 0 ? (
                  recentDocuments.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b border-gray-200 py-3"
                    >
                      <div className="flex items-center">
                        <FaFilePdf className="text-red-500 mr-2" />
                        <span>{doc.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Uploaded {doc.uploadedDate}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 py-3">
                    No documents have been uploaded yet.
                  </p>
                )}
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

      {/* Emergency Input Modal */}
      {showEmergencyInput && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4 z-50">
          <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-red-600">
                Request Emergency Help
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => setShowEmergencyInput(false)}
              >
                ×
              </button>
            </div>

            <p className="mb-4">
              If this is an urgent emergency, click &quot;Send Request&quot;
              immediately. Optionally, you can provide more details below:
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your emergency (optional)
              </label>
              <textarea
                value={emergencyDescription}
                onChange={(e) => setEmergencyDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="What kind of help do you need?"
                rows={3}
              ></textarea>
            </div>

            <div className="flex items-center justify-between">
              <button
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowEmergencyInput(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700 font-bold"
                onClick={handleEmergencyRequest}
                disabled={emergencyStatus === "sending"}
              >
                {emergencyStatus === "sending" ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Care Request Input Modal */}
      {showCareRequestInput && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4 z-50">
          <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-blue-600">
                Request Care Assistance
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => setShowCareRequestInput(false)}
              >
                ×
              </button>
            </div>

            {careRequestStatus === "success" ? (
              <div className="p-6 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-800 mb-2">
                  Care request sent successfully!
                </p>
                <p className="text-gray-600">
                  A caregiver will assist you soon.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4">
                  Please describe what type of assistance you need:
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your needs
                  </label>
                  <textarea
                    value={careRequestDescription}
                    onChange={(e) => setCareRequestDescription(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Need help getting dressed, Need assistance with meal, etc."
                    rows={3}
                  ></textarea>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                    onClick={() => setShowCareRequestInput(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 font-bold"
                    onClick={handleCareRequest}
                    disabled={careRequestStatus === "sending"}
                  >
                    {careRequestStatus === "sending" ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Send Request"
                    )}
                  </button>
                </div>
              </>
            )}

            {careRequestStatus === "error" && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  There was a problem sending your request. Please try again or
                  call for assistance.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4 z-50">
          <div className="max-w-lg w-full rounded-xl bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Profile Information
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowProfileModal(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      name: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Age
                </label>
                <input
                  type="number"
                  value={profileData.age}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      age: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Medical Conditions
                </label>
                <textarea
                  value={profileData.medicalConditions}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      medicalConditions: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  rows={3}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Medications
                </label>
                <textarea
                  value={profileData.medications}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      medications: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  rows={3}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Food Allergies
                </label>
                <textarea
                  value={profileData.foodAllergies}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      foodAllergies: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  rows={2}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Special Supportive Services
                </label>
                <textarea
                  value={profileData.specialSupportiveServices}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      specialSupportiveServices: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  rows={2}
                ></textarea>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                onClick={saveProfileData}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
