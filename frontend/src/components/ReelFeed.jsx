import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CommentsModal from './CommentsModal'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import { FaRegHeart, FaHeart, FaRegComment, FaRegBookmark, FaBookmark, FaShareAlt } from 'react-icons/fa'
import ShareModal from './ShareModal';

const ReelFeed = ({ items = [], onLike, onSave, onComment, onFollow, emptyMessage = 'No videos yet.', customRender }) => {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const timeout = setTimeout(() => {
      setHearts(hs => hs.slice(1));
    }, 700);
    return () => clearTimeout(timeout);
  }, [hearts]);

  const lastTapRef = useRef({});
  const lastTapPosRef = useRef({});
  const manuallyPausedRef = useRef({});
  const DOUBLE_TAP_DELAY = 350;
  const MAX_TAP_DIST = 30;

  const [videoStates, setVideoStates] = useState({});

  const videoRefs = useRef(new Map());
  const setVideoRef = useCallback(
    (id) => (el) => {
      if (el) {
        videoRefs.current.set(id, el);
        if (!el._hasPlayPauseListeners) {
          el.addEventListener('play', () => {
            setVideoStates((prev) => ({ ...prev, [id]: { paused: false } }));
          });
          el.addEventListener('pause', () => {
            setVideoStates((prev) => ({ ...prev, [id]: { paused: true } }));
          });
          setVideoStates((prev) => ({ ...prev, [id]: { paused: el.paused } }));
          el._hasPlayPauseListeners = true;
        }
      }
    },
    []
  );

  function handlePointerDown(e, item) {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.insta-action-group')) {
      return;
    }
    
    const now = Date.now();
    const bounding = e.currentTarget.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - bounding.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - bounding.top;
    const lastTap = lastTapRef.current[item._id] || 0;
    const lastPos = lastTapPosRef.current[item._id] || { x: 0, y: 0 };
    const dist = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2));
    
    if (now - lastTap < DOUBLE_TAP_DELAY && dist < MAX_TAP_DIST) {
      setHearts(hs => [...hs, { id: Date.now(), x, y, reelId: item._id }]);
      if (!item.isLiked) handleLike(item);
    } else {
      setTimeout(() => {
        const currentTime = Date.now();
        if (currentTime - lastTapRef.current[item._id] >= DOUBLE_TAP_DELAY - 50) {
          const video = videoRefs.current.get(item._id);
          if (video) {
            if (video.paused) {
              video.play().catch(() => {});
              manuallyPausedRef.current[item._id] = false;
            } else {
              video.pause();
              manuallyPausedRef.current[item._id] = true;
            }
          }
        }
      }, DOUBLE_TAP_DELAY);
    }
    
    lastTapRef.current[item._id] = now;
    lastTapPosRef.current[item._id] = { x, y };
  }
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const openShareModal = useCallback((item) => {
    setShareUrl(`${window.location.origin}/reels/${item._id}`);
    setShareModalOpen(true);
    setCopied(false);
    setCurrentShareItem(item);
  }, []);

  const [currentShareItem, setCurrentShareItem] = useState(null);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [shareUrl]);

  const handleShareCount = async (item) => {
    setLocalItems(prev => prev.map(i =>
      i._id === item._id
        ? { ...i, shareCount: (i.shareCount || 0) + 1 }
        : i
    ));
    try {
      await axios.post(`${API_BASE_URL}/api/food/share`, { foodId: item._id }, { withCredentials: true });
    } catch (e) {
      setLocalItems(prev => prev.map(i =>
        i._id === item._id
          ? { ...i, shareCount: Math.max(0, (i.shareCount || 1) - 1) }
          : i
      ));
    }
  };

  const [localItems, setLocalItems] = useState(
    items.map(item => ({ ...item, commentsCount: item.commentCount ?? 0 }))
  );

  useEffect(() => {
    const prevIds = localItems.map(i => i._id).join(',');
    const nextIds = items.map(i => i._id).join(',');
    if (prevIds !== nextIds || localItems.length !== items.length) {
      setLocalItems(items.map(item => ({ ...item, commentsCount: item.commentCount ?? 0 })));
    }
  }, [items]);

  const handleFollow = async (item) => {
    const foodPartnerId = item.foodPartner._id;
    const newIsFollowing = !localItems.find(i => i._id === item._id)?.isFollowing;
    setLocalItems(prev => prev.map(i =>
      i.foodPartner && i.foodPartner._id === foodPartnerId
        ? { ...i, isFollowing: newIsFollowing }
        : i
    ));
    if (onFollow) onFollow(item);
    try {
      await axios.post(`${API_BASE_URL}/api/food-partner/follow`, { foodpartner: foodPartnerId }, { withCredentials: true });
    } catch (e) {
      setLocalItems(prev => prev.map(i =>
        i.foodPartner && i.foodPartner._id === foodPartnerId
          ? { ...i, isFollowing: !newIsFollowing }
          : i
      ));
      if (onFollow) onFollow(item);
    }
  };


  const [modalOpen, setModalOpen] = useState(false)
  const [modalFoodId, setModalFoodId] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)

  const fetchComments = useCallback(async (foodId) => {
    setLoadingComments(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/food/comment?foodId=${foodId}`, { withCredentials: true })
      setComments(res.data.comments || [])
      setLocalItems(prev => prev.map(item =>
        item._id === foodId
          ? { ...item, commentsCount: Array.isArray(res.data.comments) ? res.data.comments.length : item.commentsCount }
          : item
      ));
    } catch (e) {
      setComments([])
    }
    setLoadingComments(false)
  }, [])

  useEffect(() => {
    if (modalOpen && modalFoodId) {
      fetchComments(modalFoodId);
    }
  }, [modalOpen, modalFoodId, fetchComments]);

  const handleCommentClick = useCallback((item) => {
    setModalFoodId(item._id)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setComments([])
    setModalFoodId(null)
  }, [])


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target
          if (!(video instanceof HTMLVideoElement)) return
          
          const videoId = Array.from(videoRefs.current.entries()).find(([id, vid]) => vid === video)?.[0];
          
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            if (!manuallyPausedRef.current[videoId]) {
              video.play().catch(() => { /* ignore autoplay errors */ })
            }
          } else {
            video.pause()
            if (entry.intersectionRatio < 0.01) {
              video.currentTime = 0
              manuallyPausedRef.current[videoId] = false;
            }
          }
        })
      },
  { threshold: Array.from({length: 101}, (_, i) => i / 100) }
    )
    const vids = Array.from(videoRefs.current.values())
    vids.forEach((vid) => {
      if (vid) observer.observe(vid)
    })
    return () => observer.disconnect()
  }, [localItems])

  const handleSave = useCallback((item) => {
    setLocalItems(prev => prev.map(i =>
      i._id === item._id
        ? {
            ...i,
            isSaved: !i.isSaved,
            savesCount: i.isSaved ? Math.max(0, (i.savesCount || 1) - 1) : (i.savesCount || 0) + 1
          }
        : i
    ));
    if (onSave) onSave(item);
  }, [onSave]);

  const handleLike = useCallback((item) => {
    setLocalItems(prev => prev.map(i =>
      i._id === item._id
        ? {
            ...i,
            isLiked: !i.isLiked,
            likeCount: i.isLiked ? Math.max(0, (i.likeCount || 1) - 1) : (i.likeCount || 0) + 1
          }
        : i
    ));
    if (onLike) onLike(item);
  }, [onLike]);

  return (
    <div className="reels-page">
      <div className="reels-feed" role="list">
        {items.length === 0 && (
          <div className="empty-state">
            <p>{emptyMessage}</p>
          </div>
        )}

        {localItems.map((item) => (
          (item.isNotFound || item.isCaughtUp) && customRender ? (
            <section key={item.id || item._id} className="reel" role="listitem">
              {customRender(item)}
            </section>
          ) : (
            <section key={item._id} className="reel" role="listitem">

              <video
                ref={setVideoRef(item._id)}
                className="reel-video"
                src={item.video}
                muted
                playsInline
                loop
                preload="metadata"
              />

              <div className="reel-overlay" onPointerDown={e => handlePointerDown(e, item)}>
                  {hearts.filter(h => h.reelId === item._id).map(h => (
                    <span
                      key={h.id}
                      className="double-tap-heart"
                      style={{
                        position: 'absolute',
                        left: h.x - 48,
                        top: h.y - 48,
                        pointerEvents: 'none',
                        zIndex: 10,
                        width: 96,
                        height: 96,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'heart-pop 0.7s cubic-bezier(.23,1.12,.77,1.08)',
                      }}
                    >
                      <svg width="80" height="80" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' }}>
                        <defs>
                          <linearGradient id={`heartGradient-${h.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff6b9d" />
                            <stop offset="50%" stopColor="#ff4081" />
                            <stop offset="100%" stopColor="#e91e63" />
                          </linearGradient>
                        </defs>
                        <path fill={`url(#heartGradient-${h.id})`} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </span>
                  ))}

                  {/* Play icon overlay when paused */}
                  {videoStates[item._id]?.paused && (
                    <span className="reel-play-overlay">
                      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                        <circle cx="36" cy="36" r="36" fill="rgba(0,0,0,0.45)"/>
                        {/* Triangle with rounded corners */}
                        <path d="M 30 25 L 30 47 L 49 36 Z" 
                          fill="#fff" 
                          stroke="#fff" 
                          strokeWidth="8" 
                          strokeLinejoin="round" 
                          strokeLinecap="round"/>
                      </svg>
                    </span>
                  )}

                <div className="reel-overlay-gradient" aria-hidden="true" />
                <div className="reel-actions instagram-actions">
                  <div className="insta-action-group">
                    <button
                      onClick={e => {
                        if (!item.isLiked) {
                          const video = videoRefs.current.get(item._id);
                          let x = 0, y = 0;
                          if (video) {
                            const rect = video.getBoundingClientRect();
                            x = rect.width / 2;
                            y = rect.height / 2;
                          } else {
                            x = 180;
                            y = 320;
                          }
                          setHearts(hs => [...hs, { id: Date.now(), x, y, reelId: item._id }]);
                        }
                        handleLike(item);
                      }}
                      className="insta-action-btn"
                      aria-label="Like"
                    >
                      {item.isLiked ? (
                        <FaHeart className="insta-action-icon" style={{ color: 'var(--color-accent)' }} />
                      ) : (
                        <FaRegHeart className="insta-action-icon" />
                      )}
                    </button>
                    {(item.likeCount || 0) > 0 && (
                      <div className="insta-action-count">{item.likeCount}</div>
                    )}
                  </div>
                  <div className="insta-action-group">
                    <button
                      type="button"
                      className="insta-action-btn"
                      aria-label="Comments"
                      onClick={() => handleCommentClick(item)}
                      tabIndex={0}
                    >
                      <FaRegComment className="insta-action-icon" />
                    </button>
                    {(item.commentsCount || 0) > 0 && (
                      <div className="insta-action-count">{item.commentsCount}</div>
                    )}
                  </div>
                  <div className="insta-action-group">
                    <button
                      className="insta-action-btn"
                      onClick={() => handleSave(item)}
                      aria-label="Bookmark"
                    >
                      {item.isSaved ? (
                        <FaBookmark className="insta-action-icon" style={{ color: 'var(--color-accent)' }} />
                      ) : (
                        <FaRegBookmark className="insta-action-icon" />
                      )}
                    </button>
                    {(item.savesCount || 0) > 0 && (
                      <div className="insta-action-count">{item.savesCount}</div>
                    )}
                  </div>
                  <div className="insta-action-group">
                    <button
                      className="insta-action-btn"
                      onClick={() => openShareModal(item)}
                      aria-label="Share"
                    >
                      <FaShareAlt className="insta-action-icon" />
                    </button>
                    {(item.shareCount || 0) > 0 && (
                      <div className="insta-action-count">{item.shareCount}</div>
                    )}
                  </div>
                </div>
                <div className="reel-content">
                  <div className="reel-food-title" style={{ fontWeight: 700, fontSize: '1.12rem', color: '#fff', marginBottom: 2 }}>
                    {item.name}
                  </div>
                  <div className="reel-description-wrapper">
                    <span
                      className={`reel-description${expandedDesc[item._id] ? ' expanded' : ''}`}
                      title={item.description}
                    >
                      {item.description && item.description.length > 120
                        ? (expandedDesc[item._id]
                            ? item.description
                            : `${item.description.slice(0, 120)}... `)
                        : item.description}
                    </span>
                    {item.description && item.description.length > 120 && (
                      expandedDesc[item._id] ? (
                        <button
                          className="reel-read-more"
                          style={{ color: '#fff', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                          onClick={() => setExpandedDesc(prev => ({ ...prev, [item._id]: false }))}
                        >
                          read less
                        </button>
                      ) : (
                        <button
                          className="reel-read-more"
                          style={{ color: '#fff', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                          onClick={() => setExpandedDesc(prev => ({ ...prev, [item._id]: true }))}
                        >
                          read more
                        </button>
                      )
                    )}
                  </div>
                  {item.foodPartner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <Link className="reel-store-link" to={"/food-partner/" + item.foodPartner._id} aria-label={item.foodPartner.name || 'Store profile'} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <img
                          src={item.foodPartner.profileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210'}
                          alt={item.foodPartner.name || 'Store profile'}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#fff' }}
                        />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '1.05rem', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>{(typeof item.foodPartner.name === 'string' && item.foodPartner.name.trim().length > 0) ? item.foodPartner.name : 'Store'}</span>
                      </Link>
                      <button
                        className="reel-follow-btn"
                        style={{
                          marginLeft: 8,
                          padding: '4px 12px',
                          borderRadius: 8,
                          border: '1.5px solid #fff',
                          background: 'transparent',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.18s',
                          outline: 'none',
                        }}
                        onClick={() => handleFollow(item)}
                      >
                        {localItems.find(i => i._id === item._id)?.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
        ))}
      </div>
      <CommentsModal
        open={modalOpen}
        onClose={closeModal}
        foodId={modalFoodId}
        comments={comments}
        loading={loadingComments}
        onFetch={fetchComments}
        onDelete={(foodId) => {
          setLocalItems(prev => prev.map(item =>
            item._id === foodId
              ? { ...item, commentsCount: Math.max(0, (item.commentsCount ?? 1) - 1) }
              : item
          ));
        }}
      />
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        onCopy={() => {
          handleCopy();
          if (currentShareItem) handleShareCount(currentShareItem);
        }}
        onPlatformShare={() => {
          if (currentShareItem) handleShareCount(currentShareItem);
        }}
        copied={copied}
      />
    </div>
  )
}

export default ReelFeed
