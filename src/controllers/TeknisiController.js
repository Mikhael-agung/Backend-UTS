const Complaint = require('../models/Complaint');
const { successResponse, errorResponse } = require('../utils/response');
const supabase = require('../config/supabase');

class TeknisiController {
    // GET /api/teknisi/dashboard/stats
    static async getDashboardStats(req, res) {
        try {
            const userId = req.user.id;

            // Hitung stats
            const readyCount = await Complaint.countReadyForTeknisi();
            const progressCount = await Complaint.countByTeknisiId(userId, 'on_progress');
            const completedCount = await Complaint.countByTeknisiId(userId, 'completed');
            const pendingCount = await Complaint.countByTeknisiId(userId, 'pending');

            res.json(
                successResponse({
                    ready_count: readyCount,
                    progress_count: progressCount,
                    completed_count: completedCount,
                    pending_count: pendingCount,
                    total_assigned: progressCount + completedCount + pendingCount
                }, 'Dashboard stats berhasil diambil')
            );

        } catch (error) {
            console.error('Get dashboard stats error:', error);
            res.status(500).json(
                errorResponse('Gagal mengambil dashboard stats', 500)
            );
        }
    }

    // GET /api/teknisi/complaints/ready
    static async getReadyComplaints(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const { data: complaints, total } = await Complaint.findReadyForTeknisi({
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json(
                successResponse({
                    complaints,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total_pages: Math.ceil(total / limit)
                    }
                }, 'Komplain ready berhasil diambil')
            );

        } catch (error) {
            console.error('Get ready complaints error:', error);
            res.status(500).json(
                errorResponse('Gagal mengambil komplain ready', 500)
            );
        }
    }

    // GET /api/teknisi/complaints/progress
    static async getProgressComplaints(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;

            const { data: complaints, total } = await Complaint.findByTeknisiId(userId, {
                status: 'on_progress',
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json(
                successResponse({
                    complaints,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total_pages: Math.ceil(total / limit)
                    }
                }, 'Komplain progress berhasil diambil')
            );

        } catch (error) {
            console.error('Get progress complaints error:', error);
            res.status(500).json(
                errorResponse('Gagal mengambil komplain progress', 500)
            );
        }
    }

    // GET /api/teknisi/complaints/completed
    static async getCompletedComplaints(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;

            const { data: complaints, total } = await Complaint.findByTeknisiId(userId, {
                status: 'completed',
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json(
                successResponse({
                    complaints,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total_pages: Math.ceil(total / limit)
                    }
                }, 'Komplain completed berhasil diambil')
            );

        } catch (error) {
            console.error('Get completed complaints error:', error);
            res.status(500).json(
                errorResponse('Gagal mengambil komplain completed', 500)
            );
        }
    }

    // PATCH /api/teknisi/complaints/:id/take
    static async takeComplaint(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            console.log(`🤝 Teknisi ${userId} taking complaint ${id}`);

            // 1. SIMPLE CHECK - minimal fields
            const { data: complaint, error: findError } = await supabase
                .from('complaints')
                .select('id, status, teknisi_id')
                .eq('id', id)
                .single();

            if (findError || !complaint) {
                console.log('❌ Complaint not found');
                return res.status(404).json(
                    errorResponse('Komplain tidak ditemukan', 404)
                );
            }

            // 2. Validation
            if (complaint.status !== 'complaint') {
                return res.status(400).json(
                    errorResponse('Komplain sudah dalam proses', 400)
                );
            }

            if (complaint.teknisi_id) {
                return res.status(400).json(
                    errorResponse('Komplain sudah diambil teknisi lain', 400)
                );
            }

            // 3. Update complaint
            const { data: updatedComplaint, error: updateError } = await supabase
                .from('complaints')
                .update({
                    teknisi_id: userId,
                    status: 'on_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                console.error('Update error:', updateError);
                throw updateError;
            }

            // 4. Add status history
            await supabase
                .from('complaint_statuses')
                .insert([{
                    complaint_id: id,
                    status: 'on_progress',
                    teknisi_id: userId,
                    alasan: 'Komplain diambil oleh teknisi'
                }]);

            console.log('✅ Complaint taken successfully');
            res.json(
                successResponse(updatedComplaint, 'Komplain berhasil diambil')
            );

        } catch (error) {
            console.error('Take complaint error:', error);
            res.status(500).json(
                errorResponse('Gagal mengambil komplain', 500)
            );
        }
    }

    // PATCH /api/teknisi/complaints/:id/status
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, alasan } = req.body;
            const userId = req.user.id;

            // Validasi status
            const validStatuses = ['on_progress', 'pending', 'completed'];
            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json(
                    errorResponse(`Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, 400)
                );
            }

            // 1. Cek apakah komplain diambil oleh teknisi ini
            const complaint = await Complaint.findById(id);
            if (!complaint) {
                return res.status(404).json(
                    errorResponse('Komplain tidak ditemukan', 404)
                );
            }

            if (complaint.teknisi_id !== userId) {
                return res.status(403).json(
                    errorResponse('Anda bukan teknisi yang menangani komplain ini', 403)
                );
            }

            // 2. Update status di complaint_statuses (audit trail)
            await supabase
                .from('complaint_statuses')
                .insert([{
                    complaint_id: id,
                    status: status,
                    teknisi_id: userId,
                    alasan: alasan || `Status diubah menjadi ${status}`
                }]);

            // 3. Update complaint status
            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            const updatedComplaint = await Complaint.update(id, updateData);

            // 4. Get full status history untuk response
            const statusHistory = await Complaint.getStatusHistory(id);

            res.json(
                successResponse({
                    complaint: updatedComplaint,
                    status_history: statusHistory
                }, `Status berhasil diubah menjadi ${status}`)
            );

        } catch (error) {
            console.error('Update status error (teknisi):', error);
            res.status(500).json(
                errorResponse('Gagal mengupdate status komplain', 500)
            );
        }
    }
}

module.exports = TeknisiController;