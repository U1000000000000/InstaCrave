import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import api from '../../services/api';
import ReelFeed from '../../components/ReelFeed';
import UserBottomNav from '../../components/UserBottomNav';
import BottomNavFoodPartner from '../../components/BottomNavFoodPartner';
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';
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
  const foodPartnerId = searchParams.get('partnerId');
  const sortBy = searchParams.get('sortBy');
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotFound, setShowNotFound] = useState(false);
  const { userType } = useAuth();

  const { data: reelsData, loading: reelsLoading, error: reelsError } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.FOOD.BASE),
    [fooditemId, foodPartnerId, sortBy]
  );

  useEffect(() => {
    setLoading(true);
    if (reelsData) {
      let allReels = Array.isArray(reelsData.data)
        ? reelsData.data
        : (reelsData.data?.foodItems || []);

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
    }
    setLoading(false);
  }, [reelsData, fooditemId, foodPartnerId, sortBy]);

  // Dummy handlers for props
  const handleLike = () => {};
  const handleSave = () => {};
  const renderReel = () => null;

  return (
    <div>
      <ReelFeed
        reels={reels}
        loading={loading}
        showNotFound={showNotFound}
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
