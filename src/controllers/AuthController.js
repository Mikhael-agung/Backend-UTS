const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json(
          errorResponse('Username dan password harus diisi', 400)
        );
      }

      const user = await User.findByUsernameOrEmail(username);
      
      if (!user) {
        return res.status(401).json(
          errorResponse('Username atau password salah', 401)
        );
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        return res.status(401).json(
          errorResponse('Username atau password salah', 401)
        );
      }

      const token = generateToken(user);

      // Hapus password dari response
      const { password_hash, ...userData } = user;
      
      res.json(
        successResponse(
          {
            token, 
            user: userData
          },
          'Login berhasil'
        )
      );

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(
        errorResponse('Terjadi kesalahan server', 500)
      );
    }
  }

  static async logout(req, res) {
    try {
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
      const { username, email, password, full_name, phone, role = 'customer' } = req.body;

      // Validasi
      if (!username || !email || !password || !full_name) {
        return res.status(400).json(
          errorResponse('Semua field wajib diisi', 400)
        );
      }

      // Validasi role
      const validRoles = ['customer', 'teknisi', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json(
          errorResponse(`Role tidak valid. Pilihan: ${validRoles.join(', ')}`, 400)
        );
      }

      // Cek user sudah ada
      const existingUser = await User.findByUsernameOrEmail(username) || 
                          await User.findByUsernameOrEmail(email);
      
      if (existingUser) {
        return res.status(400).json(
          errorResponse('Username atau email sudah terdaftar', 400)
        );
      }

      // Hash password
      const salt = await bcrypt.genSalt(8);
      const passwordHash = await bcrypt.hash(password, salt);

      // Buat user baru (biar database generate ID)
      const newUser = await User.create({
        username,
        email,
        password_hash: passwordHash,
        full_name,
        phone: phone || null,
        role
      });

      const token = generateToken(newUser);

      // Hapus password dari response
      const { password_hash, ...userData } = newUser;

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
