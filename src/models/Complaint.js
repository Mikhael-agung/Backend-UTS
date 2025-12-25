const supabase = require('../config/supabase');

const Complaint = {
  async create(complaintData) {
    try {
      console.log('\n=== 💾 MODEL CREATE START ===');
      console.log('📥 Input data from controller:', complaintData);

      const {
        id,
        created_at,
        updated_at,
        ...restData  // ✅ sisa data yang valid
      } = complaintData;

      console.log('🔍 After removing invalid fields:', restData);

      const dbData = {
        // Required fields (harus sesuai DB column names)
        user_id: restData.user_id || '',
        judul: restData.judul || '',
        kategori: restData.kategori || '',
        deskripsi: restData.deskripsi || '',

        alamat: restData.alamat || '',
        kota: restData.kota || '',
        kecamatan: restData.kecamatan || '',
        telepon_alamat: restData.telepon_alamat || '',
        catatan_alamat: restData.catatan_alamat || '',

        status: 'complaint',
        tanggal: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // console.log('Final DB data to insert:');
      // console.log(JSON.stringify(dbData, null, 2));

      // VERIFIKASI: Pastikan tidak ada field 'created_at'
      // console.log('Field verification:');
      // console.log('- created_at exists?', 'created_at' in dbData ? 'BAD' : 'GOOD');
      // console.log('- tanggal exists?', 'tanggal' in dbData ? ' GOOD' : 'BAD');
      // console.log('- alamat exists?', 'alamat' in dbData ? 'GOOD' : 'BAD');

      // console.log('🚀 Inserting to Supabase...');
      const { data, error } = await supabase
        .from('complaints')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.error('❌ SUPABASE INSERT ERROR:');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('Details:', error.details);
        throw error;
      }

      // console.log('Complaint created in DB, ID:', data.id);

      // TAMBAH STATUS AWAL KE HISTORY
      // console.log('Adding status history...');
      await supabase
        .from('complaint_statuses')
        .insert([{
          complaint_id: data.id,
          status: 'complaint',
          teknisi_id: null,
          alasan: 'Komplain dibuat'
        }]);

      // console.log('Status history added');
      // console.log('=== MODEL CREATE END ===\n');

      return data;
    } catch (error) {
      console.error('❌ COMPLAINT.CREATE ERROR:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Get complaints by user ID with filters and pagination
  async findByUserId(userId, filters = {}) {
    try {
      // console.log(`🔍 [MODEL] Find complaints for user: ${userId}, filters:`, filters);

      let query = supabase
        .from('complaints')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('tanggal', { ascending: false });

      // Filter by status
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Filter by category
      if (filters.kategori) {
        query = query.eq('kategori', filters.kategori);
      }

      // Pagination
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ FindByUserId error:', error);
        return { data: [], total: 0 };
      }

      // console.log(`Found ${data?.length || 0} complaints for user ${userId}`);
      return { data: data || [], total: count || 0 };
    } catch (error) {
      console.error('❌ FindByUserId exception:', error);
      return { data: [], total: 0 };
    }
  },

  // Get complaint by ID with user and teknisi info
  // models/Complaint.js - FIXED VERSION:

  async findById(id) {
    try {
      console.log(`🔍 [MODEL] Find complaint by ID: ${id}`);

      // QUERY WITHOUT EMBED - select minimal fields
      const { data: complaint, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ FindById error:', error.message);
        return null;
      }

      if (!complaint) {
        return null;
      }

      // GET USER DATA SEPARATELY
      let customer = null;
      let teknisi = null;

      // Get customer (user_id)
      if (complaint.user_id) {
        const { data: customerData } = await supabase
          .from('users')
          .select('id, username, full_name, phone')
          .eq('id', complaint.user_id)
          .single();
        customer = customerData;
      }

      // Get teknisi (teknisi_id)  
      if (complaint.teknisi_id) {
        const { data: teknisiData } = await supabase
          .from('users')
          .select('id, username, full_name')
          .eq('id', complaint.teknisi_id)
          .single();
        teknisi = teknisiData;
      }

      // Return combined data
      return {
        ...complaint,
        customer,  // data customer
        teknisi    // data teknisi
      };

    } catch (error) {
      console.error('❌ FindById exception:', error);
      return null;
    }
  },

  // Update complaint
  async update(id, updates) {
    try {
      console.log(`✏️ [MODEL] Updating complaint ${id}:`, updates);

      // Remove fields that should not be updated
      const { created_at, tanggal, ...cleanUpdates } = updates;

      const updateData = {
        ...cleanUpdates,
        updated_at: new Date().toISOString()
      };

      // console.log('📝 Update data:', updateData);

      const { data, error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Update error:', error);
        throw error;
      }

      // console.log('✅ Complaint updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Update exception:', error);
      throw error;
    }
  },

  // Get status history for a complaint
  async getStatusHistory(complaintId) {
    try {
      console.log(`📜 Get status history for: ${complaintId}`);

      // Query tanpa embed
      const { data: histories, error } = await supabase
        .from('complaint_statuses')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('GetStatusHistory error:', error);
        return [];
      }

      // Get teknisi info separately
      const historiesWithTeknisi = await Promise.all(
        (histories || []).map(async (history) => {
          let teknisi = null;

          if (history.teknisi_id) {
            const { data: teknisiData } = await supabase
              .from('users')
              .select('id, username, full_name')
              .eq('id', history.teknisi_id)
              .single();
            teknisi = teknisiData;
          }

          return {
            ...history,
            teknisi
          };
        })
      );

      return historiesWithTeknisi;

    } catch (error) {
      console.error('GetStatusHistory exception:', error);
      return [];
    }
  },

  // Add status to history
  async addStatusHistory(statusData) {
    try {
      // console.log('➕ [MODEL] Adding status history:', statusData);

      const { data, error } = await supabase
        .from('complaint_statuses')
        .insert([statusData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Status history added');
      return data;
    } catch (error) {
      console.error('❌ AddStatusHistory error:', error);
      throw error;
    }
  },

  // Get complaints by teknisi ID
  async findByTeknisiId(teknisiId, filters = {}) {
    try {
      // console.log(`🔍 [MODEL] Find complaints for teknisi: ${teknisiId}`);

      let query = supabase
        .from('complaints')
        .select('*', { count: 'exact' })
        .eq('teknisi_id', teknisiId)
        .order('tanggal', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ FindByTeknisiId error:', error);
        return { data: [], total: 0 };
      }

      // console.log(`✅ Found ${data?.length || 0} complaints for teknisi ${teknisiId}`);
      return { data: data || [], total: count || 0 };
    } catch (error) {
      console.error('❌ FindByTeknisiId exception:', error);
      return { data: [], total: 0 };
    }
  },

  async findReadyForTeknisi(filters = {}) {
    try {
      let query = supabase
        .from('complaints')
        .select('*', { count: 'exact' })
        .eq('status', 'complaint')
        .is('teknisi_id', null)  // Belum diambil teknisi
        .order('tanggal', { ascending: false });

      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('FindReadyForTeknisi error:', error);
        return { data: [], total: 0 };
      }

      return { data: data || [], total: count || 0 };
    } catch (error) {
      console.error('FindReadyForTeknisi exception:', error);
      return { data: [], total: 0 };
    }
  },

  async countReadyForTeknisi() {
    try {
      const { count, error } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'complaint')
        .is('teknisi_id', null);

      if (error) {
        console.error('CountReadyForTeknisi error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('CountReadyForTeknisi exception:', error);
      return 0;
    }
  },

  async countByTeknisiId(teknisiId, status = null) {
    try {
      let query = supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('teknisi_id', teknisiId);

      if (status) {
        query = query.eq('status', status);
      }

      const { count, error } = await query;

      if (error) {
        console.error('CountByTeknisiId error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('CountByTeknisiId exception:', error);
      return 0;
    }
  }
};

module.exports = Complaint;