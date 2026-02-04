import React, { useEffect, useState } from 'react';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import api from '../../services/api';
import '../../styles/reels.css';
import ReelFeed from '../../components/ReelFeed';
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAnalytics } from '../../hooks/useAnalytics';
import { showError } from '../../utils/toast';

const UserReels = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const analytics = useAnalytics();
  
  function commentVideo(item) {}
  const [videos, setVideos] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

    const shuffleArray = (array) => {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const { data, loading: reelsLoading, error: reelsError } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.FOOD.BASE),
    [authLoading, isAuthenticated]
  );
  
  useEffect(() => {
    if (!authLoading && isAuthenticated && data) {
      const shuffledReels = shuffleArray(data?.data || []);
      setVideos(shuffledReels);
      setFetchError(false);
      setDataLoading(false);
    }
  }, [authLoading, isAuthenticated, data]);

  useEffect(() => {
    analytics.trackPageView('User Reels - Explore');
  }, []);

  // Fixed like functionality with optimistic updates
  const likeVideo = async (item) => {
    const wasLiked = item.isLiked;
    setVideos(prev => prev.map(v => 
      v._id === item._id 
        ? { 
            ...v, 
            isLiked: !wasLiked,
            likeCount: wasLiked ? Math.max(0, v.likeCount - 1) : (v.likeCount || 0) + 1
          } 
        : v
    ));

    try {
      await api.post(API_ENDPOINTS.FOOD.LIKE, { foodId: item._id });
      analytics.trackFoodLike(item._id, !wasLiked);
    } catch (error) {
      setVideos(prev => prev.map(v => 
        v._id === item._id 
          ? { 
              ...v, 
              isLiked: wasLiked,
              likeCount: wasLiked ? (v.likeCount || 0) + 1 : Math.max(0, v.likeCount - 1)
            } 
          : v
      ));
      showError('Failed to update like. Please try again.');
    }
  };

  // Fixed save functionality with optimistic updates
  const saveVideo = async (item) => {
    const wasSaved = item.isSaved;
    setVideos(prev => prev.map(v => 
      v._id === item._id 
        ? { 
            ...v, 
            isSaved: !wasSaved,
            savesCount: wasSaved ? Math.max(0, (v.savesCount || 1) - 1) : (v.savesCount || 0) + 1
          } 
        : v
    ));

    try {
      await api.post(API_ENDPOINTS.FOOD.SAVE, { foodId: item._id });
      analytics.trackFoodSave(item._id, !wasSaved);
    } catch (error) {
      setVideos(prev => prev.map(v => 
        v._id === item._id 
          ? { 
              ...v, 
              isSaved: wasSaved,
              savesCount: wasSaved ? (v.savesCount || 0) + 1 : Math.max(0, (v.savesCount || 1) - 1)
            } 
          : v
      ));
      showError('Failed to update save. Please try again.');
    }
  };

    if (authLoading || dataLoading) {
    return <LoadingSpinner fullScreen color="accent" message="Loading reels..." />;
  }

    if (fetchError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        padding: '20px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Failed to load reels</div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <ReelFeed
      items={videos}
      onLike={likeVideo}
      onSave={saveVideo}
      onComment={commentVideo}
      emptyMessage="No videos available."
    />
  );
};

export default UserReels;
