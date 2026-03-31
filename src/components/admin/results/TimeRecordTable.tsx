"use client";

interface TimeRecordRow {
  id: string;
  riderName: string;
  teamName: string;
  teamColor: string;
  checkpointName: string;
  checkpointType: string;
  timestamp: string;
  isManual: boolean;
  entryId: string;
  checkpointId: string;
}

interface TimeRecordTableProps {
  records: TimeRecordRow[];
  onEdit: (entryId: string, checkpointId: string, currentTime: string) => void;
}

export function TimeRecordTable({ records, onEdit }: TimeRecordTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Coureur</th>
            <th className="px-3 py-2">Équipe</th>
            <th className="px-3 py-2">Checkpoint</th>
            <th className="px-3 py-2">Heure</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{r.riderName}</td>
              <td className="px-3 py-2">
                <span
                  className="inline-block h-3 w-3 rounded-full mr-1"
                  style={{ backgroundColor: r.teamColor }}
                />
                {r.teamName}
              </td>
              <td className="px-3 py-2">{r.checkpointName}</td>
              <td className="px-3 py-2 font-mono">
                {new Date(r.timestamp).toLocaleTimeString("fr-FR")}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    r.isManual
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {r.isManual ? "Manuel" : "GPS"}
                </span>
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() =>
                    onEdit(r.entryId, r.checkpointId, r.timestamp)
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  Corriger
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
