const Complaint = require('../models/Complaint');
const { successResponse, errorResponse } = require('../utils/response');

class ComplaintController {
  static async create(req, res) {
    try {
      const userId = req.user.id;
      const { title, category, description } = req.body;

      if (!title || !category) {
        return res.status(400).json(
          errorResponse('Judul dan kategori wajib diisi', 400)
        );
      }

      const complaintData = {
        id: `complaint_${Date.now()}`,
        user_id: userId,
        title,
        category,
        description: description || '',
        status: 'pending'
      };

      const complaint = await Complaint.create(complaintData);

      res.status(201).json(
        successResponse(complaint, 'Komplain berhasil dibuat')
      );

    } catch (error) {
      console.error('Create complaint error:', error);
      res.status(500).json(
        errorResponse('Gagal membuat komplain', 500)
      );
    }
  }

  static async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (page) filters.page = parseInt(page);
      if (limit) filters.limit = parseInt(limit);

      const { data: complaints, total } = await Complaint.findByUserId(userId, filters);

      res.json(
        successResponse({
          complaints,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        }, 'History komplain berhasil diambil')
      );

    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json(
        errorResponse('Gagal mengambil history komplain', 500)
      );
    }
  }

  static async getDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const complaint = await Complaint.findById(id);
      
      if (!complaint) {
        return res.status(404).json(
          errorResponse('Komplain tidak ditemukan', 404)
        );
      }

      if (complaint.user_id !== userId && !['admin', 'teknisi'].includes(req.user.role)) {
        return res.status(403).json(
          errorResponse('Anda tidak memiliki akses ke komplain ini', 403)
        );
      }

      res.json(
        successResponse(complaint, 'Detail komplain berhasil diambil')
      );

    } catch (error) {
      console.error('Get detail error:', error);
      res.status(500).json(
        errorResponse('Gagal mengambil detail komplain', 500)
      );
    }
  }

  // ✅ TAMBAH METHOD INI
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, resolution_notes } = req.body;
      const userRole = req.user.role;

      // Validasi: hanya teknisi/admin yang bisa update status
      if (!['teknisi', 'admin'].includes(userRole)) {
        return res.status(403).json(
          errorResponse('Hanya teknisi atau admin yang dapat mengupdate status', 403)
        );
      }

      // Validasi status
      const validStatuses = ['pending', 'diproses', 'selesai', 'ditolak'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json(
          errorResponse(`Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, 400)
        );
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      // Jika teknisi yang update, simpan teknisi_id
      if (userRole === 'teknisi') {
        updateData.teknisi_id = req.user.id;
      }

      // Jika ada resolution notes
      if (resolution_notes) {
        updateData.resolution_notes = resolution_notes;
      }

      // Update complaint
      const complaint = await Complaint.update(id, updateData);

      if (!complaint) {
        return res.status(404).json(
          errorResponse('Komplain tidak ditemukan', 404)
        );
      }

      res.json(
        successResponse(complaint, 'Status komplain berhasil diupdate')
      );

    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json(
        errorResponse('Gagal mengupdate status komplain', 500)
      );
    }
  }
}

module.exports = ComplaintController;