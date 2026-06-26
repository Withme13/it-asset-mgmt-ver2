# Docker untuk Project Vite React

Dokumen ini menjelaskan cara menjalankan project ini menggunakan Docker.

## 1. Apa yang ada di sini?

- Dockerfile: berisi instruksi untuk membangun image aplikasi.
- docker-compose.yml: memudahkan menjalankan container dengan konfigurasi yang rapi.

## 2. Cara menjalankan dengan Docker

### Opsi A: Menggunakan Docker langsung

Build image:

```bash
docker build -t it-asset-app .
```

Jalankan container:

```bash
docker run -p 8081:8080 it-asset-app
```

Buka browser ke:

```text
http://localhost:8081
```

### Opsi B: Menggunakan Docker Compose

Jalankan:

```bash
docker compose up --build
```

Buka browser ke:

```text
http://localhost:8081
```

Untuk menghentikan container:

```bash
docker compose down
```

## 3. Logika sederhana di balik file ini

### Dockerfile

- FROM node:20-alpine
  - mengambil image Node.js versi 20 berbasis Alpine yang ringan.

- WORKDIR /app
  - menetapkan folder kerja di dalam container.

- COPY package*.json ./
  - menyalin file dependency agar install module lebih cepat.

- RUN npm install
  - menginstal semua package yang dibutuhkan aplikasi.

- COPY . .
  - menyalin seluruh project ke dalam container.

- EXPOSE 8080
  - memberitahu container bahwa aplikasi akan berjalan di port 8080.

- CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
  - menjalankan Vite secara langsung di dalam container.

### docker-compose.yml

- services.app.build
  - membangun image dari Dockerfile.

- ports
  - memetakan port host 8081 ke port container 8080.

- volumes
  - memastikan perubahan file di host terlihat di container.

- command
  - menjalankan aplikasi Vite dengan host 0.0.0.0 agar bisa diakses dari luar container.

## 4. Catatan penting

- Pastikan Docker sudah aktif di komputer Anda.
- Port host saat ini diatur ke 8081 agar tidak bentrok dengan port lain yang sudah dipakai.
- Untuk produksi, biasanya Anda tidak menjalankan Vite dev server secara langsung. Biasanya dipakai build + serve.
