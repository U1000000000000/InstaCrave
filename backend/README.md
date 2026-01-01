# InstaCrave Backend

## Overview

This backend powers the InstaCrave platform, providing RESTful APIs for user authentication, food partner management, order processing, and more. It is built with Node.js, Express, and MongoDB, and is designed for scalability, security, and maintainability.

## Features
- User and Food Partner authentication (JWT-based)
- Food item management
- Order management
- Social features: comments, likes, saves, follows
- Search and filtering
- Robust validation and error handling
- Modular architecture

## Project Structure

```
backend/
  src/
    app.js                # Main Express app
    controllers/          # Route controllers
    db/                   # Database connection
    middlewares/          # Express middlewares
    models/               # Mongoose models
    routes/               # API route definitions
    services/             # Business logic/services
  package.json            # Backend dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas)

### Installation

1. Install dependencies:
   ```sh
   cd backend
   npm install
   ```
2. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in required values.

### Running the Server

- Development:
  ```sh
  npm run dev
  ```
- Production:
  ```sh
  npm start
  ```

### Running Tests

- Run all tests:
  ```sh
  npm test
  ```
- Run unit tests only:
  ```sh
  npm run test:unit
  ```
- Run integration tests only:
  ```sh
  npm run test:integration
  ```
- Run tests with coverage:
  ```sh
  npm run test:coverage
  ```

## CI/CD Pipeline

This project uses **GitHub Actions** for CI/CD. The workflow is defined in `.github/workflows/ci.yml` and includes:
- Matrix testing on Node.js 18.x and 20.x
- Linting and code quality checks
- Unit and integration tests
- Coverage enforcement (90%+ statements, 70%+ branches, 80%+ functions, 90%+ lines)
- Codecov integration for coverage reporting
- Security audit with `npm audit`
- Artifact upload for test results

### Coverage Enforcement

The pipeline will fail if coverage thresholds are not met. See `nyc check-coverage` in the workflow for details.

### Codecov

Coverage reports are uploaded to [Codecov](https://codecov.io/) for visualization and tracking. Ensure the repository is connected to Codecov for full functionality.

## Documentation

- [TESTING_PRODUCTION_READINESS.md](./TESTING_PRODUCTION_READINESS.md): Detailed test coverage and quality assessment.
- [API Documentation](./docs/api.md): API endpoints and usage (if available).

## Contributing

1. Fork the repo and create a feature branch.
2. Write clear, well-tested code.
3. Ensure all tests and lint checks pass.
4. Submit a pull request with a clear description.

## License

MIT
