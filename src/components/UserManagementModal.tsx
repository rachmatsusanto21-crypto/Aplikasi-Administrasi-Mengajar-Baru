import React, { useState } from "react";
import { UserAccount } from "../types";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  CheckCircle2,
  XCircle,
  UserPlus,
  Shield,
  Phone,
  Mail,
  FileSpreadsheet,
} from "lucide-react";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onSaveUsers: (users: UserAccount[]) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onSaveUsers,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<UserAccount, "id">>({
    name: "",
    nip: "",
    email: "",
    role: "Guru Kelas",
    status: "Aktif",
    phone: "",
  });

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      nip: "",
      email: "",
      role: "Guru Kelas",
      status: "Aktif",
      phone: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      nip: user.nip,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone || "",
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingUser) {
      // Edit existing user
      const updated = users.map((u) =>
        u.id === editingUser.id ? { ...u, ...formData } : u
      );
      onSaveUsers(updated);
    } else {
      // Add new user
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        ...formData,
      };
      onSaveUsers([...users, newUser]);
    }
    setIsFormOpen(false);
  };

  const handleDeleteUser = (id: string, name: string) => {
    const updated = users.filter((u) => u.id !== id);
    onSaveUsers(updated);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchNip = u.nip.includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchEmail) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 border border-indigo-500/50 rounded-xl">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                Manajemen Data User & Pengguna Pengampu
              </h3>
              <p className="text-xs text-slate-400">
                Kelola akun Guru, Kepala Sekolah, Operator, dan Admin Kurikulum
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, NIP, atau email..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Role Filter Dropdown */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Peran / Jabatan</option>
              <option value="Guru Kelas">Guru Kelas</option>
              <option value="Guru Mapel">Guru Mapel</option>
              <option value="Kepala Sekolah">Kepala Sekolah</option>
              <option value="Operator Sekolah">Operator Sekolah</option>
              <option value="Admin Kurikulum">Admin Kurikulum</option>
            </select>
          </div>

          <button
            onClick={handleOpenAddForm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Tambah User Baru
          </button>
        </div>

        {/* Form Add / Edit Drawer */}
        {isFormOpen && (
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 transition-all animate-fadeIn shrink-0">
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  {editingUser ? "Edit Data User" : "Tambah User / Pengguna Baru"}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="mis. Rachmat Susanto, S.Pd."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    NIP / NIK
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="1988xxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Pengguna
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@guru.sd.belajar.id"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Peran / Jabatan *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as UserAccount["role"],
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  >
                    <option value="Guru Kelas">Guru Kelas</option>
                    <option value="Guru Mapel">Guru Mapel</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Operator Sekolah">Operator Sekolah</option>
                    <option value="Admin Kurikulum">Admin Kurikulum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "Aktif" | "Non-Aktif",
                      })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-xs transition-all"
                >
                  {editingUser ? "Simpan Perubahan User" : "Tambahkan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Table Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-3 text-center w-10">No</th>
                  <th className="p-3 min-w-[160px]">Nama Lengkap</th>
                  <th className="p-3 w-36">NIP / NIK</th>
                  <th className="p-3 w-40">Peran / Jabatan</th>
                  <th className="p-3 min-w-[150px]">Kontak Email & HP</th>
                  <th className="p-3 text-center w-28">Status</th>
                  <th className="p-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      Tidak ada data user yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-3 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {u.name}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {u.nip || "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                            u.role === "Kepala Sekolah"
                              ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                              : u.role === "Guru Kelas"
                              ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                              : u.role === "Operator Sekolah"
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              : "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 space-y-0.5 text-xs">
                        {u.email && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{u.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {u.status === "Aktif" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <XCircle className="w-3.5 h-3.5" />
                            Non-Aktif
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditForm(u)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Hapus User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            Total <span className="font-extrabold text-slate-900 dark:text-white">{users.length}</span> user terdaftar di sistem lokal.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
