import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MyDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      const res = await axios.get("http://localhost:5000/submit_application/drafts", {
        headers: user ? { "x-user-id": user.id } : {},
        withCredentials: true,
      });
      setDrafts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch drafts:", err.response?.data || err.message);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    try {
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      await axios.delete(`http://localhost:5000/submit_application/drafts/${id}`, {
        headers: user ? { 'x-user-id': user.id } : {},
        withCredentials: true,
      });
      // refresh list
      fetchDrafts();
    } catch (err) {
      console.error('Failed to delete draft:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to delete draft');
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-2xl font-bold mb-6">My Drafts</h1>
      {loading ? (
        <p>Loading...</p>
      ) : drafts.length === 0 ? (
        <p className="text-gray-600">No drafts yet. Start a new application from Programs.</p>
      ) : (
        <div className="space-y-4">
          {drafts.map((d) => (
            <div key={d.id} className="p-4 border rounded-md flex justify-between items-center">
              <div>
                <div className="font-semibold">{d.program_name || "(No program)"}</div>
                <div className="text-sm text-gray-600">{d.full_name || "—"} • {new Date(d.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/program-details', { state: { programName: d.program_name, draft: d } })}
                  className="px-4 py-2 bg-blue-700 text-white rounded-md"
                >
                  Continue
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-md"
                >
                  Delete
                </button>
                <a href={`http://localhost:5000/${d.letter_of_intent || ''}`} target="_blank" rel="noreferrer" className="text-sm text-gray-500">View LOI</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
