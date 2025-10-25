const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '18px 18px 8px 18px',
  background: 'var(--color-bg)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  maxWidth: 520,
  margin: '0 auto',
  boxSizing: 'border-box',
  width: '100%'
};
const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text)',
  fontSize: 22,
  cursor: 'pointer',
  padding: 0,
  marginRight: 2,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.18s',
};
const shareBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-text)',
  fontSize: 20,
  cursor: 'pointer',
  padding: 0,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
const profileNameStyle = {
  fontWeight: 700,
  fontSize: '1.32rem',
  color: 'var(--color-text)',
  marginBottom: 2,
  wordBreak: 'break-all',
};
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'mostLiked', label: 'Most Liked' }
];
import { FaRegHeart, FaSortAmountDown, FaArrowLeft, FaShareAlt } from 'react-icons/fa';
import ShareModal from '../../components/ShareModal';
import '../../styles/custom-dropdown.css';
import '../../styles/profile.css';
import '../../styles/meal-card.css';
import axios from 'axios';
import { API_BASE_URL } from '../../config';


const buttonRowStyle = {
  display: 'flex',
  gap: 6,
  marginTop: 14,
  justifyContent: 'stretch'
};
const followBtnStyle = (loading) => ({
  flex: 1,
  padding: '10px 0',
  borderRadius: 10,
  border: 'none',
  background: 'var(--color-accent)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '1.09rem',
  cursor: 'pointer',
  transition: 'all 0.18s',
  outline: 'none',
  boxShadow: '0 2px 8px 0 rgba(226,55,71,0.18)',
  opacity: loading ? 0.7 : 1
});
const contactBtnStyle = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 10,
  border: '2px solid var(--color-accent)',
  background: 'transparent',
  color: 'var(--color-accent)',
  fontWeight: 700,
  fontSize: '1.09rem',
  cursor: 'pointer',
  transition: 'all 0.18s',
  outline: 'none'
};


const statBoxStyle = {
  flex: 1,
  textAlign: 'center',
  background: 'var(--color-surface)',
  borderRadius: 14,
  padding: '10px 0 8px 0',
  boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0
};
const profileRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  marginBottom: 10
};
const profileImgStyle = {
  width: 104,
  height: 104,
  borderRadius: '50%',
  objectFit: 'cover',
  border: '3px solid var(--color-accent,#ff4081)'
};
const bioSectionStyle = {
  margin: '8px 0 0 0',
  padding: '0 2px'
};

const PreviewProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Share modal state and handler (must be before any early return)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/food-partner`, { withCredentials: true })
      .then(response => {
        setProfile(response.data.foodPartner);
        setVideos(response.data.foodPartner.foodItems || []);
      });
  }, []);

  // Sorted meals - must be called before any early returns
  const sortedVideos = React.useMemo(() => {
    if (!videos || videos.length === 0) return [];
    let arr = [...videos];
    if (sortBy === 'newest') {
      arr.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (sortBy === 'mostLiked') {
      arr.sort((a, b) => {
        const likesA = Number(a.likeCount) || 0;
        const likesB = Number(b.likeCount) || 0;
        return likesB - likesA;
      });
    }
    return arr;
  }, [videos, sortBy]);

    React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const handleShare = () => {
    if (profile) {
      const id = profile._id || profile.id;
      setShareUrl(window.location.origin + '/food-partner/' + id);
      setShareModalOpen(true);
      setCopied(false);
    }
  };
    const shareMeta = profile ? {
    subject: `Check out ${profile.name}!`,
    profileImage: profile.profileImage,
    partnerId: profile._id || profile.id
  } : undefined;
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!profile) return <div style={{color:'var(--color-text)',padding:32}}>Loading...</div>;

  return (
    <main className="profile-page" style={{padding:'0 0 80px 0'}}>
      <div style={{background:'var(--color-bg)', width:'100%', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100}}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          padding: '18px 0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button
              onClick={() => navigate(-1)}
              style={backBtnStyle}
              aria-label="Go back"
            >
              <FaArrowLeft />
            </button>
            <span style={{fontWeight:700,fontSize:'1.25rem',color:'var(--color-text)',letterSpacing:'-0.5px'}}>{profile?.name || ''}</span>
          </div>
          <button
            onClick={handleShare}
            style={shareBtnStyle}
            aria-label="Share profile"
          >
            <FaShareAlt />
          </button>
        </div>
      </div>
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        onCopy={handleCopy}
        copied={copied}
        meta={shareMeta}
      />
      <div style={{padding: '0 16px', width: '100%'}}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          marginBottom: 8
        }}>
          <div style={profileRowStyle}>
            <img
              src={profile.profileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210'}
              alt={profile.name}
              style={profileImgStyle}
            />
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:2,alignItems:'flex-start'}}>
              <div style={profileNameStyle}>{profile.name}</div>
              <div style={{display:'flex',gap:6,margin:'2px 0 0 0',width:'100%'}}>
                <div style={statBoxStyle}>
                  <div style={{fontWeight:700,fontSize:'1.18rem',color:'var(--color-text)'}}>{videos.length}</div>
                  <div style={{color:'var(--color-text-secondary)',fontSize:'1.01rem'}}>meals</div>
                </div>
                <div style={statBoxStyle}>
                  <div style={{fontWeight:700,fontSize:'1.18rem',color:'var(--color-text)'}}>{
                    (typeof profile.followCount === 'number' && profile.followCount) ||
                    (Array.isArray(profile.followers) ? profile.followers.length : (profile.followers || 0))
                  }</div>
                  <div style={{color:'var(--color-text-secondary)',fontSize:'1.01rem'}}>followers</div>
                </div>
              </div>
            </div>
          </div>
          <div style={bioSectionStyle}>
            <div style={{color:'var(--color-text)',fontWeight:600,marginBottom:2}}>{profile.contactName}</div>
            <div style={{color:'var(--color-text-secondary)',fontSize:'1.01rem'}}>{profile.address}</div>
          </div>
        </div>
        <div style={buttonRowStyle}>
          <button
            style={followBtnStyle(false)}
            onClick={() => {}}
          >
            Follow
          </button>
          <button
            style={contactBtnStyle}
            onClick={() => setContactOpen(true)}
          >
            Contact
          </button>
        </div>
        {contactOpen && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setContactOpen(false)}>
            <div style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              padding:'32px 28px',
              borderRadius:16,
              minWidth:280,
              boxShadow:'0 4px 24px rgba(0,0,0,0.18)'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{margin:'0 0 18px 0',fontWeight:700,fontSize:'1.18rem',color:'var(--color-accent,#ff4081)'}}>Contact Info</h3>
              <div style={{marginBottom:10}}><b>Email:</b> {profile.email || 'N/A'}</div>
              <div style={{marginBottom:10}}><b>Contact No:</b> {profile.contactNo || 'N/A'}</div>
              <button onClick={() => setContactOpen(false)} style={{marginTop:18,padding:'7px 18px',borderRadius:7,border:'none',background:'var(--color-accent,#ff4081)',color:'#fff',fontWeight:600,cursor:'pointer'}}>Close</button>
            </div>
          </div>
        )}
      </div>
      <div style={{padding: '0 16px', width: '100%', marginTop: '-30px'}}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          display:'flex',
          flexDirection:'row',
          alignItems:'center',
          justifyContent:'center',
          gap: 18,
          padding: '8px 0 10px 0',
          marginTop: '10px',
          marginBottom: '10px'
        }}>
          <h3 style={{
            color:'var(--color-accent, #ff4081)',
            fontWeight:700,
            fontSize:'1.28rem',
            margin:0,
            textAlign:'center'
          }}>Meals</h3>
          <div className="custom-dropdown">
            <button 
              className="dropdown-button" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              type="button"
            >
              <FaSortAmountDown className="filter-icon" style={{marginRight:6,verticalAlign:'middle'}} />
              {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || 'Sort by'}
            </button>
            {dropdownOpen && (
              <div className="dropdown-content">
                {SORT_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${opt.value === sortBy ? 'selected' : ''}`}
                    onClick={() => {
                      setSortBy(opt.value);
                      setDropdownOpen(false);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {sortedVideos.length === 0 ? (
          <div style={{color:'var(--color-text-secondary)'}}>No meals available.</div>
        ) : (
          <div className="meals-grid">
            {sortedVideos.map(meal => (
              <div
                key={meal.id || meal._id}
                className="meal-card"
                style={{ cursor: 'pointer' }}
                onClick={() => profile && navigate(`/reels/${meal.id || meal._id}?partnerId=${profile._id || profile.id}&sortBy=${sortBy}`)}
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
                  <div className="meal-likes">
                    <FaRegHeart />
                    {meal.likeCount || 0}
                  </div>
                  <div className="meal-name">{meal.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default PreviewProfile;
