

| Project Charter |
| :---- |
| NalarRuang: Platform Sistem Informasi Geografis (SIG) untuk analitik tata ruang independen yang memberikan data objektif berbasis pemetaan multi-layer |
| Kelompok 4 \- Developer Rumah Nur'Afia Avanza (J0403241008) Izdihar Izzan Wibowo (J0403241016) Adzkia Nifa Adha (J0403241103) Raden Mas Galih Pradityo (J0403241030) Farrel Muhammad Zaki (J0403241085) |

1. # **Purpose**

   Dokumen ini disusun untuk mengesahkan berdirinya proyek NalarRuang dan memberi otorisasi kepada Kelompok 4 untuk mengalokasikan waktu serta sumber daya dalam merancang dan membangun sistem tersebut, sekaligus menjadi acuan bersama tim dan dosen pengampu mengenai ruang lingkup, linimasa, dan pembagian peran selama satu semester perkuliahan.

2. # **Title**

   NalarRuang: Platform Sistem Informasi Geografis (SIG) untuk analitik tata ruang independen yang memberikan data objektif berbasis pemetaan multi-layer

3. # **Date of Authorization**

   Proyek ini diinisiasi pada 1 September 2026, bertepatan dengan minggu pertama perkuliahan semester Ganjil TA 2026/2027. Inisiasi dilakukan oleh Kelompok 4 sebagai bagian dari tugas mata kuliah Sistem Informasi Geografis dan mata kuliah Manajemen Proyek Teknologi Informasi, berdasarkan hasil observasi dan studi pendahuluan terkait asimetri informasi properti di kawasan Jabodetabek.

4. # **Project Manager**

   Izdihar Izzan Wibowo (J0403241016)  

   Email: izdihar.izzan@apps.ipb.ac.id, No. HP: 085774690939\.

5. # **Project Sponsor**

   Dedi Kusuma Wijaya, Managing Director, Karsa City Lab

   Email: dedi.wijaya@karsacitylab.org, No. HP: 082123850111\.

6. # **Project Description**

   Pengambilan keputusan hunian di Jabodetabek saat ini sangat bergantung pada perspektif subjektif, sehingga menciptakan asimetri informasi yang signifikan antara penjual dan calon pembeli/penyewa. Risiko krusial seperti potensi banjir, tingkat kriminalitas, paparan polusi/kebisingan, hingga minimnya aksesibilitas fasilitas publik seringkali tidak terungkap secara transparan. NalarRuang hadir sebagai platform SIG analitik independen yang mengagregasi, memproses, dan memvisualisasikan data spasial dari berbagai sumber sekunder (pemerintah, open data, hingga hasil ekstraksi NLP dari media sosial dan portal berita) ke dalam satu peta interaktif multi-layer. Dari sisi rekayasa perangkat lunak, proyek ini menghadirkan tantangan teknis berupa integrasi data heterogen (raster, vektor, time-series, teks tidak terstruktur), pipeline pemrosesan otomatis berbasis Python untuk data fetching dan NLP, serta manajemen data poliglot menggunakan PostgreSQL+PostGIS.

7. # **Scope Statement**

   Cakupan wilayah: Jabodetabek (Jakarta, Bogor, Depok, Tangerang, Bekasi), mengikuti ketersediaan data sekunder (InaRISK, PetaBencana.id, OSM, GTFS BPTJ/TransJakarta, MRTJ, dll). Fitur MVP yang dikembangkan dalam satu semester: (1) Interactive Web Map dengan pan/zoom/search yang responsif; (2) Layer Filtering & Multi-Layer Analytics dibatasi pada tiga layer prioritas yaitu Layer Banjir, Layer Transportasi, dan Layer Komersial Mikro; (3) Point Inspector berupa tooltip/side-panel berisi ringkasan data pada titik terpilih. Arsitektur teknis: frontend React \+ Mapbox/Leaflet, backend Laravel, basis data PostgreSQL+PostGIS, serta data pipeline Python. Di luar cakupan proyek ini: Layer Inklusivitas, Layer Legalitas/RDTR, Layer Kriminalitas berbasis NLP, fitur transaksi properti, aplikasi mobile native, dan validasi lapangan penuh untuk seluruh titik data.

8. # **Start and Finish Date**

   Linimasa proyek disusun mengikuti kalender akademik selama 14 minggu efektif perkuliahan, dari inisiasi hingga demo produk akhir.

| Task | Date |
| :---- | :---- |
| Start Date | 1 September 2026 |
| 1st Prototype Demonstration | 13 October 2026 |
| Project Plan Submission | 20 October 2026 |
| 2nd Prototype Demonstration | 10 November 2026 |
| 3rd Prototype Demonstration | 24 November 2026 |
| Final Product Demonstration | 1 December 2026 |
| Finish Date | 5 December 2026 |

9. # **Project Role and Responsibility**

Berikut pembagian peran dalam tim pengembang NalarRuang beserta tanggung jawab utamanya.

| Project Role | Project Responsibility |
| :---- | :---- |
| Project Manager(Izdihar Izzan Wibowo) | Mengarahkan tim, mengelola backlog proyek, memfasilitasi siklus Agile Scrum, serta menjadi penghubung utama dengan Sponsor dan Dosen Pengampu. |
| Designer (Nur’afia avanza) | Merancang antarmuka peta (wireframe dan mockup Figma), menyusun sistem desain visual, serta mengimplementasikan komponen UI React. |
| System Analyst (Raden Mas Galih Pradityo) | Menyusun spesifikasi kebutuhan sistem, melakukan analisis geoprocessing menggunakan QGIS, serta merancang data spasial menggunakan PostGIS. |
| Backend  (Farrel Muhammad Zaki) | Mengembangkan fitur-fitur backend sesuai pembagian tugas tim, termasuk pengembangan RESTful API, pengelolaan database PostgreSQL/PostGIS, serta integrasi endpoint dengan kebutuhan sistem. |
| Backend (Adzkia Nifa) | Mengembangkan fitur-fitur backend sesuai pembagian tugas tim, termasuk pengembangan RESTful API, pengolahan dan integrasi data, serta implementasi logika backend sesuai kebutuhan sistem. |

10. # **Project Budget**

Tabel 1 Komponen Investasi Pembuatan Web GIS NalarRuang

| No | Komponen Investasi | Jumlah | Satuan | Total Biaya (Rp) | Umur Ekonomi (Tahun) | Nilai Sisa |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| 1\. | Laptop Lenovo  | 4  | Unit | 48.000.000  |    5 | Rp4.800.000,-  |
| 2\. | Laptop ASUS TUF  | 1 | Unit  | 15.000.000 | 5 | Rp1.500.000,-  |
| 3\. | Smartphone | 5 | Unit | 15.000.000  | 5 | Rp1.500.000,-  |
| 4\. | Setup Domain & Hosting Awal | 1 | Paket | 500.000 | 1 | 0 |
| 5\. | Cloud Compute Credit tambahan (training model NLP lanjutan) | 1 | Paket | 2.000.000 | 1 | 0 |
|  | **Total Investasi** |  |  | **27.500.000** |  | **6.574.000** |

Tabel 2 Komponen Tetap Pembuatan Web GIS NalarRuang

| No | Komponen Biaya Tetap | Per Bulan | Satuan | Biaya per Satuan | Durasi | Total Biaya |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| 1\. | Internet (WiFi) | 500.000  | Paket | 500.000  | 4 Bulan | 2.000.000 |
| 2\. | Tenaga Kerja / SDM Tim Pengembang  | 27.500.000 | Orang  | 5.500.000 | 4 Bulan | 110.000.000 |
| 3\. | Cloud VPS Backend (Laravel \+ PostGIS)  | 300.000  | Paket  | 300.000  | 4 Bulan | 1.200.000  |
| 4\. | MongoDB Atlas (Cloud NoSQL DB)  | 150.000  | Paket  | 150.000  | 4 Bulan | 600.000  |
| 5\. | Mapbox API (Tile & Geocoding)  | 250.000  | Paket  | 250.000  | 4 Bulan | 1.000.000  |
| 6\. | Google Maps Distance Matrix / Isochrone API  | 200.000  | Paket  | 200.000  | 4 Bulan | 800.000  |
| 7\. | GitHub Team (5 akun)  | 279.215  | Paket (5 akun)  | 55.843 / akun  | 4 Bulan | 1.116.860  |
| 8\. | Google Cloud Storage (Backup data citra & GIS)  | 67.000  | Paket  | 67.000  | 4 Bulan | 268.000  |
| **TOTAL BIAYA TETAP (MVP 4 BULAN)**  |  |  |  |  |  | **116.984.860** |

11. # **Metodelogi**

    Proyek NalarRuang menggunakan pendekatan Agile dengan framework Scrum yang dijalankan selama 14 minggu efektif perkuliahan. Pendekatan ini dipilih karena kebutuhan integrasi data heterogen (raster, vektor, time-series, teks tidak terstruktur) dari berbagai sumber sekunder sering berubah, sehingga tim perlu fleksibel menyesuaikan *backlog*. Selain itu, pengembangan dilakukan secara bertahap dimulai dari *Minimum Viable Product* (MVP) untuk tiga layer prioritas, yaitu Layer Banjir, Layer Transportasi, dan Layer Komersial Mikro. Pengguna, termasuk dosen pengampu dan sponsor, juga dapat memberikan umpan balik di setiap tahap melalui serangkaian demonstrasi prototipe. 

    Pengumpulan data sekunder untuk NalarRuang mengandalkan metode penarikan dari berbagai sumber kredibel untuk area Jabodetabek: 

1. Topografi & Risiko Banjir: Studi dokumen dan *Web Map Service* (WMS) dari InaRISK BNPB, PetaBencana.id, dan DEMNAS.   
2. Kualitas Udara & Kebisingan: *API polling* menggunakan IQAir/ISPU KLHK dan *buffer zone* dari OpenStreetMap (OSM)   
3. Kriminalitas: *Web scraping* dan pemrosesan *Natural Language Processing* (NLP) dari Twitter/X dan RSS Feed portal berita lokal (Detik, Kompas).   
4. Fasilitas & Mobilitas: *Query* Overpass API serta data GTFS dari BPTJ/TransJakarta, KRL, MRT, dan LRT.   
5. Legalitas & Tata Ruang: Portal BHUMI ATR/BPN dan Jakarta Open Data (RDTR).  
* Tahapan Pengembangan (SDLC Agile-Scrum)  
  	Siklus pengembangan dibagi menjadi beberapa tahapan iteratif. Diawali dengan Requirement Analysis untuk mendefinisikan fitur Web GIS interaktif, *layer filtering*, dan *point inspector*, serta finalisasi sumber data. Dilanjutkan dengan System Design untuk merancang arsitektur *frontend* (React), *backend* (Laravel), serta basis data PostgreSQL dengan PostGIS untuk hasil scraping NLP. Proses Sprint Development dibagi menjadi beberapa iterasi *sprint* yang masing-masing diakhiri dengan evaluasi berupa demonstrasi prototipe pertama, kedua, dan ketiga. Tahap Testing difokuskan untuk menguji integrasi *pipeline* data otomatis berbasis Python dengan sistem basis data tanpa intervensi manual. Seluruh rangkaian ini diakhiri dengan Deployment & Final Demo pada akhir periode proyek.   
* Struktur Tim  
  	Dalam implementasi Scrum, struktur tim disesuaikan dengan peran masing-masing anggota. Dedi Kusuma Wijaya (Project Sponsor) bertindak sebagai *Product Owner* (PO) yang mewakili visi proyek analitik tata ruang. Izdihar Izzan Wibowo (Project Manager) bertindak sebagai *Scrum Master* untuk menjaga linimasa dan memfasilitasi *sprint*. Sementara itu, *Development Team* yang mengeksekusi tugas teknis terdiri dari Raden Mas Galih Pradityo (System Analyst), Nur'Afia Avanza (Designer UI/UX), serta Farrel Muhammad Zaki dan Adzkia Nifa Adha (Backend).  
* Metode Pengujian  
  	Evaluasi kualitas sistem mencakup beberapa lapisan pengujian. Unit Testing dilakukan untuk menguji logika bisnis individual pada *backend* Laravel. Integration Testing dilakukan untuk memastikan *query* spasial PostGIS, hasil pemrosesan NLP dari MongoDB, dan sinkronisasi cron job Python tampil dengan akurat di *frontend*. Tim juga melakukan Usability Testing untuk memastikan UX antarmuka peta responsif, fitur navigasi (pan/zoom/search) berjalan tanpa jeda rendering, dan fungsi modul *Point Inspector* bekerja dengan baik. Terakhir, User Acceptance Test (UAT) dilakukan bersama dosen pengampu dan sponsor pada sesi demonstrasi produk akhir. 

12. # **Sign-off Project Charter**

Approved by \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

	Dedi Kusuma Wijaya, 

	Project Sponsor

Accepted by\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

	Izdihar Izzan Wibowo,

	Project Manager

