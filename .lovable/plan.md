## Ringkasan

Login page sebenarnya sudah tersedia di `/auth` (Email/Password + Google). Saya akan:
1. Memastikan login page tetap menjadi pintu masuk ke dashboard.
2. Menambah dua halaman baru: **Asset** dan **Stock**, masing-masing dengan tabel data lengkap, pencarian, filter, dan form tambah/edit.
3. Membuat dua tabel database baru (`assets` dan `stocks`) dengan akses untuk seluruh tim (sesuai catatan project: visibilitas tim penuh).

---

## 1. Login / Akses Dashboard

- Halaman `/auth` yang ada (AssetHub branding) tetap dipakai — sudah mendukung Email/Password + Google.
- `ProtectedRoute` sudah memastikan dashboard hanya bisa diakses setelah login.
- Tidak perlu halaman login baru. Saya hanya pastikan link & redirect berjalan mulus.

## 2. Halaman Asset (`/assets`)

Tabel lengkap dengan kolom:

| No | Computer Name | Ex Computer Name | Division | Buy Year | Exp Warranty | User | Ex User | Location | PC Type | SN PC | Asuransi | Memory Computer | Operating System | Type Memory | Type Office | License Office | Device | Status Warranty |

Fitur:
- Tabel responsif dengan sticky header & horizontal scroll (banyak kolom).
- Search bar (cari Computer Name / SN / User).
- Filter cepat: Division, Status Warranty (Active / Expired — dihitung otomatis dari `exp_warranty` vs hari ini).
- Tombol **+ Add Asset** → dialog form dengan semua field.
- Klik baris → dialog detail / edit.
- Tombol delete (admin only).
- Badge warna untuk status garansi (hijau = aktif, merah = expired, kuning = <30 hari).

## 3. Halaman Stock (`/stock`)

Tabel dengan kolom:

| No | Tanggal Pembelian | Category | Type | User | Tanggal Diberikan |

Fitur:
- Tabel + search + filter Category.
- Tombol **+ Add Stock** → dialog form.
- Badge status: "In Stock" (belum ada Tanggal Diberikan) vs "Issued".
- Edit & delete inline.

## 4. Navigasi Sidebar

Sidebar diperbarui:
- Dashboard
- **Assets** (baru, ikon `Monitor`)
- **Stock** (baru, ikon `Package`)
- Analytics
- Settings

Menu lama "Add Asset / All Assets" yang masih mengarah ke `/bugs/*` akan diganti ke halaman Asset baru.

## 5. Visual / Desain

Mengikuti tema yang sudah ada (dark, Linear-inspired minimal, neon accent, square corners). Tidak mengubah background. Tabel pakai komponen `Table` shadcn dengan styling yang konsisten dengan halaman lain.

---

## Detail Teknis

### Database — tabel baru

**`assets`** (semua kolom kecuali `id`, `created_at`, `updated_at`):
- `computer_name`, `ex_computer_name`, `division`, `buy_year` (int), `exp_warranty` (date), `user_name`, `ex_user`, `location`, `pc_type`, `sn_pc`, `asuransi`, `memory_computer`, `operating_system`, `type_memory`, `type_office`, `license_office`, `device`
- `status_warranty` di-derive di UI dari `exp_warranty` (tidak perlu kolom).

**`stocks`**:
- `purchase_date` (date), `category`, `type`, `user_name`, `given_date` (date, nullable)

### RLS
Sesuai project knowledge ("visibilitas tim penuh, self-serve"):
- SELECT: semua authenticated user.
- INSERT/UPDATE: semua authenticated user.
- DELETE: hanya admin (`has_role(auth.uid(), 'admin')`).

### File yang dibuat / diubah
- **Baru**: `src/pages/Assets.tsx`, `src/pages/Stock.tsx`, `src/components/AssetFormDialog.tsx`, `src/components/StockFormDialog.tsx`
- **Diubah**: `src/App.tsx` (route baru), `src/components/AppSidebar.tsx` (menu baru), `src/integrations/supabase/types.ts` (auto-regenerated)

### Yang TIDAK diubah
- Tabel `bugs` lama dan halaman terkait tetap ada (untuk hindari breaking change). Bisa dihapus nanti jika diinginkan.
- Skema auth, profiles, user_roles tidak berubah.
