"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewResidentSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    localStorage.setItem("name", name);
    localStorage.setItem("password", password);

    // Navigate to the New Resident page
    router.push("/new-resident-setup/new-resident");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50">
      <h1 className="mb-8 text-3xl font-bold">Welcome! Let’s Get Started</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 bg-white p-6 rounded-lg shadow-md"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What name would you like us to call you?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter your display name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Pick a simple 4-digit PIN you’ll remember
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter a 4-digit PIN"
            maxLength={4}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-red-500 py-2 px-4 text-white hover:bg-red-600"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
