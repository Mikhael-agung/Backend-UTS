# 📱 Service Complaint API

REST API backend untuk aplikasi Service Complaint (Project UTS) dengan Express.js dan Supabase.

## 🚀 Fitur Utama

- ✅ **Authentication System** (Register/Login/Logout)
- ✅ **Complaint Management** (Create, Read History, Get Detail)
- ✅ **User Profile** (Get & Update)
- ✅ **Role-based Access** (Customer, Teknisi, Admin)
- ✅ **Token-based Authentication** (Simple Token System)
- ✅ **Error Handling** yang baik
- ✅ **Response Format** konsisten (JSON)

## 🏗️ Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Custom Token System
- **Password Hashing:** SHA256 (Fast & Secure enough for UTS)
- **Environment:** dotenv untuk configuration

## 📁 Project Structure

```
complaint-service-api/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase connection
│   ├── controllers/
│   │   ├── AuthController.js     # Authentication logic
│   │   ├── ComplaintController.js # Complaint operations
│   │   └── UserController.js     # User profile operations
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── errorHandler.js      # Global error handling
│   ├── models/
│   │   ├── User.js              # User data model
│   │   └── Complaint.js         # Complaint data model
│   ├── routes/
│   │   ├── auth.routes.js       # Auth endpoints
│   │   ├── complaints.routes.js # Complaint endpoints
│   │   └── users.routes.js      # User endpoints
│   └── utils/
│       ├── tokenStore.js        # Token management
│       └── response.js          # Response formatter
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── server.js                    # Entry point
└── README.md                    # This file
```

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd complaint-service-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Edit `.env` file:
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 4. Run Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server akan berjalan di `http://localhost:3000`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |
| POST | `/api/auth/logout` | Logout user | ✅ |

### Complaints
| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/api/complaints` | Create new complaint | ✅ | Customer |
| GET | `/api/complaints` | Get complaint history | ✅ | Customer |
| GET | `/api/complaints/:id` | Get complaint detail | ✅ | Owner/Teknisi/Admin |
| PATCH | `/api/complaints/:id/status` | Update complaint status | ✅ | Teknisi/Admin |

### Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get user profile | ✅ |
| PUT | `/api/users/me` | Update user profile | ✅ |

## 🔐 Authentication Flow

### 1. Register/Login
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@email.com",
  "password": "password123",
  "full_name": "Test User",
  "phone": "08123456789"
}
```

Response:
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "token": "user_123456_abc789",
    "user": {
      "id": "user_123456",
      "username": "testuser",
      "email": "test@email.com",
      "role": "customer"
    }
  }
}
```

### 2. Use Token in Headers
```http
GET /api/complaints
Authorization: Bearer user_123456_abc789
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🧪 Testing dengan Thunder Client/Postman

### Import Collection
1. Download collection file
2. Import ke Thunder Client/Postman
3. Set environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `token`: (akan diisi otomatis)

### Test Sequence
1. `GET /` - Health check
2. `POST /api/auth/register` - Register user
3. `POST /api/auth/login` - Login with credentials
4. `POST /api/complaints` - Create complaint
5. `GET /api/complaints` - Get history
6. `GET /api/complaints/:id` - Get detail
7. `GET /api/users/me` - Get profile

## 🐛 Troubleshooting

### Server tidak bisa start
```bash
# Cek dependencies
npm install

# Cek port 3000 tidak dipakai
netstat -ano | findstr :3000

# Cek .env file ada
cat .env
```

### Database connection error
1. Pastikan Supabase URL & Key benar di `.env`
2. Cek internet connection
3. Pastikan tabel sudah dibuat

### Token errors
1. Pastikan token disimpan di environment
2. Format header: `Authorization: Bearer {token}`
3. Token expired? Login ulang

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| SUPABASE_URL | Supabase project URL | https://xxx.supabase.co |
| SUPABASE_KEY | Supabase anon/public key | eyJhbGci... |

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 👥 Authors

- **Mikhael Agung - Dicky Yusuf** - Initial work

## 🙏 Acknowledgments

- Express.js team
- Supabase team  
- Node.js community

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** December 2025
