"use client";
import { useState } from "react";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, password }),
    });

    if (response.ok) {
      const data = await response.json();
      const assignedAgentName = data.agent?.name;
      const residentName = data.resident_name;
      if (data.success) {
        window.location.href = `/resident-portal?agentName=${encodeURIComponent(
          assignedAgentName
        )}&residentName=${residentName || "unknown"}&residentId=${
          data.resident_id || "unknown"
        }`;
      } else {
        setError(data.message || "Invalid credentials");
      }
    } else {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50">
      <h1 className="mb-8 text-3xl font-bold">Login</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 bg-white p-6 rounded-lg shadow-md"
      >
        {error && <p className="text-red-500">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter your name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            4-Digit PIN
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 shadow-sm focus:border-red-400 focus:ring focus:ring-red-200"
            placeholder="Enter your PIN"
            maxLength={4}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-red-500 py-2 px-4 text-white hover:bg-red-600"
        >
          Login
        </button>
      </form>
    </div>
  );
}
