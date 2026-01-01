# InstaCrave 🍔📱

**Discover and share amazing food through short videos**

InstaCrave is a social media platform where food partners showcase their delicious dishes through engaging short-form videos (reels), and users can discover, like, save, and follow their favorite food spots.

## Features

### For Users
- 📹 Browse endless food reels with smooth vertical scrolling
- ❤️ Like and save your favorite dishes
- 💬 Comment on food videos
- 👤 Follow food partners
- 🔍 Search for food and restaurants
- 📱 Responsive design with bottom navigation

### For Food Partners
- 🎥 Upload and manage food video reels
- 📊 Dashboard to track performance
- 👥 Build a follower base
- 🎨 Customize profile and branding
- 📈 View analytics on likes, saves, and engagement

## Tech Stack

- **Frontend**: React 19 + Vite
- **Routing**: React Router v7
- **Animations**: Framer Motion
- **Styling**: CSS with theme system (light/dark mode)
- **HTTP Client**: Axios
- **Icons**: React Icons

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Security & Data Validation

- **Input Sanitization:** All user-facing text fields (names, descriptions, comments, addresses, etc.) are sanitized using `sanitize-html` at both the controller and validation (Joi) layer. Global input sanitization is enforced using `xss-clean` middleware in the backend.
- **File Upload Security:** Only `video/mp4`, `image/jpeg`, and `image/png` files are accepted, with a maximum size of 10MB. File signature/content is checked after upload to prevent spoofing.
- **Validation Layer:** All incoming data is validated and sanitized with Joi schemas and `.custom()` hooks.
- **Error Handling:** All validation and sanitization errors are handled by a centralized error middleware for consistent API responses.
- **Contributor Security Notes:** Always validate and sanitize user input. Use the provided `sanitize.js` utility in Joi schemas for all user-facing strings. For new file upload endpoints, use the existing `fileUpload.middleware.js` and always check file type and signature. Review and update sanitization rules regularly as new threats emerge.

See `backend/SECURITY.md` for more details.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components (user, food-partner, auth)
├── routes/         # Route configuration
├── styles/         # CSS files and theme
├── context/        # React context providers
└── config.js       # API configuration
```

---

Made with ❤️ and 🍕
