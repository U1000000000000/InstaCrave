import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ReelFeed from '../../components/ReelFeed';
import UserBottomNav from '../../components/UserBottomNav';
import BottomNavFoodPartner from '../../components/BottomNavFoodPartner';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { USER_TYPES } from '../../constants';

function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const NOT_FOUND_REEL = {
  id: 'not-found',
  isNotFound: true,
  name: 'Food item not found',
  description: 'This food item does not exist or has been deleted.',
};

const ReelPage = () => {
  const { fooditemId } = useParams();
  const [searchParams] = useSearchParams();
  const foodPartnerId = searchParams.get('partnerId');   const sortBy = searchParams.get('sortBy');   const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotFound, setShowNotFound] = useState(false);
  const { userType } = useAuth();   useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/food`, { withCredentials: true })
      .then(res => {
        let allReels = res.data.foodItems || [];
        
                if (foodPartnerId) {
          allReels = allReels.filter(reel => 
            reel.foodPartner && (reel.foodPartner._id === foodPartnerId || reel.foodPartner === foodPartnerId)
          );
          
                    if (sortBy) {
            if (sortBy === 'newest') {
              allReels.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                return dateB - dateA;
              });
            } else if (sortBy === 'oldest') {
              allReels.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                return dateA - dateB;
              });
            } else if (sortBy === 'mostLiked') {
              allReels.sort((a, b) => {
                const likesA = Number(a.likeCount) || 0;
                const likesB = Number(b.likeCount) || 0;
                return likesB - likesA;
              });
            }
          }
        }
        
        const idx = allReels.findIndex(r => (r.id || r._id) === fooditemId);
        if (idx === -1) {
          setShowNotFound(true);
                    setReels([NOT_FOUND_REEL, ...(foodPartnerId ? allReels : shuffleArray(allReels))]);
        } else {
          setShowNotFound(false);
          const found = allReels[idx];
          allReels.splice(idx, 1);
                    setReels([found, ...allReels]);
        }
        setLoading(false);
      })
      .catch(() => {
        setShowNotFound(true);
        setReels([NOT_FOUND_REEL]);
        setLoading(false);
      });
  }, [fooditemId, foodPartnerId, sortBy]);

    useEffect(() => {
    if (showNotFound && reels.length > 1) {
      const timer = setTimeout(() => {
        const secondReel = document.querySelector('.reel:nth-child(2)');
        if (secondReel) {
          secondReel.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showNotFound, reels.length]);

  if (loading) return <div style={{color:'#fff',padding:32}}>Loading...</div>;
  if (!reels.length) return null;

    const renderReel = (item) => {
    if (item.isNotFound) {
      return (
        <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#000'}}>
          <div style={{color:'#fff',fontWeight:400,fontSize:'1rem'}}>Food item not found</div>
        </div>
      );
    }
    return null;   };

  const handleLike = async (item) => {
    try {
      await axios.post(`${API_BASE_URL}/api/food/like`, { foodId: item._id }, { withCredentials: true });
    } catch (error) {
      console.error('Error liking food:', error);
    }
  };

  const handleSave = async (item) => {
    try {
      await axios.post(`${API_BASE_URL}/api/food/save`, { foodId: item._id }, { withCredentials: true });
    } catch (error) {
      console.error('Error saving food:', error);
    }
  };

  return (
    <div style={{height:'100vh',width:'100vw',overflow:'hidden',background:'var(--color-surface)'}}>
      <ReelFeed
        items={reels}
        onLike={handleLike}
        onSave={handleSave}
        onComment={() => {}}
        emptyMessage="No video available."
        customRender={renderReel}
      />
      {userType === USER_TYPES.FOOD_PARTNER ? (
        <BottomNavFoodPartner />
      ) : (
        <UserBottomNav />
      )}
    </div>
  );
};

export default ReelPage;
