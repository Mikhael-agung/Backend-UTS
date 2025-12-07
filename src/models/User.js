const supabase = require('../config/supabase');

const User = {
  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    return error ? null : data;
  },

  // ✅ FIX: ganti 'identifier' jadi 'query'
  async findByUsernameOrEmail(query) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${query},email.eq.${query}`)
      .single();

    return error ? null : data;
  },

  // ✅ FIX: tambah .select() untuk return data
  async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()  // ← TAMBAH INI
      .single();

    if (error) throw error;
    return data;      
  },

  // ✅ FIX: tambah .select()
  async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()  // ← TAMBAH INI
      .single();

    if (error) throw error;
    return data;
  }
};

module.exports = User;