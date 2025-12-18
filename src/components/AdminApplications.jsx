import React, { useState } from "react";

const initialApplications = [
  { id: 1, name: "John Doe", program: "BSBA - Marketing", status: "Pending" },
  { id: 2, name: "Jane Smith", program: "BA English", status: "Approved" },
  { id: 3, name: "Mark Johnson", program: "BSBA - HRM", status: "Rejected" },
];

const AdminApplications = () => {
  const [applications, setApplications] = useState(initialApplications);
  const [search, setSearch] = useState("");

  const filtered = applications.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatus = (id, status) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">
        Applications Overview
      </h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search applicant..."
          className="border px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-blue-100 text-blue-900 text-left">
            <th className="p-3 border">Applicant</th>
            <th className="p-3 border">Program</th>
            <th className="p-3 border">Status</th>
            <th className="p-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((app) => (
            <tr key={app.id} className="border hover:bg-blue-50">
              <td className="p-3 border">{app.name}</td>
              <td className="p-3 border">{app.program}</td>
              <td className="p-3 border">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    app.status === "Approved"
                      ? "bg-green-100 text-green-700"
                      : app.status === "Rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {app.status}
                </span>
              </td>
              <td className="p-3 border space-x-2">
                <button
                  onClick={() => handleStatus(app.id, "Approved")}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatus(app.id, "Rejected")}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminApplications;