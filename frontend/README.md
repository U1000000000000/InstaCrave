# InstaCrave Frontend

React-based web application for browsing food content, social interactions, and placing orders.

## Overview

The InstaCrave frontend is a single-page application (SPA) built with React 19 and Vite. It provides an intuitive interface for users to discover food through short-form videos, interact with content through likes and comments, follow food partners, and place orders.

## Technology Stack

- **Framework:** React 19.1
- **Build Tool:** Vite 7.1
- **Router:** React Router v7.8
- **HTTP Client:** Axios 1.11
- **Real-time:** Socket.IO Client 4.8
- **Animations:** Framer Motion 12.23
- **UI Icons:** React Icons 5.5 + Lucide React 0.544
- **Notifications:** React Hot Toast 2.6
- **Charts:** Recharts 3.7
- **Styling:** CSS3 with custom properties

## Project Structure

```
frontend/
├── src/
│   ├── main.jsx                # Application entry point
│   ├── App.jsx                 # Root component with routing
│   ├── config.js               # API configuration
│   │
│   ├── pages/                  # Route components
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── FoodPartnerLogin.jsx
│   │   │   └── FoodPartnerRegister.jsx
│   │   │
│   │   ├── user/
│   │   │   ├── Feed.jsx          # Main food feed
│   │   │   ├── Explore.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Saved.jsx
│   │   │   ├── Liked.jsx
│   │   │   ├── Following.jsx
│   │   │   └── Orders.jsx
│   │   │
│   │   ├── food-partner/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadFood.jsx
│   │   │   ├── ManageFoods.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── Profile.jsx
│   │   │
│   │   └── Home.jsx
│   │
│   ├── components/             # Reusable UI components
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── BottomNav.jsx
│   │   │
│   │   ├── food/
│   │   │   ├── FoodCard.jsx
│   │   │   ├── FoodVideoPlayer.jsx
│   │   │   └── FoodInteractions.jsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Loader.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   │
│   │   └── ProtectedRoute.jsx
│   │
│   ├── context/                # React Context providers
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── SocketContext.jsx   # WebSocket connection
│   │
│   ├── services/               # API integration
│   │   └── api.js              # Axios instance + endpoints
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.js
│   │   └── useSocket.js
│   │
│   ├── utils/                  # Helper functions
│   │   ├── validators.js
│   │   └── formatters.js
│   │
│   ├── constants/              # App constants
│   │   └── index.js
│   │
│   ├── styles/                 # Global styles
│   │   ├── index.css
│   │   └── variables.css
│   │
│   └── assets/                 # Static assets
│
├── public/                     # Public static files
├── nginx.conf                  # Production Nginx config
├── Dockerfile                  # Production Docker image
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint configuration
├── package.json
└── README.md                   # This file
```

## Installation

### Prerequisites
- Node.js 20.x or higher
- Backend API running (see backend README)

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Environment Configuration**

Create a `.env` file in the frontend root directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# Optional: WebSocket URL (defaults to API URL)
VITE_WS_URL=http://localhost:3000
```

## Running the Application

### Development Mode
```bash
npm run dev
```
Application runs on http://localhost:5173 with hot module replacement.

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Build output is in `dist/` directory.

### Using Docker
```bash
# Build image
docker build -t instacrave-frontend .

# Run container
docker run -p 80:80 instacrave-frontend
```

## Features

### User Features

**Authentication**
- User registration and login
- Food partner registration and login
- Session persistence with cookies
- Automatic token refresh
- Logout functionality

**Food Discovery**
- Vertical video feed (TikTok-style)
- Infinite scroll
- Search functionality
- Filter by category, price, partner
- Explore trending content

**Social Interactions**
- Like/unlike food items
- Save favorites
- Comment on food
- Follow/unfollow food partners
- View engagement metrics

**Ordering**
- Browse orderable items
- Place orders
- View order history
- Track order status updates

### Food Partner Features

**Content Management**
- Upload food videos (MP4)
- Add food details (name, description, price)
- Edit food items
- Delete food items
- Set orderable status

**Order Management**
- View incoming orders
- Update order status
- Order history
- Real-time order notifications

**Analytics**
- View follower count
- Track likes and saves
- Monitor engagement metrics

## Key Components

### Authentication Flow

**Login:**
```javascript
// User login
const response = await authApi.loginUser({ email, password });
// Sets HTTP-only cookies: accessToken, refreshToken, sessionId

// Food Partner login
const response = await authApi.loginFoodPartner({ email, password });
```

**Protected Routes:**
```jsx
<Route element={<ProtectedRoute allowedRoles={['user']} />}>
  <Route path="/user/feed" element={<Feed />} />
</Route>

<Route element={<ProtectedRoute allowedRoles={['food-partner']} />}>
  <Route path="/food-partner/dashboard" element={<Dashboard />} />
</Route>
```

### API Integration

All API calls use Axios with automatic token handling:

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Send cookies
});

// Automatic token refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await authApi.refreshToken();
      // Retry original request
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### State Management

**Authentication Context:**
```jsx
import { useAuth } from './context/AuthContext';

function SomeComponent() {
  const { user, userType, login, logout, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <div>Welcome, {user.fullName}</div>;
}
```

**Socket.IO Integration:**
```jsx
import { useSocket } from './hooks/useSocket';

function Orders() {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('new-order', (order) => {
      toast.success('New order received!');
      // Update orders list
    });
    
    return () => socket.off('new-order');
  }, [socket]);
}
```

## Routing

### User Routes
- `/` - Home/Landing page
- `/user/login` - User login
- `/user/register` - User registration
- `/user/feed` - Main food feed
- `/user/explore` - Explore trending
- `/user/search` - Search results
- `/user/profile` - User profile
- `/user/saved` - Saved foods
- `/user/liked` - Liked foods
- `/user/following` - Followed partners
- `/user/orders` - Order history

### Food Partner Routes
- `/food-partner/login` - Partner login
- `/food-partner/register` - Partner registration
- `/food-partner/dashboard` - Main dashboard
- `/food-partner/upload` - Upload food
- `/food-partner/manage` - Manage foods
- `/food-partner/orders` - Incoming orders
- `/food-partner/profile` - Partner profile

## Styling

### CSS Architecture
- CSS modules for component-specific styles
- Global styles in `styles/index.css`
- CSS custom properties for theming
- Responsive design with media queries
- Mobile-first approach

### Theme Variables
```css
:root {
  /* Colors */
  --primary-color: #ff4655;
  --secondary-color: #000000;
  --background: #ffffff;
  --text-primary: #000000;
  --text-secondary: #606060;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  /* Breakpoints */
  --mobile: 480px;
  --tablet: 768px;
  --desktop: 1024px;
}
```

### Responsive Design
- Mobile: < 768px (single column, bottom navigation)
- Tablet: 768px - 1024px (adjusted layouts)
- Desktop: > 1024px (sidebar navigation, multi-column)

## Performance Optimization

### Code Splitting
```javascript
import { lazy, Suspense } from 'react';

const Feed = lazy(() => import('./pages/user/Feed'));
const Dashboard = lazy(() => import('./pages/food-partner/Dashboard'));

<Suspense fallback={<Loader />}>
  <Routes>
    <Route path="/user/feed" element={<Feed />} />
    <Route path="/food-partner/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### Image Optimization
- Lazy loading for images
- Responsive image sizes
- WebP format support
- CDN delivery (ImageKit)

### Other Optimizations
- Debounced search inputs
- Memoized expensive computations
- Virtual scrolling (planned)
- Service worker for offline support (planned)

## Development Guidelines

### Code Style
- Use functional components with hooks
- Follow React naming conventions
- Use PropTypes for type checking
- Keep components small and focused
- Extract reusable logic to custom hooks

### Component Pattern
```jsx
import PropTypes from 'prop-types';
import './FoodCard.css';

function FoodCard({ food, onLike, onSave }) {
  return (
    <div className="food-card">
      <video src={food.video} />
      <h3>{food.name}</h3>
      <p>{food.description}</p>
      <button onClick={() => onLike(food._id)}>Like</button>
      <button onClick={() => onSave(food._id)}>Save</button>
    </div>
  );
}

FoodCard.propTypes = {
  food: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    video: PropTypes.string.isRequired,
  }).isRequired,
  onLike: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default FoodCard;
```

### Custom Hooks
```javascript
// hooks/useAuth.js
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Error Handling
```javascript
import toast from 'react-hot-toast';

async function handleSubmit(data) {
  try {
    await api.post('/endpoint', data);
    toast.success('Success!');
  } catch (error) {
    const message = error.response?.data?.message || 'Something went wrong';
    toast.error(message);
  }
}
```

## Build & Deployment

### Production Build
```bash
npm run build
```

Output in `dist/` includes:
- Minified JavaScript
- Optimized CSS
- Compressed assets
- Source maps (optional)

### Environment Variables
In production, set:
- `VITE_API_URL` to production backend URL
- `VITE_WS_URL` to WebSocket server URL (if different)

### Nginx Configuration
The included `nginx.conf` provides:
- Static file serving
- Gzip compression
- Client-side routing support
- Cache headers
- Security headers

### Docker Deployment
```bash
# Build production image
docker build -t instacrave-frontend:latest .

# Run container
docker run -p 80:80 instacrave-frontend:latest
```

### Using Docker Compose
From project root:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### Common Issues

**API Connection Failed**
- Check backend is running
- Verify `VITE_API_URL` in `.env`
- Check CORS configuration in backend
- Inspect network tab for errors

**Authentication Not Working**
- Clear browser cookies
- Check backend session/token handling
- Verify cookie settings (httpOnly, sameSite)

**Build Fails**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check for TypeScript errors (if using .ts files)

**Hot Reload Not Working**
- Check Vite config
- Restart dev server
- Clear browser cache

**Video Playback Issues**
- Check video format (must be MP4)
- Verify video URL is accessible
- Check browser console for errors
- Ensure autoplay is allowed in browser

## Dependencies

### Core Dependencies
- **react** (19.1.1) - UI library
- **react-dom** (19.1.1) - React DOM renderer
- **react-router-dom** (7.8.0) - Client-side routing
- **axios** (1.11.0) - HTTP client
- **socket.io-client** (4.8.3) - Real-time communication
- **framer-motion** (12.23.24) - Animations
- **react-hot-toast** (2.6.0) - Toast notifications
- **react-icons** (5.5.0) - Icon library
- **lucide-react** (0.544.0) - Additional icons
- **recharts** (3.7.0) - Charting library

### Dev Dependencies
- **vite** (7.1.2) - Build tool
- **@vitejs/plugin-react** (5.0.0) - React plugin for Vite
- **eslint** (9.33.0) - Linting
- **eslint-plugin-react-hooks** (5.2.0) - React hooks linting
- **eslint-plugin-react-refresh** (0.4.20) - React refresh linting

## Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Offline functionality with service workers
- [ ] Push notifications
- [ ] Dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] Advanced search filters
- [ ] User preferences/settings page
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] Performance monitoring integration
- [ ] A/B testing framework

## License

MIT License
