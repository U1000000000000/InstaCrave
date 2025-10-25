import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { FaSearch } from 'react-icons/fa';

const GradientCard = ({ profileImage, name, mealCount, onClick }) => {
  const [gradient, setGradient] = useState('linear-gradient(135deg, #1a1a1a, #2a2a2a)');
  const imgRef = useRef();

  useEffect(() => {
    if (!profileImage) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = profileImage;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

                const width = canvas.width;
        const height = canvas.height;
        
        const getColorAt = (x, y) => {
          const data = ctx.getImageData(x, y, 1, 1).data;
          return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
        };

                const color1 = getColorAt(Math.floor(width * 0.2), Math.floor(height * 0.2));
        const color2 = getColorAt(Math.floor(width * 0.8), Math.floor(height * 0.8));

        setGradient(`radial-gradient(ellipse at center, ${color1}, ${color2})`);
      } catch (err) {
        console.error('Error extracting colors:', err);
                setGradient('linear-gradient(135deg, #1a1a1a, #2a2a2a)');
      }
    };

    img.onerror = () => {
      setGradient('linear-gradient(135deg, #1a1a1a, #2a2a2a)');
    };
  }, [profileImage]);

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: gradient,
        padding: '20px',
        gap: '12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <img
        ref={imgRef}
        src={profileImage || 'https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210'}
        alt={name}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #E23747',
          boxShadow: '0 4px 12px rgba(226, 55, 71, 0.4)',
        }}
      />
      <div
        style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.05rem',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          width: '100%',
          lineHeight: '1.3',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        {name}
      </div>
      <div
        style={{
          color: '#f0f0f0',
          fontSize: '0.85rem',
          fontWeight: 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {mealCount || 0} meals
      </div>
    </div>
  );
};

const SEARCH_TYPES = [
  { label: 'All', value: 'all' },
  { label: 'Food Items', value: 'food' },
  { label: 'Food Partners', value: 'partner' },
];

const UserSearch = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ foodItems: [], foodPartners: [] });
  const [error, setError] = useState('');
  const inputRef = useRef();
  
    const [exploreItems, setExploreItems] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);

  useEffect(() => {
    // Fetch unfollowed content for explore section
    const fetchExploreContent = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/search/explore`, { withCredentials: true });
        
        const unfollowedMeals = res.data.foodItems || [];
        const unfollowedPartners = res.data.foodPartners || [];
        
        // Shuffle meals
        const shuffledMeals = [...unfollowedMeals];
        for (let i = shuffledMeals.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledMeals[i], shuffledMeals[j]] = [shuffledMeals[j], shuffledMeals[i]];
        }
        
        // Shuffle partners
        const shuffledPartners = [...unfollowedPartners];
        for (let i = shuffledPartners.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledPartners[i], shuffledPartners[j]] = [shuffledPartners[j], shuffledPartners[i]];
        }
        
                const layoutItems = [];
        let mealIndex = 0;
        let partnerIndex = 0;
        let position = 0;
        
                const gridTracker = [];
        
        while (mealIndex < shuffledMeals.length || partnerIndex < shuffledPartners.length) {
          const col = position % 3;
          const row = Math.floor(position / 3);
          
                    if (partnerIndex < shuffledPartners.length && col <= 1) {
                        const canPlacePartner = !gridTracker[position] && !gridTracker[position + 1] && 
                                    !gridTracker[position + 3] && !gridTracker[position + 4];
            
            if (canPlacePartner && Math.random() < 0.15) {               layoutItems.push({ ...shuffledPartners[partnerIndex], type: 'partner', isTall: false });
                            gridTracker[position] = true;
              gridTracker[position + 1] = true;
              gridTracker[position + 3] = true;
              gridTracker[position + 4] = true;
              partnerIndex++;
              position += 2;               continue;
            }
          }
          
                    if (mealIndex < shuffledMeals.length) {
            const isTall = !gridTracker[position] && !gridTracker[position + 3] && Math.random() < 0.05;
            layoutItems.push({ ...shuffledMeals[mealIndex], type: 'meal', isTall });
            gridTracker[position] = true;
            if (isTall) {
              gridTracker[position + 3] = true;
            }
            mealIndex++;
          }
          
          position++;
        }
        
        setExploreItems(layoutItems);
        setExploreLoading(false);
      } catch (err) {
        console.error('Error fetching explore content:', err);
        console.error('Error response:', err.response?.data);
                setExploreItems([]);
        setExploreLoading(false);
      }
    };
    
    fetchExploreContent();
  }, []);

  const handleSearch = async (q = query, t = type) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/search`, {
        params: { query: q, type: t },
        withCredentials: true,
      });
      setResults(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error searching.');
      setResults({ foodItems: [], foodPartners: [] });
    }
    setLoading(false);
  };

  const handleInput = e => {
    setQuery(e.target.value);
        handleSearch(e.target.value, type);
  };

  const handleTypeChange = t => {
    setType(t);
    handleSearch(query, t);
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setResults({ foodItems: [], foodPartners: [] });
    setError('');
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ padding: '16px 12px 8px 12px', background: 'var(--color-surface)', borderBottom: '1.5px solid var(--color-border)', zIndex: 2 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-bg)',
            borderRadius: 50,
            padding: '12px 20px',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
            fontSize: '1.08rem',
            border: '1px solid var(--color-border)',
            transition: 'all 0.2s',
          }}
          onClick={openSearch}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(226, 55, 71, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <FaSearch style={{ marginRight: 12, fontSize: 16, color: 'var(--color-accent)' }} />
          <span style={{ opacity: 0.8 }}>Search...</span>
        </div>
      </div>
      {searchOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={closeSearch}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
              minHeight: 120,
              padding: '24px 18px 12px 18px',
              boxShadow: '0 2px 16px 0 rgba(0,0,0,0.10)',
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              position: 'relative',
              color: 'var(--color-text)',
              maxHeight: '90vh',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#E23747 var(--color-surface)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                placeholder="Search..."
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  borderRadius: 10,
                  border: '1.2px solid',
                  borderColor: searchOpen ? '#e25a6a' : 'var(--color-border)',
                  fontSize: '1.08rem',
                  outline: 'none',
                  marginBottom: 12,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                  transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  height: 48,
                  lineHeight: '24px',
                  display: 'block',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 22,
                  top: 0,
                  bottom: 0,
                  height: 24,
                  width: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 'auto',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  fontSize: 20,
                  zIndex: 2,
                  borderRadius: '50%',
                  transition: 'background 0.18s',
                  background: 'none',
                }}
                onClick={closeSearch}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(226,90,106,0.10)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
                aria-label="Close search"
                tabIndex={0}
                role="button"
              >
                ×
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {SEARCH_TYPES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeChange(opt.value)}
                  style={{
                    background: type === opt.value ? '#E23747' : 'var(--color-surface)',
                    color: type === opt.value ? '#fff' : 'var(--color-text',
                    border: type === opt.value ? 'none' : '1.5px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: type === opt.value ? '0 2px 8px 0 rgba(226,55,71,0.10)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {loading && <div style={{ color: '#E23747', fontWeight: 600, margin: '12px 0' }}>Searching...</div>}
            {error && <div style={{ color: '#E23747', fontWeight: 600, margin: '12px 0' }}>{error}</div>}
            {!loading && !error && (
              <div>
                {type !== 'partner' && results.foodItems.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: '#E23747', marginBottom: 6, fontSize: '1.13rem' }}>Food Items</div>
                    {results.foodItems.map(item => {
                      const id = item._id || item.id;
                      return (
                        <div
                          key={id}
                          role="button"
                          tabIndex={0}
                          onClick={() => { navigate(`/reels/${id}`); closeSearch(); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { navigate(`/reels/${id}`); closeSearch(); } }}
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '1.08rem' }}>{item.name}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.98rem', marginTop: 2 }}>{item.description}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {type !== 'food' && results.foodPartners.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#E23747', marginBottom: 6, fontSize: '1.13rem' }}>Food Partners</div>
                    {results.foodPartners.map(partner => {
                      const id = partner._id || partner.id;
                      return (
                        <div
                          key={id}
                          role="button"
                          tabIndex={0}
                          onClick={() => { navigate(`/food-partner/${id}`); closeSearch(); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { navigate(`/food-partner/${id}`); closeSearch(); } }}
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '1.08rem' }}>{partner.name}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {results.foodItems.length === 0 && results.foodPartners.length === 0 && query.trim() && (
                  <div style={{ color: '#888', fontWeight: 500, marginTop: 16 }}>No results found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {!searchOpen && (
        <div style={{ padding: '0 0 80px 0', background: 'var(--color-bg)' }}>
          {exploreLoading ? (
            <div style={{ color: '#fff', padding: 32, textAlign: 'center' }}>Loading...</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0,
                padding: 0,
                width: '100%',
                boxSizing: 'border-box',
                gridAutoFlow: 'dense',
              }}
            >
              {exploreItems.map((item, index) => {
                                const isPartner = item.type === 'partner';
                const isTall = item.isTall || false;
                
                return (
                  <div
                    key={`${item.type}-${item._id || item.id}-${index}`}
                    onClick={() => {
                      if (isPartner) {
                        navigate(`/food-partner/${item._id}`);
                      } else {
                        navigate(`/reels/${item._id}`);
                      }
                    }}
                    style={{
                      gridColumn: isPartner ? 'span 2' : 'span 1',
                      gridRow: isPartner ? 'span 2' : isTall ? 'span 2' : 'span 1',
                      aspectRatio: '1',
                      position: 'relative',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      borderRadius: 0,
                      background: '#232428',
                      minHeight: 0,
                      minWidth: 0,
                    }}
                  >
                    {isPartner ? (
                      <GradientCard
                        profileImage={item.profileImage}
                        name={item.name}
                        mealCount={item.mealCount}
                        onClick={() => navigate(`/food-partner/${item._id}`)}
                      />
                    ) : (
                      <>
                        {item.video ? (
                          <video
                            src={item.video}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              background: '#2e2e2e',
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '8px',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
