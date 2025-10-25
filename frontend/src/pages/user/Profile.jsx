import React, { useEffect, useState, useRef } from 'react';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import '../../styles/profile.css';
import '../../styles/custom-dropdown.css';
import LoadingSpinner from '../../components/LoadingSpinner';
import { applyTheme } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

function LikeHeartButton({ isLiked, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        marginLeft: 'auto',
        fontSize: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        position: 'relative',
        right: 0
      }}
      title={isLiked ? 'Unlike' : 'Like'}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        style={{
          transition: 'color 0.2s',
          display: 'block',
          background: 'none',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={isLiked ? 'var(--color-accent)' : 'none'}
          stroke={isLiked ? 'var(--color-accent)' : (hovered ? 'var(--color-accent)' : '#bbb')}
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}

const Profile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [savedVideos, setSavedVideos] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState(null);
  const [following, setFollowing] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [likes, setLikes] = useState([]);
  const [likesLoading, setLikesLoading] = useState(false);
    const aboutRef = useRef(null);
  const savedRef = useRef(null);
  const commentsRef = useRef(null);
  const followingRef = useRef(null);
  const likesRef = useRef(null);
  const underlineContainerRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

    useEffect(() => {
    const updateUnderline = () => {
      let ref = null;
      if (activeTab === 'about') ref = aboutRef;
      else if (activeTab === 'saved') ref = savedRef;
      else if (activeTab === 'comments') ref = commentsRef;
      else if (activeTab === 'following') ref = followingRef;
      else if (activeTab === 'likes') ref = likesRef;
      if (ref && ref.current && underlineContainerRef.current) {
        const tabRect = ref.current.getBoundingClientRect();
        const containerRect = underlineContainerRef.current.getBoundingClientRect();
        const extra = 12;         setUnderline({
          left: tabRect.left - containerRect.left - extra / 2 + underlineContainerRef.current.scrollLeft,
          width: tabRect.width + extra
        });
      }
    };
        updateUnderline();
    const raf = requestAnimationFrame(updateUnderline);
    const timeout = setTimeout(updateUnderline, 50);
    window.addEventListener('resize', updateUnderline);
    const container = underlineContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateUnderline);
    }
    return () => {
      window.removeEventListener('resize', updateUnderline);
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('scroll', updateUnderline);
      }
    };
  }, [activeTab, user]);
  
  useEffect(() => {
    if (activeTab === 'saved') {
      setSavedLoading(true);
      axios.get(`${API_BASE_URL}/api/food/save`, { withCredentials: true })
        .then(response => {
          const foods = response.data.responseSavedFoods || [];
          const savedFoods = foods.map((item) => ({
            _id: item._id,
            name: item.name || '',
            video: item.video,
            description: item.description,
            likeCount: item.likeCount,
            savesCount: item.savesCount,
            commentCount: item.commentCount,
            foodPartner: item.foodPartner,
            isSaved: true,           }));
          setSavedVideos(savedFoods);
          setSavedLoading(false);
        })
        .catch(() => setSavedLoading(false));
    } else if (activeTab === 'comments') {
      setCommentsLoading(true);
      axios.get(`${API_BASE_URL}/api/user/comments`, { withCredentials: true })
        .then(response => {
          setComments(response.data.comments || []);
          setCommentsLoading(false);
        })
        .catch(() => {
          setComments([]);
          setCommentsLoading(false);
        });
    } else if (activeTab === 'following') {
      setFollowingLoading(true);
      axios.get(`${API_BASE_URL}/api/user/follows`, { withCredentials: true })
        .then(response => {
          setFollowing(response.data.following || []);
          setFollowingLoading(false);
        })
        .catch(() => {
          setFollowing([]);
          setFollowingLoading(false);
        });
    } else if (activeTab === 'likes') {
      setLikesLoading(true);
      axios.get(`${API_BASE_URL}/api/user/likes`, { withCredentials: true })
        .then(response => {
          const likesData = (response.data.likes || []).map(like => ({ ...like, isLiked: true }));
          setLikes(likesData);
          setLikesLoading(false);
        })
        .catch(() => {
          setLikes([]);
          setLikesLoading(false);
        });
    }
  }, [activeTab]);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState('');   const inputRef = useRef();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/user/`, { withCredentials: true })
      .then(res => {
        if (res.data && res.data.user) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleEdit = (field, value) => {
    setEditField(field);
    setEditValue(value || '');
    setError('');
    setMenuOpen('');
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setError('');
    try {
      if (editField === 'fullName') {
        await axios.patch(`${API_BASE_URL}/api/user/`, { fullName: editValue }, { withCredentials: true });
        setUser(u => ({ ...u, fullName: editValue }));
      } else if (editField === 'password') {
        await axios.patch(`${API_BASE_URL}/api/user/`, { password: editValue }, { withCredentials: true });
      }
      setEditField(null);
      setEditValue('');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error updating');
    }
    setEditLoading(false);
  };

  const handleEditCancel = () => {
    setEditField(null);
    setEditValue('');
    setError('');
    setMenuOpen('');
  };

    const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPassword('');
    setConfirm('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!password || !confirm) {
      setPasswordError('Please fill all fields.');
      return;
    }
    if (password !== confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      await axios.patch(`${API_BASE_URL}/api/user/`, { password }, { withCredentials: true });
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => handlePasswordModalClose(), 1200);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Error changing password.');
    }
    setPasswordLoading(false);
  };

    useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (!e.target.closest('.profile-menu-btn') && !e.target.closest('.profile-menu-dropdown')) {
        setMenuOpen('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);


  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeOptions = [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const handleThemeChange = (val) => {
    setTheme(val);
    localStorage.setItem('theme', val);
    applyTheme(val);
    setThemeMenuOpen(false);
  };

    const themeMenuRef = useRef();
  useEffect(() => {
    if (!themeMenuOpen) return;
    function handleClick(e) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [themeMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      // Use window.location.href for full page reload to clear all state
      window.location.href = ROUTES.AUTH.USER_LOGIN;
    } catch (err) {
      console.error('Logout error:', err);
      // Still redirect even if logout request fails
      window.location.href = ROUTES.AUTH.USER_LOGIN;
    }
  };

  if (loading) return <LoadingSpinner fullScreen color="accent" />;
  if (!user) return (
    <div className="empty-state">
      <div className="empty-state-icon">⚠️</div>
      <p>Unable to load user profile.</p>
    </div>
  );

  return (
    <main className="profile-page" style={{paddingBottom: '64px'}}>
      <div className="d-flex align-center gap-4 mb-4 mt-2"
      >        <h2 style={{
          fontWeight: 700,
          fontSize: '2.1rem',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          paddingLeft: '2px',
          margin: 0
        }}>Profile</h2>
      </div>
      <hr className="profile-sep" />

      <div
        ref={underlineContainerRef}
        style={{
          width: '100%',
          margin: '18px 0 0 0',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative',
          minHeight: 40
        }}
        className="profile-tabs-scroll"
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '0',
            minWidth: 'min-content',
          }}
        >
          <button
            onClick={() => setActiveTab('about')}
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              color: activeTab === 'about' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'about' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 90
            }}
          >
            <span ref={aboutRef}>About</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              color: activeTab === 'saved' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'saved' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 90
            }}
          >
            <span ref={savedRef}>Saved</span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              color: activeTab === 'comments' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'comments' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 90
            }}
          >
            <span ref={commentsRef}>Comments</span>
          </button>
          <button
            onClick={() => setActiveTab('following')}
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              color: activeTab === 'following' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'following' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 90
            }}
          >
            <span ref={followingRef}>Following</span>
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            style={{
              flex: '0 0 auto',
              background: 'none',
              border: 'none',
              color: activeTab === 'likes' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'likes' ? 700 : 600,
              fontSize: '1.13rem',
              position: 'relative',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              outline: 'none',
              transition: 'all 0.18s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              minWidth: 90
            }}
          >
            <span ref={likesRef}>Liked</span>
          </button>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: typeof underline.left === 'number' ? underline.left : 0,
            width: typeof underline.width === 'number' ? underline.width : 0,
            height: 3,
            background: 'var(--color-accent)',
            borderRadius: 2,
            transition: 'left 0.18s, width 0.18s',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      </div>
      <section style={{marginTop:0, display:'flex', flexWrap:'wrap', gap:'24px'}}>
        {activeTab === 'about' && (
          // ...existing code for About tab...
          <div style={{flex:'1 1 380px', minWidth:320, maxWidth:420, display:'flex', flexDirection:'column', gap:'18px'}}>
            <div style={{background:'var(--color-surface)',borderRadius:12,padding:'18px 18px 10px',marginBottom:0,boxShadow:'var(--shadow-sm)',border:'1px solid var(--color-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontWeight:600,fontSize:'1.13rem'}}>Name:</span>
                {editField !== 'fullName' && (
                  <span style={{position:'relative'}}>
                    <button className="profile-menu-btn" style={{background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}} onClick={()=>setMenuOpen(menuOpen==='fullName'?'':'fullName')}>
                      <span style={{fontSize:'1.5rem',color:'var(--color-text)',fontWeight:700,lineHeight:1}}>⋮</span>
                    </button>
                    {menuOpen==='fullName' && (
                      <div className="profile-menu-dropdown" style={{position:'absolute',right:0,top:'110%',background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:6,boxShadow:'0 2px 12px 0 rgba(0,0,0,0.13)',zIndex:10,minWidth:90}}>
                        <div style={{padding:'8px 18px',cursor:'pointer',color:'var(--color-text)',fontWeight:600}} onClick={()=>handleEdit('fullName', user.fullName)}>Edit</div>
                      </div>
                    )}
                  </span>
                )}
              </div>
              {editField === 'fullName' ? (
                <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'stretch'}}>
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e=>setEditValue(e.target.value)}
                    style={{
                      fontSize:'1.08rem',
                      padding:'10px 16px',
                      borderRadius:'8px',
                      border:'2px solid var(--color-accent)',
                      background:'var(--color-bg)',
                      color:'var(--color-text)',
                      outline:'none',
                      fontWeight:500,
                      boxShadow:'0 2px 8px 0 rgba(226,55,71,0.08)',
                      width:'100%',
                      transition:'border 0.2s, box-shadow 0.2s',
                    }}
                  />
                  <div style={{display:'flex',gap:8,marginTop:2,justifyContent:'flex-end'}}>
                    <button onClick={handleEditSave} disabled={editLoading || !editValue.trim()} style={{color:'#fff',background:'var(--color-accent)',border:'none',borderRadius:4,padding:'6px 18px',fontWeight:600,cursor:'pointer'}}>Save</button>
                    <button onClick={handleEditCancel} style={{color:'var(--color-accent)',background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>Cancel</button>
                  </div>
                  {error && <div style={{color:'var(--color-danger)',marginTop:8,fontWeight:600}}>{error}</div>}
                </div>
              ) : (
                <div style={{color:'var(--color-text-secondary)',fontSize:'1.08rem'}}>{user.fullName}</div>
              )}
            </div>
            <div style={{background:'var(--color-surface)',borderRadius:12,padding:'18px 18px 10px',marginBottom:0,boxShadow:'var(--shadow-sm)',border:'1px solid var(--color-border)', minHeight: '74px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <div style={{fontWeight:600,fontSize:'1.13rem',marginBottom:6}}>Theme:</div>
              <div ref={themeMenuRef} className="custom-dropdown" style={{width:'100%',maxWidth:220,marginTop:4}}>
                <button
                  type="button"
                  className="dropdown-button"
                  style={{width:'100%',justifyContent:'space-between',fontSize:'1.08rem',padding:'12px 16px'}}
                  onClick={()=>setThemeMenuOpen(v=>!v)}
                >
                  <span>{themeOptions.find(opt=>opt.value===theme)?.label || 'System'}</span>
                  <span style={{color:'#E23747',fontSize:'1.2rem',fontWeight:700,marginLeft:8}}>▼</span>
                </button>
                {themeMenuOpen && (
                  <div className="dropdown-content" style={{width:'100%',minWidth:140}}>
                    {themeOptions.map(opt => (
                      <div
                        key={opt.value}
                        className={`dropdown-item${theme === opt.value ? ' selected' : ''}`}
                        onClick={()=>handleThemeChange(opt.value)}
                        onMouseDown={e=>e.preventDefault()}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              style={{
                width:'100%',
                background:'var(--color-surface-dark, #232326)',
                color:'#fff',
                border:'1.5px solid var(--color-border)',
                borderRadius:12,
                padding:'18px',
                fontWeight:700,
                fontSize:'1.13rem',
                marginBottom:'8px',
                marginTop:0,
                boxShadow:'var(--shadow-sm)',
                cursor:'pointer',
                textAlign:'left',
                transition:'background 0.18s,border 0.18s',
              }}
              onClick={()=>navigate('/user/change-password')}
            >
              Change Password
            </button>
            <button
              style={{
                width:'100%',
                background:'var(--color-accent)',
                color:'#fff',
                border:'1.5px solid var(--color-accent)',
                borderRadius:12,
                padding:'18px',
                fontWeight:700,
                fontSize:'1.13rem',
                marginTop:'0',
                marginBottom:0,
                boxShadow:'var(--shadow-sm)',
                cursor:'pointer',
                textAlign:'left',
                transition:'background 0.18s,border 0.18s,color 0.18s',
                outline:'none',
              }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
        {activeTab === 'saved' && (
          <div style={{flex:'2 1 480px', minWidth:340}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{fontWeight:700, fontSize:'1.18rem', color:'var(--color-accent)'}}>Saved:</div>
              <span style={{
                fontSize: '1.1rem',
                color: 'var(--color-text',
                fontWeight: 700,
              }}>{savedVideos.length}</span>
            </div>
            {savedLoading ? (
              <div style={{color:'var(--color-text)',padding:32}}>Loading...</div>
            ) : savedVideos.length === 0 ? (
              <div style={{color:'var(--color-text-secondary)'}}>No saved videos yet.</div>
            ) : (
              <div className="meals-grid">
                {savedVideos.map(meal => (
                  <div
                    key={meal._id}
                    className="meal-card"
                    onClick={() => navigate(`/saved?highlight=${meal._id}`)}
                  >
                    <div className="meal-video-container">
                      {meal.video ? (
                        <video
                          src={meal.video}
                          className="meal-video"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="meal-video" style={{background: '#ff99a3'}} />
                      )}
                    </div>
                    <div className="meal-info">
                      <button
                        className="meal-save-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          marginRight: 8,
                          fontSize: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        title={meal.isSaved ? 'Unsave' : 'Save'}
                        onClick={e => {
                          e.stopPropagation();
                                                    setSavedVideos(prev => prev.map(v => v._id === meal._id ? { ...v, isSaved: !v.isSaved } : v));
                                                    axios.post(`${API_BASE_URL}/api/food/save`, { foodId: meal._id }, { withCredentials: true })
                            .catch(() => {
                                                            setSavedVideos(prev => prev.map(v => v._id === meal._id ? { ...v, isSaved: !v.isSaved } : v));
                            });
                        }}
                        onMouseEnter={e => {
                          if (!meal.isSaved) {
                            e.currentTarget.querySelector('svg').style.color = 'var(--color-accent)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!meal.isSaved) {
                            e.currentTarget.querySelector('svg').style.color = '#fff';
                          }
                        }}
                      >
                        {meal.isSaved ? (
                          <FaBookmark style={{ color: 'var(--color-accent)', fontSize: '1.25rem', transition: 'color 0.2s' }} />
                        ) : (
                          <FaRegBookmark style={{ color: '#fff', fontSize: '1.25rem', transition: 'color 0.2s' }} />
                        )}
                      </button>
                      <div className="meal-name">{meal.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'comments' && (
          <div style={{flex:'2 1 480px', minWidth:340}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{fontWeight:700, fontSize:'1.18rem', color:'var(--color-accent)'}}>Comments:</div>
              <span style={{
                fontSize: '1.1rem',
                color: 'var(--color-text)',
                fontWeight: 700,
              }}>{comments.length}</span>
            </div>
            {commentsLoading ? (
              <div style={{color:'var(--color-text)',padding:32}}>Loading...</div>
            ) : comments.length === 0 ? (
              <div style={{color:'var(--color-text-secondary)'}}>No comments yet.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {comments.map(comment => {
                  const isExpanded = expandedCommentId === comment._id;
                  return (
                    <div
                      key={comment._id}
                      style={{
                        background:'var(--color-surface)',
                        borderRadius:12,
                        padding:16,
                        border:'1px solid var(--color-border)',
                        boxShadow:'var(--shadow-sm)',
                        display:'flex',
                        flexDirection:'column',
                        gap:10,
                        cursor:'pointer',
                        transition:'all 0.2s'
                      }}
                      onClick={(e) => {
                                                if (!e.target.closest('button')) {
                          setExpandedCommentId(isExpanded ? null : comment._id);
                        }
                      }}
                    >
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div style={{color:'var(--color-text)',fontSize:'1rem',marginBottom:6,lineHeight:1.5}}>
                            {comment.comment}
                          </div>
                          <div style={{display:'flex',gap:8,alignItems:'center',fontSize:'0.9rem',color:'var(--color-text-secondary)'}}>
                            <span>On: <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (comment.food?._id) {
                                  navigate(`/reels/${comment.food._id}`);
                                }
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--color-accent)';
                                e.currentTarget.style.textDecoration = 'underline';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                                e.currentTarget.style.textDecoration = 'none';
                              }}
                              style={{
                                cursor: 'pointer',
                                transition: 'color 0.2s, text-decoration 0.2s'
                              }}
                            >{comment.food?.name || 'Unknown Food'}</span></span>
                            <span>•</span>
                            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this comment?')) {
                              try {
                                await axios.delete(`${API_BASE_URL}/api/user/comments/${comment._id}`, { withCredentials: true });
                                setComments(prev => prev.filter(c => c._id !== comment._id));
                              } catch (err) {
                                alert('Failed to delete comment');
                              }
                            }
                          }}
                          style={{
                            background:'var(--color-danger)',
                            color:'#fff',
                            border:'none',
                            borderRadius:6,
                            padding:'6px 12px',
                            fontSize:'0.9rem',
                            fontWeight:600,
                            cursor:'pointer',
                            transition:'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          Delete
                        </button>
                      </div>
                      
                      {isExpanded && comment.food?.foodPartner && (
                        <div style={{
                          borderTop:'1px solid var(--color-border)',
                          paddingTop:12,
                          marginTop:4,
                          display:'flex',
                          alignItems:'center',
                          gap:12
                        }}>
                          <img
                            src={comment.food.foodPartner.profileImage || '/default-avatar.png'}
                            alt={comment.food.foodPartner.name}
                            style={{
                              width:48,
                              height:48,
                              borderRadius:'50%',
                              objectFit:'cover',
                              border:'2px solid var(--color-accent)'
                            }}
                          />
                          <div style={{flex:1}}>
                            <div style={{
                              fontWeight:600,
                              fontSize:'1rem',
                              color:'var(--color-text)',
                              marginBottom:2
                            }}>
                              {comment.food.foodPartner.name}
                            </div>
                            <div style={{
                              fontSize:'0.85rem',
                              color:'var(--color-text-secondary)'
                            }}>
                              Food Partner
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/food-partner/${comment.food.foodPartner._id}`);
                            }}
                            style={{
                              background:'var(--color-accent)',
                              color:'#fff',
                              border:'none',
                              borderRadius:6,
                              padding:'8px 16px',
                              fontSize:'0.9rem',
                              fontWeight:600,
                              cursor:'pointer',
                              transition:'opacity 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            View Profile
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'following' && (
          <div style={{flex:'2 1 480px', minWidth:340}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{fontWeight:700, fontSize:'1.18rem', color:'var(--color-accent)'}}>Following:</div>
              <span style={{
                fontSize: '1.1rem',
                color: 'var(--color-text)',
                fontWeight: 700,
              }}>{following.length}</span>
            </div>
            {followingLoading ? (
              <div style={{color:'var(--color-text)',padding:32}}>Loading...</div>
            ) : following.length === 0 ? (
              <div style={{color:'var(--color-text-secondary)'}}>Not following anyone yet.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {following.map(partner => (
                  <div
                    key={partner._id}
                    style={{
                      background:'var(--color-surface)',
                      borderRadius:12,
                      padding:16,
                      border:'1px solid var(--color-border)',
                      boxShadow:'var(--shadow-sm)',
                      display:'flex',
                      alignItems:'center',
                      gap:12,
                      cursor:'pointer',
                      transition:'all 0.2s'
                    }}
                    onClick={() => navigate(`/food-partner/${partner._id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(226, 55, 71, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                  >
                    <img
                      src={partner.profileImage || '/default-avatar.png'}
                      alt={partner.name}
                      style={{
                        width:56,
                        height:56,
                        borderRadius:'50%',
                        objectFit:'cover',
                        border:'2px solid var(--color-accent)'
                      }}
                    />
                    <div style={{flex:1}}>
                      <div style={{
                        fontWeight:600,
                        fontSize:'1.05rem',
                        color:'var(--color-text)',
                        marginBottom:4
                      }}>
                        {partner.name}
                      </div>
                      <div style={{
                        fontSize:'0.9rem',
                        color:'var(--color-text-secondary)',
                        marginBottom:2
                      }}>
                        {partner.followCount} {partner.followCount === 1 ? 'follower' : 'followers'}
                      </div>
                      {partner.address && (
                        <div style={{
                          fontSize:'0.85rem',
                          color:'var(--color-text-secondary)'
                        }}>
                          📍 {partner.address}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/food-partner/${partner._id}`);
                      }}
                      style={{
                        background:'var(--color-accent)',
                        color:'#fff',
                        border:'none',
                        borderRadius:8,
                        padding:'10px 18px',
                        fontSize:'0.95rem',
                        fontWeight:600,
                        cursor:'pointer',
                        transition:'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'likes' && (
          <div style={{flex:'2 1 480px', minWidth:340}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{fontWeight:700, fontSize:'1.18rem', color:'var(--color-accent)'}}>Likes:</div>
              <span style={{
                fontSize: '1.1rem',
                color: 'var(--color-text)',
                fontWeight: 700,
              }}>{likes.length}</span>
            </div>
            {likesLoading ? (
              <div style={{color:'var(--color-text)',padding:32}}>Loading...</div>
            ) : likes.length === 0 ? (
              <div style={{color:'var(--color-text-secondary)'}}>No liked videos yet.</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {likes.map(like => {
                  const LikeCard = () => {
                    const [hoveredPartner, setHoveredPartner] = useState(false);
                    
                    return (
                      <div
                        key={like._id}
                        style={{
                          background:'var(--color-surface)',
                          borderRadius:12,
                          padding:16,
                          border:'1px solid var(--color-border)',
                          boxShadow:'var(--shadow-sm)',
                          display:'flex',
                          alignItems:'center',
                          gap:12,
                          cursor:'pointer',
                          transition:'all 0.2s',
                          position:'relative'
                        }}
                        onClick={() => navigate(`/reels/${like.food._id}`)}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(226, 55, 71, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                      >
                        <div style={{flex:1}}>
                          <div style={{
                            fontWeight:600,
                            fontSize:'1.05rem',
                            color:'var(--color-text)',
                            marginBottom:6
                          }}>
                            {like.food.name}
                          </div>
                          <div style={{
                            fontSize:'0.9rem',
                            color:'var(--color-text-secondary)',
                            marginBottom:4
                          }}>
                            {like.food.description?.substring(0, 60)}{like.food.description?.length > 60 ? '...' : ''}
                          </div>
                          {like.food.foodPartner && (
                            <div 
                              style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}
                              onMouseEnter={() => setHoveredPartner(true)}
                              onMouseLeave={() => setHoveredPartner(false)}
                            >
                              <img
                                src={like.food.foodPartner.profileImage || '/default-avatar.png'}
                                alt={like.food.foodPartner.name}
                                style={{
                                  width:24,
                                  height:24,
                                  borderRadius:'50%',
                                  objectFit:'cover',
                                  cursor:'pointer',
                                  transition:'box-shadow 0.18s',
                                  boxShadow: hoveredPartner ? '0 0 0 2px var(--color-accent)' : 'none'
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/food-partner/${like.food.foodPartner._id}`);
                                }}
                              />
                              <span
                                style={{
                                  fontSize:'0.85rem',
                                  color: hoveredPartner ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                  fontWeight:500,
                                  cursor:'pointer',
                                  textDecoration:'underline',
                                  transition:'color 0.18s',
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/food-partner/${like.food.foodPartner._id}`);
                                }}
                              >
                                {like.food.foodPartner.name}
                              </span>
                            </div>
                          )}
                        </div>
                        <LikeHeartButton
                          isLiked={like.isLiked}
                          onClick={e => {
                            e.stopPropagation();
                            setLikes(prev => prev.map(l => l._id === like._id ? { ...l, isLiked: !l.isLiked } : l));
                            axios.post(`${API_BASE_URL}/api/food/like`, { foodId: like.food._id }, { withCredentials: true })
                              .catch(() => {
                                setLikes(prev => prev.map(l => l._id === like._id ? { ...l, isLiked: !l.isLiked } : l));
                              });
                          }}
                        />
                      </div>
                    );
                  };
                  
                  return <LikeCard key={like._id} />;
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default Profile;
