Kelompok 4:

1. Nur'Afia Avanza (J0403241008)  
2. Izdihar Izzan Wibowo (J0403241016)  
3. Adzkia Nifa Adha (J0403241103)  
4. Raden Mas Galih Pradityo (J0403241030)  
5. Farrel Muhammad Zaki (J0403241085)  
     
1. Latar Belakang & Masalah Utama:  
   Masyarakat kesulitan mengevaluasi kelayakan area hunian di Jabodetabek karena tingginya asimetri informasi. Keputusan saat ini sangat bergantung pada iklan dan klaim subjektif dari agen properti, yang seringkali menyembunyikan kelemahan krusial suatu daerah seperti risiko banjir, tingginya tingkat kriminalitas, polusi, dan minimnya aksesibilitas fasilitas publik.  
   Sebuah platform GIS *(Geographic Information System)* analitik tata ruang independen yang memberikan data objektif berbasis pemetaan multi-layer. Sistem ini memvisualisasikan metrik kualitas hidup, seperti risiko lingkungan, aksesibilitas transportasi, tingkat keamanan, fasilitas komersial, dan inklusivitas, untuk memfasilitasi pencarian titik hunian yang transparan dan berbasis data nyata.

2. Pengumpulan & Penentuan Sumber Data Sekunder  
   1. Topografi & Riwayat Lahan:  
      1. InaRISK (BNPB): Menyediakan Web Map Service (WMS) untuk indeks risiko bencana, termasuk banjir di Jabodetabek.  
      2. PetaBencana.id: Menyediakan arsip data *crowdsource* titik banjir historis yang sangat akurat untuk area Jakarta dan sekitarnya.  
      3. DEMNAS (Badan Informasi Geospasial): Untuk data elevasi tanah (topografi).  
      4. Citra satelit historis dari Google Earth Engine/Sentinel Hub.  
   2. Stressor Lingkungan (Polusi & Kebisingan):  
      1. IQAir API / ISPU KLHK: Untuk metrik *Air Quality Index* (AQI) historis dan *real-time*.  
      2. OpenStreetMap (OSM): Menggunakan data jaringan jalan tol dan rel kereta untuk mengkalkulasi *buffer zone* kebisingan secara matematis (misal: radius 50m dari rel kereta \= zona merah *noise*).  
   3. Kriminalitas (Pendekatan NLP):  
      1. Scraping Portal Berita/Media Sosial: Mengumpulkan data teks dari Twitter/X (menggunakan *keyword* spesifik area \+ kata kunci seperti "begal", "maling", "klitih") atau RSS Feed portal berita lokal (Detik, Kompas). Data ini kemudian diproses menggunakan model NLP untuk ekstraksi lokasi dan sentimen.  
   4. Fasilitas Kualitas Hidup & Mobilitas (POI):  
      1. Overpass API (OpenStreetMap): Untuk mengekstrak titik UMKM, kafe, lapangan olahraga, stasiun transit, hingga fasilitas kesehatan secara gratis.  
      2. GTFS BPTJ / TransJakarta: Data rute dan titik henti transportasi umum resmi.  
   5. Layer Inklusivitas:  
      1. Data ramp, guiding block, visual signage: kombinasi crowdsourcing/survei lapangan oleh tim dan tag OSM ( wheelchair=yes , tactile\_paving=yes ) sebagai baseline awal.  
   6. Layer Mobilitas & Akses:  
      1. Infrastruktur transit: data resmi KAI Commuter (KRL), MRT Jakarta, LRT Jabodebek, Transjakarta/JakLingko (API GTFS jika tersedia).   
      2. Traffic density & isochrone map: Google Maps Distance Matrix API/TomTom Traffic API, serta OpenRouteService/Mapbox Isochrone API.  
   7. Future & Legalitas:  
      1. Portal BHUMI ATR/BPN: Peta bidang tanah untuk pengecekan legalitas awal (WMS layer jika akses publik tersedia).  
      2. Jakarta Open Data / RDTR (Rencana Detail Tata Ruang): Untuk melihat peruntukan zona masa depan (apakah area tersebut akan digusur untuk tol atau jalur hijau).

3. Pendefinisian Fitur (Requirement Gathering)  
- Interactive Web Map Antarmuka peta dasar (*basemap*) area Jabodetabek yang dinamis dan sangat responsif. Fitur ini memungkinkan pengguna untuk melakukan navigasi spasial dasar seperti *pan* (geser), *zoom in/out*, pencarian lokasi spesifik dengan *user experience* (UX) yang mulus dan intuitif, tanpa jeda *rendering* yang mengganggu, serta *basemap* dasar sebagai fondasi visual layer.  
- Layer Filtering & Multi-Layer Analytics Sistem panel *toggle* yang memungkinkan pengguna mengaktifkan atau menonaktifkan *overlay* data spasial sesuai kebutuhan. Untuk tahap *Minimum Viable Product* (MVP), pengembangan akan difokuskan pada tiga layer paling krusial: Layer Banjir, Layer Transportasi, dan Layer Komersial Mikro.  
- Point Inspector Modul informasi interaktif berupa *tooltip* atau *side-panel* dinamis yang akan muncul ketika pengguna mengeklik suatu titik fasilitas atau poligon area di atas peta. Modul ini menyajikan ringkasan data spesifik secara instan, seperti detail lokasi, radius fasilitas terdekat, dan agregasi skor kelayakan di titik tersebut.   
4. Penentuan Format Output (Web GIS)  
   Arsitektur sistem ini mengintegrasikan frontend intuitif berbasis React dan library peta (Mapbox/Leaflet) dengan pengalaman pengguna yang modern layaknya platform seperti Airbnb, yang didukung oleh backend Laravel untuk logika bisnis, PostgreSQL dengan PostGIS untuk manajemen data spasial, serta MongoDB untuk penyimpanan hasil scraping teks NLP. Untuk memastikan informasi tetap relevan, sistem dilengkapi dengan data pipeline otomatis berbasis Python yang menjalankan cron job secara periodik guna menarik data API terkini, memproses analisis NLP, dan memperbarui basis data tanpa memerlukan intervensi manual. 

