"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewResident() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("name");
    setDisplayName(name);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Show loading page immediately when user submits
    router.push("/loading");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      name: localStorage.getItem("name"), 
      password: localStorage.getItem("password"), 
      age: formData.get("age")
        ? parseInt(formData.get("age") as string, 10)
        : null,
      medicalConditions: formData.get("medicalConditions")?.toString() || null,
      medications: formData.get("medications")?.toString() || null,
      foodAllergies: formData.get("foodAllergies")?.toString() || null,
      specialSupportiveServices:
        formData.get("specialSupportiveServices")?.toString() || null,
    };

    localStorage.setItem("residentData", JSON.stringify(data));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50">
      <h1 className="mb-8 text-3xl font-bold">
        Welcome, {displayName || "Resident"}!
      </h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 bg-white p-6 rounded-lg shadow-md"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">Age</label>
          <input
            type="number"
            name="age"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter age"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Medical Conditions
          </label>
          <textarea
            name="medicalConditions"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter any medical conditions"
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Medications
          </label>
          <textarea
            name="medications"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter medications currently being taken"
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Food Allergies
          </label>
          <textarea
            name="foodAllergies"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter any food allergies"
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Special Supportive Services
          </label>
          <textarea
            name="specialSupportiveServices"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter any special supportive services needed"
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-red-500 py-2 px-4 text-white hover:bg-red-600"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
