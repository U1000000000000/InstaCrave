
import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaShareAlt, FaSortAmountDown, FaRegHeart } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import '../../styles/profile.css';
import '../../styles/meal-card.css';
import '../../styles/custom-dropdown.css';
import ShareModal from '../../components/ShareModal';
import UserBottomNav from '../../components/UserBottomNav';
import BottomNavFoodPartner from '../../components/BottomNavFoodPartner';
import { useAuth } from '../../context/AuthContext';
import { USER_TYPES } from '../../constants';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'mostLiked', label: 'Most Liked' }
];


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
const profileSectionStyle = {
  width: '100%',
  padding: '0 16px',
  marginBottom: 8
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
const profileNameStyle = {
  fontWeight: 700,
  fontSize: '1.32rem',
  color: 'var(--color-text)',
  marginBottom: 2,
  wordBreak: 'break-all'
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
const bioSectionStyle = {
  margin: '8px 0 0 0',
  padding: '0 2px'
};
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
const mealsSectionStyle = {
  marginTop: '-18px',
  padding: 0,
  width: '100%'
};

const PublicFoodPartnerProfile = () => {
  const { foodPartnerId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const { userType } = useAuth();   // Sorting state
  const [sortBy, setSortBy] = useState('newest');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Meals/reels come from profile.foodItems
  const meals = profile?.foodItems || [];
  
  // Sorted meals - must be called before any early returns
  const sortedMeals = React.useMemo(() => {
    if (!meals || meals.length === 0) return [];
    let arr = [...meals];
    
    if (sortBy === 'newest') {
      arr.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
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
  }, [meals, sortBy]);

    useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/food-partner/${foodPartnerId}`, { withCredentials: true })
      .then(res => {
        const fp = res.data.foodPartner || {};
        // Normalize isFollowing to a boolean. Support either top-level or nested value.
        const rawIsFollowing =
          res.data.isFollowing !== undefined ? res.data.isFollowing : fp.isFollowing;
        const normalizedIsFollowing = (rawIsFollowing === true)
          || (rawIsFollowing === 'true')
          || (rawIsFollowing === 1)
          || (rawIsFollowing === '1');
        setProfile({ ...fp, isFollowing: normalizedIsFollowing });
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load food partner.');
        setLoading(false);
      });
  }, [foodPartnerId]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/food-partner/follow`, { foodpartner: profile._id }, { withCredentials: true });
      setProfile(prev => {
        if (!prev) return prev;
        const wasFollowing = !!prev.isFollowing;
        // Use followCount if available, else fallback to followers (array or number)
        let newFollowCount = (typeof prev.followCount === 'number') ? prev.followCount :
          (Array.isArray(prev.followers) ? prev.followers.length : (prev.followers || 0));
        newFollowCount = wasFollowing ? newFollowCount - 1 : newFollowCount + 1;
        return {
          ...prev,
          isFollowing: !wasFollowing,
          followCount: newFollowCount
        };
      });
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div style={{color:'var(--color-text)',padding:32}}>Loading...</div>;
  if (error) return <div style={{color:'var(--color-danger)',padding:32}}>{error}</div>;
  if (!profile) return null;

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
            <span style={{fontWeight:700,fontSize:'1.25rem',color:'var(--color-text)',letterSpacing:'-0.5px'}}>{profile.name}</span>
          </div>
          <button
            onClick={() => {
              setShareUrl(`${window.location.origin}/food-partner/${foodPartnerId}`);
              setShareModalOpen(true);
            }}
            style={shareBtnStyle}
            aria-label="Share profile"
          >
            <FaShareAlt />
          </button>
        </div>
      </div>
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
                <div style={{fontWeight:700,fontSize:'1.18rem',color:'var(--color-text)'}}>{meals.length}</div>
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
        <div style={buttonRowStyle}>
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={followBtnStyle(followLoading)}
          >
            {profile.isFollowing ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => setContactOpen(true)}
            style={contactBtnStyle}
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
              <FaSortAmountDown className="filter-icon" />
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
        {sortedMeals.length === 0 ? (
          <div style={{color:'var(--color-text-secondary)'}}>No meals available.</div>
        ) : (
          <div className="meals-grid">
            {sortedMeals.map(meal => (
              <div
                key={meal.id || meal._id}
                className="meal-card"
                onClick={() => navigate(`/reels/${meal._id}?partnerId=${foodPartnerId}&sortBy=${sortBy}`)}
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
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        onCopy={() => { }}
        onPlatformShare={() => { }}
      />
      {userType === USER_TYPES.FOOD_PARTNER ? (
        <BottomNavFoodPartner />
      ) : userType === USER_TYPES.USER ? (
        <UserBottomNav />
      ) : null}
    </main>
  );
};

export default PublicFoodPartnerProfile;
