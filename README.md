# NexusAPI — Scalable REST API with Authentication & Role-Based Access

A production-ready REST API built with **Node.js**, **Express**, and **MongoDB**, featuring JWT authentication, role-based access control (RBAC), full CRUD operations, API documentation, and a polished frontend UI.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

---

## 🚀 Features

### Backend
- **JWT Authentication** — Secure registration & login with bcrypt password hashing (salt rounds: 12)
- **Role-Based Access Control** — User vs Admin roles with middleware-enforced permissions
- **CRUD API** — Full product management with pagination, filtering, sorting, and search
- **API Versioning** — All routes prefixed with `/api/v1/` for future scalability
- **Input Validation** — express-validator with sanitization on all endpoints
- **API Documentation** — Auto-generated Swagger/OpenAPI docs at `/api-docs`
- **Security** — Helmet headers, CORS, rate limiting (100 req/15min), body size limits
- **Error Handling** — Global error handler with structured JSON responses
- **Logging** — Morgan HTTP logging in development mode

### Frontend
- **Premium Dark UI** — Glassmorphism design with animated gradient backgrounds
- **Auth Flow** — Login & Register with form validation and loading states
- **Dashboard** — Statistics cards, product grid, search, category filtering
- **CRUD Operations** — Create, edit, delete products via modal dialogs
- **Role-Aware UI** — Edit/delete buttons shown based on user permissions
- **Toast Notifications** — Success, error, and info messages from API responses
- **Responsive** — Fully responsive from mobile to desktop

---

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/db.js              # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Auth logic (register, login, profile)
│   │   │   └── product.controller.js # Product CRUD logic
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification
│   │   │   ├── role.js               # Role-based authorization
│   │   │   ├── validate.js           # Validation result handler
│   │   │   └── errorHandler.js       # Global error handler
│   │   ├── models/
│   │   │   ├── User.js               # User schema + password hashing
│   │   │   └── Product.js            # Product schema
│   │   ├── routes/v1/
│   │   │   ├── auth.routes.js        # Auth endpoints
│   │   │   └── product.routes.js     # Product endpoints
│   │   ├── validators/
│   │   │   ├── auth.validator.js     # Auth validation rules
│   │   │   └── product.validator.js  # Product validation rules
│   │   └── app.js                    # Express app setup
│   ├── server.js                     # Entry point
│   ├── .env.example                  # Environment variables template
│   └── package.json
├── frontend/
│   ├── index.html                    # SPA shell
│   ├── css/styles.css                # Premium dark theme
│   └── js/
│       ├── app.js                    # Router & initialization
│       ├── api.js                    # API service layer
│       ├── auth.js                   # Auth form handlers
│       ├── dashboard.js              # Dashboard & CRUD logic
│       └── utils.js                  # Toasts, helpers
├── README.md
└── SCALABILITY.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** v18+ 
- **MongoDB** running locally or a MongoDB Atlas connection string

### 1. Clone the repository
```bash
git clone <repository-url>
cd <project-folder>
```

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/scalable-api
# JWT_SECRET=your-secret-key-here
# JWT_EXPIRE=7d
# NODE_ENV=development
```

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Access the app
- **Frontend**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs
- **API Base**: http://localhost:5000/api/v1

---

## 📚 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login & receive JWT |
| GET | `/me` | Private | Get current user profile |

### Products (`/api/v1/products`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private | List all products (paginated) |
| GET | `/:id` | Private | Get single product |
| POST | `/` | Private | Create new product |
| PUT | `/:id` | Owner/Admin | Update product |
| DELETE | `/:id` | Admin only | Delete product |

### Query Parameters (GET /products)
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `category` | string | Filter by category |
| `search` | string | Search in name & description |
| `sort` | string | Sort field (prefix `-` for desc) |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |

---

## 🔐 Authentication Flow

1. **Register**: `POST /api/v1/auth/register` with `{ name, email, password, role }`
2. **Login**: `POST /api/v1/auth/login` with `{ email, password }`
3. **Use Token**: Include `Authorization: Bearer <token>` in subsequent requests
4. **Token Expiry**: Tokens expire after 7 days (configurable via `JWT_EXPIRE`)

---

## 🗄️ Database Schema

### User
| Field | Type | Constraints |
|-------|------|-------------|
| name | String | Required, 2-50 chars |
| email | String | Required, unique, valid email |
| password | String | Required, min 6 chars, hashed |
| role | String | Enum: `user`, `admin` (default: `user`) |

### Product
| Field | Type | Constraints |
|-------|------|-------------|
| name | String | Required, 3-100 chars |
| description | String | Required, max 1000 chars |
| price | Number | Required, min 0 |
| category | String | Enum: electronics, clothing, books, food, sports, other |
| inStock | Boolean | Default: true |
| createdBy | ObjectId | Reference to User |

---

## 🛡️ Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Signed with HS256, configurable expiration
- **Helmet**: Sets secure HTTP headers
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Input Sanitization**: express-validator on all inputs
- **Body Size Limit**: 10KB maximum request body
- **No Password Leaks**: Password field excluded from queries by default

---

## 📖 API Documentation

Interactive Swagger documentation is available at:
```
http://localhost:5000/api-docs
```

### Postman Collection
A ready-to-use Postman collection is included at the project root:
```
NexusAPI.postman_collection.json
```
Import it into [Postman](https://www.postman.com/) to test all endpoints. The collection includes:
- Auto-saving JWT token on login/register
- Pre-configured query parameters with descriptions
- All Auth, Products, and Health endpoints

---

## 📄 License

ISC
