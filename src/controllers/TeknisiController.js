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

    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, alasan, resolution_notes } = req.body;
            const userId = req.user.id;

            console.log(`🔄 Update status: ${id} → ${status}`);
            console.log(`📝 Alasan: ${alasan}`);
            console.log(`📋 Resolution notes: ${resolution_notes || 'none'}`);

            // Validasi status
            const validStatuses = ['on_progress', 'pending', 'completed'];
            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json(
                    errorResponse(`Status tidak valid. Pilihan: ${validStatuses.join(', ')}`, 400)
                );
            }

            // ====================== ✅ DUPLICATE PROTECTION START ======================
            
            // 1. GET CURRENT COMPLAINT
            const currentComplaint = await Complaint.findById(id);
            if (!currentComplaint) {
                return res.status(404).json(
                    errorResponse('Komplain tidak ditemukan', 404)
                );
            }

            // 2. CEK APAKAH STATUS SUDAH SAMA DAN SUDAH ADA RESOLUTION NOTES
            if (status === 'completed' && 
                currentComplaint.status === 'completed' && 
                currentComplaint.resolution_notes) {
                
                console.log('⚠️ Complaint already completed with resolution notes');
                return res.status(400).json(
                    errorResponse('Komplain sudah selesai dengan catatan penyelesaian. Tidak dapat diupdate lagi.', 400)
                );
            }

            // 3. CEK DOUBLE SUBMIT DALAM 2 MENIT TERAKHIR
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            
            const { data: recentEntries } = await supabase
                .from('complaint_statuses')
                .select('id, alasan, created_at')
                .eq('complaint_id', id)
                .eq('status', status)
                .eq('teknisi_id', userId)
                .gte('created_at', twoMinutesAgo)
                .order('created_at', { ascending: false })
                .limit(1);

            if (recentEntries && recentEntries.length > 0) {
                const lastEntry = recentEntries[0];
                
                // CEK JIKA ALASAN SAMA ATAU MIRIP
                const isSameReason = lastEntry.alasan === alasan;
                const isSimilarResolution = resolution_notes && 
                    lastEntry.alasan.includes(resolution_notes.substring(0, 30));
                
                if (isSameReason || isSimilarResolution) {
                    console.log('❌ Double submit detected');
                    return res.status(400).json(
                        errorResponse('Status sudah diupdate baru-baru ini. Silakan tunggu beberapa menit.', 400)
                    );
                }
            }

            // 4. VALIDATE TEKNISI PERMISSION
            if (currentComplaint.teknisi_id !== userId) {
                return res.status(403).json(
                    errorResponse('Anda bukan teknisi yang menangani komplain ini', 403)
                );
            }

            // ====================== ✅ DUPLICATE PROTECTION END ======================

            // Prepare update data
            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            // Simpan resolution_notes hanya untuk completed
            if (status === 'completed' && resolution_notes) {
                updateData.resolution_notes = resolution_notes;
                console.log(`💾 Saving resolution notes: ${resolution_notes.substring(0, 50)}...`);
            }

            const updatedComplaint = await Complaint.update(id, updateData);

            // Insert status history
            const alasanForHistory = alasan || `Status diubah menjadi ${status}`;
            
            await supabase
                .from('complaint_statuses')
                .insert([{
                    complaint_id: id,
                    status: status,
                    teknisi_id: userId,
                    alasan: alasanForHistory
                }]);

            console.log(`✅ Status history added: ${status} - ${alasanForHistory}`);

            // Get full status history untuk response
            const statusHistory = await Complaint.getStatusHistory(id);

            res.json(
                successResponse({
                    complaint: updatedComplaint,
                    status_history: statusHistory,
                    resolution_saved: !!(status === 'completed' && resolution_notes),
                    duplicate_protection: {
                        enabled: true,
                        time_window_minutes: 2,
                        message: "Double submit protection aktif"
                    }
                }, `Status berhasil diubah menjadi ${status}`)
            );

        } catch (error) {
            console.error('❌ Update status error (teknisi):', error);
            res.status(500).json(
                errorResponse('Gagal mengupdate status komplain', 500)
            );
        }
    }
}

module.exports = TeknisiController;