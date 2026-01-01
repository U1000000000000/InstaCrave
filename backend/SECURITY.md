# Security & Data Validation in InstaCrave Backend

## Input Sanitization
- All user-facing text fields (names, descriptions, comments, addresses, etc.) are sanitized using [sanitize-html](https://www.npmjs.com/package/sanitize-html) at both the controller and validation (Joi) layer.
- Global input sanitization is enforced using [xss-clean](https://www.npmjs.com/package/xss-clean) middleware in `app.js`.

## File Upload Security
- File uploads are handled with [multer](https://www.npmjs.com/package/multer) and [file-type](https://www.npmjs.com/package/file-type).
- Only `video/mp4`, `image/jpeg`, and `image/png` files are accepted, with a maximum size of 10MB.
- File signature/content is checked after upload to prevent spoofing.

## Validation Layer
- All incoming data is validated with [Joi](https://joi.dev/), and sanitized using `.custom()` hooks.
- See `/src/validation/*.js` for schema details.

## Error Handling
- All validation and sanitization errors are handled by a centralized error middleware for consistent API responses.

## Contributor Security Notes
- Never trust user input: always validate and sanitize.
- When adding new endpoints, use the provided `sanitize.js` utility in Joi schemas for all user-facing strings.
- For new file upload endpoints, use the existing `fileUpload.middleware.js` and always check file type and signature.
- Review and update sanitization rules regularly as new threats emerge.

## API Documentation
- API docs specify which fields are sanitized and which file types are accepted.
- See `/docs/swagger-setup.js` for OpenAPI/Swagger integration.

---

**For more details, see the code in `/src/validation/`, `/src/middlewares/`, and `/src/controllers/`.**
