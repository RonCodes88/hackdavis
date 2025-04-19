"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SelectRole() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-50">
      <h1 className="mb-8 text-3xl font-bold">Select Your Role</h1>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* New Resident Card */}
        <div
          className="flex flex-col items-center space-y-4 border p-6 rounded-lg shadow-md bg-white cursor-pointer"
          onClick={() => router.push("/new-resident-setup")}
        >
          <Image
            src="/resident.avif"
            alt="Resident"
            width={200}
            height={200}
            className="rounded-lg"
          />
          <h2 className="text-xl font-semibold">New Resident</h2>
        </div>

        {/* Existing Resident Card */}
        <div
          className="flex flex-col items-center space-y-4 border p-6 rounded-lg shadow-md bg-white cursor-pointer"
          onClick={() => router.push("/existing-resident")}
        >
          <Image
            src="/caretaker2.jpg"
            alt="Existing Resident"
            width={200}
            height={200}
            className="rounded-lg"
          />
          <h2 className="text-xl font-semibold">Existing Resident</h2>
        </div>

        {/* Caretaker Card */}
        <div
          className="flex flex-col items-center space-y-4 border p-6 rounded-lg shadow-md bg-white cursor-pointer"
          onClick={() => router.push("/caretaker-portal")}
        >
          <Image
            src="/caretaker.jpg"
            alt="Caretaker"
            width={200}
            height={200}
            className="rounded-lg"
          />
          <h2 className="text-xl font-semibold">Caretaker</h2>
        </div>
      </div>
    </div>
  );
}
