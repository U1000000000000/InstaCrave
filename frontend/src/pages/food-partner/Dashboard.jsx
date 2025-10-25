import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import '../../styles/profile.css';

const Dashboard = () => {
  const [foodItems, setFoodItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/food-partner`, { withCredentials: true })
      .then(response => {
        setFoodItems(response.data.foodPartner.foodItems || []);
      });
  }, []);

  return (
    <main className="profile-page">
      <div style={{
        marginBottom: '18px',
        marginTop: '8px',
      }}>
        <h2 style={{
          fontWeight: 700,
          fontSize: '2.1rem',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          paddingLeft: '2px',
          margin: 0
        }}>Dashboard</h2>
      </div>
      <hr className="profile-sep" />
      <section className="dashboard-food-list" aria-label="Food Items">
        {foodItems.length === 0 && (
          <div style={{textAlign:'center', color:'var(--color-text-secondary)', marginTop:32}}>
            No food items yet, add them{' '}
            <a href="/create-food" style={{color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: 600}}>here</a>.
          </div>
        )}
        {foodItems.map((v, idx) => (
          <div
            key={v._id || v.id}
            className="dashboard-food-card"
            onClick={() => navigate(`/food-partner/dashboard/${v._id || v.id}`)}
          >
            <div className="dashboard-food-card-accent" />
            <div className="dashboard-food-card-content">
              <video
                className="dashboard-food-card-video"
                src={v.video}
                muted
                playsInline
                style={{aspectRatio:'9/16', width: '90px', height: '160px'}}
              ></video>
              <div className="dashboard-food-card-info">
                <div className="dashboard-food-card-title">{v.name}</div>
                <div className="dashboard-food-card-desc">{v.description}</div>
              </div>
              <div className="dashboard-food-card-arrow">→</div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Dashboard;
