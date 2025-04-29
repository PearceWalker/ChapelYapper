// pages/admin.jsx
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.email !== "pearcewalker11@gmail.com" || session.user.email !== "pearce.walker@students.fhu.edu") {
      router.push("/rooms");
    } else {
      import("socket.io-client").then(({ io }) => {
        const sock = io();
        setConnection(sock);

        sock.emit("fetchReports");

        sock.on("reports", (data) => {
          setReports(data);
        });

        return () => sock.disconnect();
      });
    }
  }, [session, status, router]);

  const handleRemovePost = (reportId, postId) => {
    connection.emit("removePost", { reportId, postId });
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleDeclineReport = (reportId) => {
    connection.emit("declineReport", { reportId });
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  return (
    <div className="p-6 text-white max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Reports Panel</h1>
      {reports.length === 0 ? (
        <p className="text-gray-400">No reports found.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-zinc-800 p-4 rounded-md border border-zinc-700">
              <p className="mb-2"><strong>Post:</strong> {report.message}</p>
              <p className="text-sm text-gray-400 mb-1"><strong>Reason:</strong> {report.reason}</p>
              <p className="text-sm text-gray-500 mb-1"><strong>Reported At:</strong> {new Date(report.timestamp).toLocaleString()}</p>
              <p className="text-xs text-yellow-300"><strong>Posted By:</strong> {report.poster_email}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleRemovePost(report.id, report.post_id)} className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm">Remove Post</button>
                <button onClick={() => handleDeclineReport(report.id)} className="px-4 py-1 bg-zinc-600 hover:bg-zinc-700 rounded-md text-sm">Decline Report</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
