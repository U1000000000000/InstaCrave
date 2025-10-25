import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

const CommentsModal = ({ open, onClose, foodId, comments, loading, onFetch, onDelete }) => {
    const currentUserId = window?.user?._id || localStorage.getItem('userId');
  const [deleting, setDeleting] = useState(null);
  const [localComments, setLocalComments] = useState(comments);

    useEffect(() => {
    setLocalComments(comments);
  }, [comments, open]);
  const handleDelete = async (commentId) => {
    if (!commentId) return;
    setDeleting(commentId);
    try {
      await fetch(`${API_BASE_URL}/api/food/delete-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentId })
      });
            setLocalComments(prev => prev.filter(c => c._id !== commentId));
      if (onDelete) onDelete(foodId);
    } catch (err) {
          }
    setDeleting(null);
  };
  useEffect(() => {
    if (open && foodId) {
      onFetch(foodId);
    }
  }, [open, foodId, onFetch]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const handleInputChange = (e) => setCommentText(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !foodId) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/food/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment: commentText.trim(), foodId })
      });
      if (res.ok) {
        setCommentText("");
        if (onFetch) onFetch(foodId);
      } else {
              }
    } catch (err) {
          }
    setPosting(false);
  };
  if (!open) return null;

  return (
    <div
      className="comments-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(30,30,32,0.35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        transition: 'background 0.3s',
      }}
    >
      <div
        className="comments-modal"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          borderRadius: '18px 18px 0 0',
          height: '75vh',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          zIndex: 10000,
          padding: 0,
          marginBottom: 0,
          color: 'var(--color-text)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '16px 0 8px 0',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '1.1rem',
          position: 'relative',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <span>Comments</span>
          <button
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0 0 0',
            maxHeight: 'calc(75vh - 110px)',
            scrollbarColor: 'var(--color-border) var(--color-surface)',
            scrollbarWidth: 'thin',
          }}
          className="comments-scrollable"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>Loading...</div>
          ) : localComments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No bites yet. Drop the first flavor!</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {localComments.map(c => (
                  <li key={c._id} style={{ display: 'flex', alignItems: 'center', padding: '14px 18px 0 18px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '.98rem', color: 'var(--color-text)' }}>{c.user?.fullName || c.user || 'Unknown User'}</div>
                      <div style={{ fontSize: '.97rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{c.comment}</div>
                    </div>
                    {c.user && c.user._id === currentUserId && (
                      <button
                        onClick={() => handleDelete(c._id)}
                        disabled={deleting === c._id}
                        className="comment-delete-btn"
                        title="Delete comment"
                        aria-label="Delete comment"
                        style={{
                          background: 'none',
                          border: 'none',
                          marginLeft: 12,
                          padding: 0,
                          cursor: deleting === c._id ? 'not-allowed' : 'pointer',
                          opacity: deleting === c._id ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {deleting === c._id ? '...' : (
                          <svg className="comment-delete-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        )}
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 18px 18px', background: 'var(--color-surface)', borderTop: 'none' }}>
          <input
            className="comments-input"
            placeholder="Add a comment..."
            value={commentText}
            onChange={handleInputChange}
            disabled={posting}
            style={{
              flex: 1,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--color-text)',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={posting || !commentText.trim()}
            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 700, fontSize: '1rem', cursor: posting ? 'not-allowed' : 'pointer', padding: '0 8px', opacity: posting || !commentText.trim() ? 0.6 : 1 }}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsModal;
