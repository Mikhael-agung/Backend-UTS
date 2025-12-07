const User = require('../models/User');
const bcrypt = require('bcryptjs');
const tokenStore = require('../utils/tokenStore');
const { successResponse, errorResponse } = require('../utils/response'); // ← TAMBAH INI

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // ✅ VALIDASI PAKAI errorResponse
      if (!username || !password) {
        return res.status(400).json(
          errorResponse('Username dan password harus diisi', 400)
        );
      }

      const user = await User.findByUsernameOrEmail(username);
      
      if (!user) {
        return res.status(401).json(
          errorResponse('Username atau password salah', 401) // ← UPDATE
        );
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json(
          errorResponse('Username atau password salah', 401) // ← UPDATE
        );
      }

      const randomStr = Math.random().toString(36).substring(2, 10);
      const token = `${user.id}_${randomStr}`;
      
      tokenStore.set(token, {
        userId: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      });

      const { password_hash, ...userData } = user;
      
      // ✅ RESPONSE PAKAI successResponse
      res.json(
        successResponse(
          {
            token, 
            user: userData
          },
          'Login berhasil' // ← message parameter
        )
      );

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(
        errorResponse('Terjadi kesalahan server', 500) // ← UPDATE
      );
    }
  }

  static async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        tokenStore.delete(token);
      }
      
      // ✅ PAKAI successResponse
      res.json(
        successResponse(null, 'Logout berhasil')
      );
      
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json(
        errorResponse('Terjadi kesalahan server', 500)
      );
    }
  }

  static async register(req, res) {
    try {
      const { username, email, password, full_name, phone } = req.body;

      // ✅ VALIDASI
      if (!username || !email || !password || !full_name) {
        return res.status(400).json(
          errorResponse('Semua field wajib diisi', 400)
        );
      }

      const existingUser = await User.findByUsernameOrEmail(username) || 
                          await User.findByUsernameOrEmail(email);
      
      if (existingUser) {
        return res.status(400).json(
          errorResponse('Username atau email sudah terdaftar', 400)
        );
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        id: `user_${Date.now()}`,
        username,
        email,
        password_hash: passwordHash,
        full_name,
        phone: phone || null,
        role: 'customer'
      });

      const token = `${newUser.id}_${Date.now()}`;
      
      // ✅ SIMPAN TOKEN
      tokenStore.set(token, {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email
      });

      const { password_hash, ...userData } = newUser;

      // ✅ RESPONSE
      res.status(201).json(
        successResponse(
          {
            token,
            user: userData
          },
          'Registrasi berhasil'
        )
      );

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json(
        errorResponse('Terjadi kesalahan server', 500)
      );
    }
  }
}

module.exports = AuthController;