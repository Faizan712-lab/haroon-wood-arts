# Haroon Wood Arts

Full-stack e-commerce application for a handmade wood art store. The project includes a React storefront, cart and checkout flows, user authentication, Google sign-in, wishlist management, order tracking, and an admin dashboard for managing products, categories, and orders.

## Features

- Customer registration, login, profile management, and password reset with email OTP
- Google OAuth sign-in
- Product catalog with categories, variants, product details, reviews, wishlist, and cart
- Checkout, address management, order creation, and order status tracking
- Admin registration/login with secret key, OTP verification, trusted-device cookies, and account settings
- Admin dashboard for products, categories, orders, status updates, returns, and refunds
- MySQL-backed API with parameterized queries and cookie-based JWT sessions

## Tech Stack

- Frontend: React, Vite, React Router, React Hot Toast, React Icons, Framer Motion
- Backend: Node.js, Express, MySQL2, JWT, bcryptjs, Nodemailer, Google Auth Library
- Database: MySQL
- Tooling: ESLint, Nodemon

## Folder Structure

```text
haroon-wood-arts/
  client/              React + Vite frontend
    public/            Static assets
    src/               Pages, components, context, utilities
  server/              Express API
    config/            Database configuration
    controllers/       Route handlers and business workflows
    middleware/        Authentication middleware
    routes/            API route definitions
    migrations/        Numbered production database migrations
    scripts/migrate.js Migration runner
  .env.example         Combined environment variable reference
```

## Installation

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

Initialize or update the database schema:

```bash
npm run migrate
```

## Environment Setup

Copy the example files and fill in your own local values:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Required backend variables include database credentials, `JWT_SECRET`, `ADMIN_SECRET_KEY`, email credentials for OTP delivery, and Google OAuth credentials if Google login is enabled. Keep all `.env` files private.

## Running Locally

Start the API:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

By default, Vite proxies `/api` requests to `http://127.0.0.1:5000`. Override this with `VITE_API_PROXY_TARGET` when needed.

## Build

```bash
cd client
npm run build
```

The production frontend build is generated in `client/dist/` and should not be committed.

## Screenshots

Add screenshots or GIFs here before sharing the repository:

- Home page
- Product details
- Cart and checkout
- Orders page
- Admin dashboard

## Security Notes

- Secrets are loaded from environment variables and excluded from version control.
- JWT cookies are HTTP-only; production cookies use secure settings.
- SQL queries use parameterized placeholders.
- Admin and OTP endpoints include rate limiting.
- API responses avoid exposing raw SQL errors to clients.

## Future Improvements

- Add automated API and UI test coverage
- Add image storage through a dedicated object storage service
- Add payment gateway integration with server-side verification
- Add centralized request validation middleware
- Add CI checks for linting, build, and secret scanning

## License

ISC
