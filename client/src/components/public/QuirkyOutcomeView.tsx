import React from "react";
import { useSessionParams } from "@/lib/page-params";
import { useQuery } from "@tanstack/react-query";

interface QuirkyOutcomeViewProps {
  status: string;
  statusKeyword: string;
}

export function QuirkyOutcomeView({ status, statusKeyword }: QuirkyOutcomeViewProps) {
  const params = useSessionParams();
  
  // Fetch respondent stats from API
  const { data: stats, isLoading } = useQuery({
    queryKey: ['respondent-stats', params.session],
    queryFn: async () => {
      if (!params.session || params.session === '-') return null;
      const res = await fetch(`/api/respondent-stats/${params.session}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!params.session && params.session !== '-',
  });

  // Sanitize values
  const sanitize = (val: string | null | undefined) => {
    if (!val) return '-';
    const placeholders = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', '-'];
    if (placeholders.includes(val.toLowerCase().trim())) return '-';
    return val;
  };

  // Use API data if available, otherwise fallback to URL params
  const displayUid = sanitize(stats?.supplierRid || params.uid);
  const displayPid = sanitize(stats?.projectCode || params.pid);
  const displayIp = stats?.ip || params.ip || '-';
  const displayLoi = stats?.loi !== undefined ? `${stats.loi} mins` : (params.loi || '-');
  
  // Format date if it comes from API
  let displayDate = params.timestamp || '-';
  if (stats?.endTime) {
    const d = new Date(stats.endTime * 1000);
    displayDate = d.toLocaleString();
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000", fontFamily: '"Muli", sans-serif' }}>
      <style>{`
        .page-title-area {
          position: relative;
          z-index: 1;
          background-repeat: no-repeat;
          background-position: right top;
          background-size: 39%;
        }

        .page-title-content {
          margin-top: 0px;
          font-family: "Muli", sans-serif;
          position: relative;
          z-index: 4;
        }

        .page-title-content h1 {
          padding-top: 220px;
          color: #000000;
          text-align: center;
          margin-bottom: 50px;
          font-size: 45px;
          font-weight: 500;
        }

        .navbar-quirky {
          background-color: #000;
        }
        
        .table-quirky th, .table-quirky td {
          border: 1px solid #dee2e6;
          padding: 0.75rem;
          vertical-align: top;
          color: black;
          text-align: center;
        }
        .table-quirky th {
          border-bottom: 2px solid #dee2e6;
          font-weight: bold;
        }

        .back-to-home {
          padding-left: 0;
          margin-bottom: 0;
          list-style-type: none;
        }
      `}</style>

      {/* Navbar removed */}

      <main className="w-full">
        <section className="page-title-area">
          <div className="table w-full">
            <div className="table-cell align-middle">
              <div className="container mx-auto max-w-7xl px-4">
                <div className="page-title-content text-center">
                  <center>
                    <h1 style={{ color: "black" }}>
                      <b>Thank you ! <br /> Your survey has been <span style={{ textTransform: "uppercase", color: "red", textDecoration: "underline" }}>{statusKeyword}</span></b>
                    </h1>
                  </center>
                  <ul className="back-to-home"></ul>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto max-w-7xl px-4 mt-8 pb-20">
            <div className="w-full overflow-x-auto">
              <table className="w-full table-quirky border-collapse bg-white">
                <tbody>
                  <tr>
                    <th>UID</th>
                    <th>PID</th>
                    <th>STATUS</th>
                    <th>IP Address</th>
                    <th>LOI</th>
                    <th>Date</th>
                  </tr>
                  <tr>
                    <td>{isLoading ? 'Loading...' : displayUid}</td>
                    <td>{isLoading ? 'Loading...' : displayPid}</td>
                    <td>{status}</td>
                    <td>{isLoading ? 'Loading...' : displayIp}</td>
                    <td>{isLoading ? 'Loading...' : displayLoi}</td>
                    <td>{isLoading ? 'Loading...' : displayDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
