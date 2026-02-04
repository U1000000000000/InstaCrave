
import React, { useEffect, useState } from 'react';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import { sessionsApi } from '../../services/api';
import '../../styles/profile.css';

function parseOS(userAgent) {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('Mac OS X')) return 'MacOS';
  if (userAgent.includes('Windows NT')) return 'Windows';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Other';
}

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revoking, setRevoking] = useState(null);

  // Use useProtectedRequest for fetching sessions
  const { data: sessionsData, loading: sessionsLoading, error: sessionsError, refetch } = useProtectedRequest(
    () => sessionsApi.listSessions(),
    []
  );

  useEffect(() => {
    setLoading(sessionsLoading);
    if (sessionsError) setError(sessionsError?.message || 'Failed to fetch sessions');
    if (sessionsData) {
      setSessions(sessionsData.data || []);
      setError(null);
    }
  }, [sessionsData, sessionsLoading, sessionsError]);

  const handleRevoke = async (sessionId) => {
    setRevoking(sessionId);
    setError(null);
    try {
      await sessionsApi.revokeSession(sessionId);
      // Refetch sessions after revoke
      refetch();
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const currentSessionId = sessions.length > 0 ? sessions[0]._id : null;
  // Try to detect current session by matching createdAt/lastUsedAt with now (approx)
  const now = Date.now();
  const findCurrentSession = () => {
    // Heuristic: session with lastUsedAt within 2 minutes of now
    return sessions.find(s => Math.abs(new Date(s.lastUsedAt).getTime() - now) < 2 * 60 * 1000)?. _id || null;
  };
  const activeSessionId = findCurrentSession() || currentSessionId;

  return (
    <div style={{maxWidth: 600, margin: '0 auto', padding: '32px 8px'}}>
      <h1 style={{fontSize: 36, fontWeight: 800, color: 'var(--color-text)', margin: 0, letterSpacing: '-1.5px'}}>Active Sessions</h1>
      <div style={{height: 1, background: 'var(--color-border)', margin: '18px 0 18px 0'}} />
      <div style={{color: 'var(--color-text-secondary)', fontSize: 18, marginBottom: 24}}>Manage your logged-in devices. Only your OS and session times are shown for privacy.</div>
      <div style={{overflowX: 'auto'}}>
        {loading ? (
          <p style={{color: 'var(--color-accent)'}}>Loading sessions...</p>
        ) : error ? (
          <div className="error-message" style={{color: 'var(--color-danger)', marginBottom: 16}}>{error}</div>
        ) : sessions.length === 0 ? (
          <p style={{color: 'var(--color-text-secondary)'}}>No active sessions found.</p>
        ) : (
          <table className="sessions-table" style={{width: '100%', borderCollapse: 'collapse', background: 'none', fontSize: 16}}>
            <thead>
              <tr>
                <th style={{padding: '10px 8px', color: 'var(--color-accent)', fontWeight: 700, textAlign: 'left'}}>Device</th>
                <th style={{padding: '10px 8px'}}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const isCurrent = session._id === activeSessionId;
                return (
                  <tr key={session._id} style={{opacity: isCurrent ? 0.7 : 1}}>
                    <td style={{padding: '14px 8px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-accent)' : 'var(--color-text)'}}>
                      {parseOS(session.userAgent)}
                      {isCurrent && <span style={{marginLeft: 8, color: 'var(--color-accent)', fontSize: 14, fontWeight: 700}}>(Current Session)</span>}
                      <div style={{fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2}}>
                        Created: {new Date(session.createdAt).toLocaleString()}<br/>
                        Last Used: {new Date(session.lastUsedAt).toLocaleString()}
                      </div>
                    </td>
                    <td style={{padding: '14px 8px', textAlign: 'right'}}>
                      {!isCurrent && (
                        <button
                          onClick={() => handleRevoke(session._id)}
                          disabled={revoking === session._id}
                          style={{
                            background: 'var(--color-accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '7px 18px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 4px rgba(226,55,71,0.08)',
                            opacity: revoking === session._id ? 0.6 : 1,
                            transition: 'background 0.15s',
                          }}
                        >
                          {revoking === session._id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Sessions;
