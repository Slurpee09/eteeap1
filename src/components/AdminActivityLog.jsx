import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import axios from "axios";

function AdminActivityLog() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [availableActions, setAvailableActions] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch logs from backend ---
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:5000/admin/activity-logs", {
          headers: {
            "x-user-id": localStorage.getItem("userId") || "",
          },
        });

        // Ensure each log has the required fields
        const safeLogs = (response.data || []).map((log) => ({
          id: log.id,
          date: log.date || "",
          user: log.user || "Unknown User",
          action: log.action || "",
          details: log.details || "",
        }));

        setLogs(safeLogs);

        // Build unique action list for filtering
        const actions = Array.from(new Set(safeLogs.map(l => l.action).filter(Boolean))).sort();
        setAvailableActions(actions);
      } catch (err) {
        console.error("Error fetching activity logs:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // --- Filter logs ---
  const filtered = logs.filter((log) => {
    const m1 =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const m2 = filterAction === "All" || log.action === filterAction;
    const m3 = filterDate ? log.date.includes(filterDate) : true;
    return m1 && m2 && m3;
  });

  // --- Export CSV ---
  function exportCSV() {
    const rows = [["Date", "User", "Action", "Details"]];
    filtered.forEach((r) => rows.push([r.date, r.user, r.action, r.details]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "activity_logs.csv";
    a.click();
  }

  if (loading) {
    return <div className="p-4 text-center">Loading activity logs...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-blue-800 mb-5">Activity Log</h2>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Search activity..."
          className="border px-3 py-2 rounded-lg shadow-sm flex-1 min-w-[180px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border px-3 py-2 rounded-lg shadow-sm min-w-[150px] w-full sm:w-auto"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option>All</option>
          {availableActions.map(a => <option key={a}>{a}</option>)}
        </select>

        <input
          type="date"
          className="border px-3 py-2 rounded-lg shadow-sm min-w-[140px]"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition w-full sm:w-auto justify-center"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Table for medium and up screens */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[600px] text-left">
          <thead className="bg-blue-800 text-white">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filtered.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No matching activity found.
                </td>
              </tr>
            )}

            {filtered.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50 transition">
                <td className="p-3">{log.date}</td>
                <td className="p-3">{log.user}</td>
                <td className="p-3 font-semibold text-blue-700">{log.action}</td>
                <td className="p-3">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card layout for small screens */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="p-4 text-center text-gray-500 border rounded-lg">
            No matching activity found.
          </div>
        )}

        {filtered.map((log) => (
          <div key={log.id} className="border rounded-lg p-4 shadow-sm bg-white">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-600">Date:</span>
              <span>{log.date}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-600">User:</span>
              <span>{log.user}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-600">Action:</span>
              <span className="font-semibold text-blue-700">{log.action}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Details:</span>
              <span>{log.details}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminActivityLog;
