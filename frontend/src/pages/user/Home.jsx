import React, { useEffect, useState } from 'react';
import { useProtectedRequest } from '../../hooks/useProtectedRequest';
import api from '../../services/api';
import '../../styles/reels.css';
import '../../styles/user-home.css';
import ReelFeed from '../../components/ReelFeed';
import { API_BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const UserHome = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  function commentVideo(item) {}
  const [videos, setVideos] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const { data, loading: feedLoading, error: feedError } = useProtectedRequest(
    () => api.get(API_ENDPOINTS.FOOD.FOLLOWED),
    [authLoading, isAuthenticated]
  );
  useEffect(() => {
    if (!authLoading && isAuthenticated && data) {
      const feedItems = data?.data || [];
      if (feedItems.length > 0) {
        setVideos([...feedItems, { _id: 'caught-up', isCaughtUp: true }]);
      } else {
        setVideos(feedItems);
      }
      setDataLoading(false);
    }
  }, [authLoading, isAuthenticated, data]);

  async function likeVideo(item) {
    const { data } = await useProtectedRequest(
      () => api.post(API_ENDPOINTS.FOOD.LIKE, { foodId: item._id }),
      []
    );
    if (data) {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, likeCount: v.likeCount + 1, isLiked: true } : v));
    } else {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, likeCount: v.likeCount - 1, isLiked: false } : v));
    }
  }

  async function saveVideo(item) {
    const { data } = await useProtectedRequest(
      () => api.post(API_ENDPOINTS.FOOD.SAVE, { foodId: item._id }),
      []
    );
    if (data) {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, savesCount: v.savesCount + 1 } : v));
    } else {
      setVideos(prev => prev.map(v => v._id === item._id ? { ...v, savesCount: v.savesCount - 1 } : v));
    }
  }

    if (authLoading || dataLoading) {
    return <LoadingSpinner fullScreen color="accent" message="Loading your feed..." />;
  }

  if (videos.length === 0) {
    return (
      <main className="user-home-empty-container">
        <h2 className="user-home-title">Home</h2>
        <div className="user-home-empty-content">
          <div className="user-home-empty-message">
            You are not following anyone.<br />
            Find food partners here:
          </div>
          <a href="/user/reels" className="user-home-explore-button">
            Explore Reels
          </a>
        </div>
      </main>
    );
  }
  return (
    <div className="user-home-container">
      <div className="user-home-header">
        <div className="user-home-badge-container">
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="user-home-badge-bg">
            <path
              d="M2 2 H118 Q118 2 118 28 Q118 38 108 38 H12 Q2 38 2 28 Q2 2 2 2 Z"
              fill="var(--color-surface-alt, #fffbe6)"
              stroke="var(--color-border, #222)"
              strokeWidth="2"
            />
          </svg>
          <span className="user-home-badge-text">
            Following
          </span>
        </div>
      </div>
      <ReelFeed
        items={videos}
        onLike={likeVideo}
        onSave={saveVideo}
        onComment={commentVideo}
        emptyMessage="No videos available."
        customRender={(item) => {
          if (item.isCaughtUp) {
            return (
              <div className="caught-up-container">
                <div className="caught-up-icon-circle">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="var(--color-accent, #ff4081)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="caught-up-title">
                  You're all caught up!
                </h2>
                <a href="/user/search" className="caught-up-explore-button">
                  Explore
                </a>
              </div>
            );
          }
          return null;
        }}
      />
    </div>
  );
};

export default UserHome;
