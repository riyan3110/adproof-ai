// Zero-dependency, client-only localization for AdProof Proofroom.
// English is the canonical UI source. Translate only explicitly known UI
// labels; never machine-"translate" stored claim evidence or user images.
const key='adproof-ui-language';
const supported=new Set(['en','id']);
const id={
 'Audit package saved: JSON and original/revised images in their actual formats.':'Paket audit tersimpan: JSON dan gambar asli/revisi sesuai format sebenarnya.',
 'Local recovery saved on this device.':'Pemulihan lokal tersimpan di perangkat ini.',
 'Clear local backup':'Hapus cadangan lokal',
 'Local recovery saved on this device. No Meta call; use Export ZIP for a separate backup.':'Cadangan pemulihan disimpan hanya di perangkat ini. Tanpa panggilan Meta; ekspor ZIP sebagai cadangan tambahan.',
 'Local autosave unavailable on this device. Export ZIP now to protect this audit.':'Penyimpanan otomatis lokal tidak tersedia. Ekspor ZIP sekarang untuk melindungi hasil audit.',
 'Unable to clear local browser recovery. Clear website storage in browser settings.':'Gagal menghapus pemulihan lokal. Hapus data situs melalui pengaturan browser.',
 'Local recovery backup cleared. The current open Studio session remains visible.':'Cadangan lokal dihapus. Sesi Studio yang terbuka tetap terlihat.',
 'Recovered the last completed audit/repair from this browser. No Meta request was made. Review the images and export ZIP.':'Audit/perbaikan terakhir dipulihkan dari browser ini. Tidak ada panggilan Meta. Periksa gambar dan ekspor ZIP.',
 'Browser session recovered from local device storage. No paid Meta request.':'Sesi dipulihkan dari penyimpanan perangkat. Tanpa panggilan Meta berbayar.',
 'Access verified ✓':'Akses terverifikasi ✓',
 'Enter the private demo code shared with you.':'Masukkan kode demo privat yang dibagikan kepada Anda.',
 'Verified against this server without a paid Meta request. Saved in this tab only. Never share the code publicly.':'Diverifikasi server tanpa panggilan Meta berbayar. Disimpan hanya di tab ini. Jangan bagikan kode secara publik.',
 'Judge Access verified by server. Meta models are tested only when you run an audit.':'Akses Juri diverifikasi server. Model Meta hanya diuji saat audit dijalankan.',

 'Verify consistency ↗':'Verifikasi konsistensi ↗',
 '↓ Export image':'↓ Ekspor gambar',
 'Audit complete ✓':'Audit selesai ✓',
 'Inspect findings ↗':'Periksa temuan ↗',
 'No grounded image repair required. Review findings or export the audit; do not force an edit.':'Tidak ada masalah gambar dengan bukti yang cukup untuk diperbaiki. Periksa temuan atau ekspor audit; jangan memaksa perbaikan.',
 'Meta returned an unreadable revised image. Original and audit are preserved; retry Repair only if needed.':'Meta mengirim gambar revisi yang tidak terbaca. Gambar asli dan audit tetap aman; ulangi Perbaikan hanya jika diperlukan.',
 'Meta returned an empty revised image. Original and audit are preserved.':'Meta mengirim gambar revisi kosong. Gambar asli dan audit tetap aman.',
 'START HERE / FOUR STEPS':'MULAI DI SINI / EMPAT LANGKAH',
 'How to use AdProof AI':'Cara menggunakan AdProof AI',
 'Hide guide ↑':'Sembunyikan panduan ↑',
 'Show guide ↓':'Tampilkan panduan ↓',
 'AdProof usage steps':'Langkah penggunaan AdProof',
 'Choose an ad image, then enter the product name and factual details.':'Pilih gambar iklan, lalu isi nama produk dan fakta sebenarnya.',
 'Run an audit and review claims against the facts you supplied.':'Jalankan audit, lalu cocokkan klaim dengan fakta yang kamu berikan.',
 'Repair if needed':'Perbaiki jika perlu',
 'Repair a confirmed issue; AI automatically re-checks the revised image.':'Perbaiki kesalahan yang ditemukan; AI otomatis memeriksa ulang gambar hasilnya.',
 'Review + save':'Periksa hasil + simpan',
 'Check the automatic verification result and save the usable output.':'Lihat hasil pemeriksaan otomatis lalu simpan hasil yang layak digunakan.',
 'Use your verified demo access to run AI. Repair uses one Muse Image request and one automatic Muse Spark re-audit, counted against the Meta API allowance. Failed checks block revised export.':'Gunakan akses demo yang sudah terverifikasi untuk menjalankan AI. Repair memakai satu permintaan Muse Image dan satu audit ulang Muse Spark otomatis, menggunakan kuota API Meta proyek. Hasil yang gagal diperiksa diblokir dari ekspor revisi.',
 'Swipe to view all steps →':'Geser untuk melihat semua langkah →',
 'Language':'Bahasa',
 'Auto (browser)':'Otomatis (browser)',
 'English':'English',
 'Bahasa Indonesia':'Bahasa Indonesia',
 'Skip to studio':'Langsung ke studio',
 'THE PROOFROOM':'RUANG PEMBUKTIAN',
 'VISUAL FORENSICS':'FORENSIK VISUAL',
 'Checking API':'Memeriksa API',
 'Judge access':'Akses juri',
 'Docs ↗':'Dokumen ↗',
 'JUDGE ACCESS':'AKSES JURI',
 'Code not verified':'Kode belum diverifikasi',
 'Code verified by server ✓':'Kode diverifikasi server ✓',
 'Checking code on server…':'Memeriksa kode di server…',
 'Code rejected':'Kode ditolak',
 'Check limited':'Pemeriksaan dibatasi',
 'Verification unavailable':'Verifikasi tidak tersedia',
 'Code rejected by AI endpoint':'Kode ditolak endpoint AI',
 'META AI':'META AI',
 'Checking configuration':'Memeriksa konfigurasi',
 'Code verification is free. Model connectivity needs an actual audit.':'Verifikasi kode gratis. Koneksi model hanya diuji saat audit nyata.',
 'AP / PROOFROOM':'AP / RUANG BUKTI',
 'ADVERTISING CLAIM VERIFICATION & REPAIR':'VERIFIKASI & PERBAIKAN KLAIM IKLAN',
 '01 / STUDIO':'01 / STUDIO',
 'One creative. Every claim. A visible trail of evidence.':'Satu iklan. Setiap klaim. Jejak bukti terlihat.',
 'THE VERIFICATION SEQUENCE':'URUTAN VERIFIKASI',
 'DETECT':'DETEKSI',
 'VERIFY':'VERIFIKASI',
 'REPAIR':'PERBAIKI',
 'PROVE':'BUKTIKAN',
 'THE INVESTIGATION':'PEMERIKSAAN',
 '01 / SOURCE INSPECTION':'01 / INSPEKSI SUMBER',
 '02 / EVIDENCE MAPPING':'02 / PEMETAAN BUKTI',
 '03 / CHANGE TRACKING':'03 / PELACAKAN PERUBAHAN',
 'Inspect a claim in its original context.':'Periksa klaim dalam konteks aslinya.',
 'Follow the claim to its recorded evidence.':'Lacak klaim ke bukti yang tercatat.',
 'Compare observations across both audits.':'Bandingkan temuan dari kedua audit.',
 'Upload creative to start':'Unggah gambar untuk memulai',
 'Awaiting observed claims':'Menunggu klaim teramati',
 'Awaiting comparison':'Menunggu perbandingan',
 'CURRENT SESSION':'SESI SAAT INI',
 'AWAITING CREATIVE':'MENUNGGU GAMBAR',
 'Private model access.':'Akses model privat.',
 'Public evidence workspace.':'Ruang bukti publik.',
 'How it works':'Cara kerja',
 'Upload + facts':'Unggah + fakta',
 'Audit + inspect':'Audit + periksa',
 'Repair + re-audit':'Perbaiki + audit ulang',
 'Add a creative you have permission to use.':'Tambahkan gambar yang berhak kamu gunakan.',
 'Compare observed claims with supplied facts.':'Bandingkan klaim dengan fakta yang diberikan.',
 'Check the actual revised image and its changes.':'Periksa gambar revisi dan perubahannya.',
 'Live AI requests require the private Judge access code. No simulated results.':'Permintaan AI nyata memerlukan kode akses juri. Tidak ada hasil simulasi.',
 '01 / CREATIVE UNDER REVIEW':'01 / GAMBAR YANG DIPERIKSA',
 'ORIGINAL SOURCE':'SUMBER ASLI',
 'REVISED SOURCE':'SUMBER REVISI',
 'ORIGINAL / REVISED':'ASLI / REVISI',
 'SOURCE IMAGE':'GAMBAR SUMBER',
 'Original':'Asli',
 'Revised':'Revisi',
 'Compare':'Bandingkan',
 'AD / INPUT 01':'IKLAN / INPUT 01',
 'VISUAL RECORD':'REKAMAN VISUAL',
 'Every claim starts here.':'Setiap klaim dimulai di sini.',
 'MAX 6 MB':'MAKS. 6 MB',
 'Choose creative':'Pilih gambar',
 'or tap the frame to browse':'atau ketuk bingkai untuk memilih',
 'INSPECTING PIXELS':'MEMERIKSA PIKSEL',
 'NO CREATIVE SELECTED':'BELUM ADA GAMBAR',
 'Replace ↗':'Ganti ↗',
 'EVIDENCE INPUT':'INPUT BUKTI',
 'INPUT':'INPUT',
 'Define what the ad can actually claim.':'Tentukan klaim yang didukung fakta produk.',
 'Product name':'Nama produk',
 'Supplied product facts':'Fakta produk yang diberikan',
 'Ad caption':'Caption iklan',
 'OPTIONAL':'OPSIONAL',
 'Seller-supplied facts. Not independently verified.':'Fakta dari penjual. Belum diverifikasi independen.',
 'Run audit':'Jalankan audit',
 'Supplied facts are the evidence basis, not independently verified truth.':'Fakta yang diberikan adalah dasar bukti, bukan kebenaran yang telah diverifikasi secara independen.',
 'ACTION / NEXT':'TINDAKAN / SELANJUTNYA',
 'Upload your creative and add product facts.':'Unggah gambar dan masukkan fakta produk.',
 'Repair creative ↗':'Perbaiki gambar ↗',
 'Verify revision ↗':'Verifikasi revisi ↗',
 '02 / PROOF INTELLIGENCE':'02 / INTELIJEN BUKTI',
 'Inspect the source.':'Periksa sumber.',
 'Trace every change.':'Lacak setiap perubahan.',
 'Map the evidence.':'Petakan bukti.',
 'Observation':'Pengamatan',
 'Initial audit':'Audit awal',
 'Re-audit':'Audit ulang',
 'Inspection mode':'Mode pemeriksaan',
 'Claim X-Ray':'X-Ray Klaim',
 'Proof Constellation':'Konstelasi Bukti',
 'Claim DNA':'DNA Klaim',
 'A claim needs context.':'Sebuah klaim perlu konteks.',
 'Run an audit, then select a claim to inspect its source, evidence status and repair recommendation.':'Jalankan audit lalu pilih klaim untuk memeriksa sumber, status bukti, dan saran perbaikan.',
 'Go to creative & facts ↑':'Ke gambar dan fakta ↑',
 'SCHEMATIC ONLY · NO DETECTED CLAIMS':'SKEMA SAJA · BELUM ADA KLAIM',
 'UNSCANNED':'BELUM DIPINDAI',
 'CLAIM':'KLAIM',
 'FACT':'FAKTA',
 'REVIEW':'PERIKSA',
 'IMAGE → OBSERVATION → INSPECTION':'GAMBAR → PENGAMATAN → INSPEKSI',
 'LOCATION NOT INFERRED':'LOKASI TIDAK DIPERKIRAKAN',
 'Select an observed claim':'Pilih klaim yang teramati',
 'CLAIM X-RAY':'X-RAY KLAIM',
 'Trace this claim in Constellation →':'Lacak klaim dalam Konstelasi →',
 'Source inspection · exact pixel location unavailable. No bounding box inferred.':'Inspeksi sumber · lokasi piksel pasti tidak tersedia. Tidak mengarang kotak lokasi.',
 'NO OBSERVATIONS':'BELUM ADA PENGAMATAN',
 'Evidence, connected to its source.':'Bukti yang terhubung ke sumbernya.',
 'Recorded claims, fact excerpts and recommendations will appear here after an audit.':'Klaim, kutipan fakta, dan rekomendasi muncul di sini setelah audit.',
 'SCHEMATIC ONLY · NO EVIDENCE CONNECTED':'SKEMA SAJA · BELUM ADA BUKTI TERHUBUNG',
 'RELATIONSHIP VIEW':'TAMPILAN HUBUNGAN',
 'AWAITING AUDIT':'MENUNGGU AUDIT',
 'CLAIMS / FACTS / REVIEW':'KLAIM / FAKTA / TINJAUAN',
 'SELECTED EVIDENCE':'BUKTI TERPILIH',
 'Inspect claim source →':'Periksa sumber klaim →',
 'Lines trace recorded relationships. A matching quote is not independent proof of truth.':'Garis menunjukkan hubungan tercatat. Kutipan yang cocok bukan bukti kebenaran independen.',
 'Claim DNA Evolution':'Evolusi DNA Klaim',
 'AWAITING COMPARISON':'MENUNGGU PERBANDINGAN',
 'Every revision leaves a trail.':'Setiap revisi meninggalkan jejak.',
 'Audit the original, repair the image, then re-audit to compare observations. Missing does not mean repaired.':'Audit gambar asli, perbaiki, lalu audit ulang. Tidak terdeteksi bukan berarti sudah diperbaiki.',
 'SCHEMATIC ONLY · NO REVISIONS COMPARED':'SKEMA SAJA · BELUM ADA REVISI DIBANDINGKAN',
 'VERSION LINEAGE':'RIWAYAT VERSI',
 'NO COMPARISON':'BELUM DIBANDINGKAN',
 'INITIAL AUDIT':'AUDIT AWAL',
 'RE-AUDIT':'AUDIT ULANG',
 'STATUS UNKNOWN UNTIL VERIFIED':'STATUS BELUM PASTI SEBELUM VERIFIKASI',
 'EVIDENCE BASIS':'DASAR BUKTI',
 'Seller-supplied facts · human review required':'Fakta penjual · harus ditinjau manusia',
 '03 / AUDIT DOSSIER':'03 / DOSIER AUDIT',
 'OBSERVATIONS, NOT CERTIFICATION':'PENGAMATAN, BUKAN SERTIFIKASI',
 'THE AUDIT RECORD':'CATATAN AUDIT',
 'AWAITING INPUT':'MENUNGGU INPUT',
 'Continue from saved audit':'Lanjutkan dari audit tersimpan',
 'Choose your starting image and its saved audit. No Meta API request occurs until you deliberately press Repair or Verify. The previous audit and both images remain in the next ZIP package.':'Pilih gambar sumber dan audit tersimpan. Tidak ada panggilan Meta sampai kamu sengaja menekan Perbaiki atau Verifikasi. Audit dan kedua gambar sebelumnya disimpan di ZIP berikutnya.',
 '↗ Repair original · saved audit':'↗ Perbaiki gambar asli · audit tersimpan',
 '↗ Repair revised · saved re-audit':'↗ Perbaiki revisi · audit ulang tersimpan',
 'Previous audit rounds':'Putaran audit sebelumnya',
 'No audit yet.':'Belum ada audit.',
 'Upload a creative and factual product details to begin your evidence trail.':'Unggah gambar iklan dan detail produk untuk memulai jejak bukti.',
 'Explore the evidence flow ↗':'Jelajahi alur bukti ↗',
 'Start with a creative ↑':'Mulai dengan gambar ↑',
 'Import saved audit ↗':'Impor audit tersimpan ↗',
 'REPORT STRUCTURE':'STRUKTUR LAPORAN',
 'AWAITING INPUT':'MENUNGGU INPUT',
 'DETECT':'DETEKSI',
 'VERIFY':'VERIFIKASI',
 'REPAIR':'PERBAIKI',
 'PROVE':'BUKTIKAN',
 'REAL OBSERVATIONS WILL APPEAR HERE':'PENGAMATAN NYATA AKAN TAMPIL',
 'AUDIT COMPLETE':'AUDIT SELESAI',
 'RE-CHECK COMPLETE':'AUDIT ULANG SELESAI',
 'Claims':'Klaim',
 'Findings':'Temuan',
 'Suggested copy':'Saran teks',
 'CLAIM EVIDENCE TRACE':'JEJAK BUKTI KLAIM',
 'Compared with seller-supplied facts. Not independently verified.':'Dibandingkan dengan fakta penjual. Belum diverifikasi independen.',
 'No readable claims returned. This is not proof that the creative has no claims.':'Tidak ada klaim terbaca yang dikembalikan. Ini bukan bukti bahwa gambar bebas klaim.',
 'Take the evidence with you':'Simpan bukti',
 'Run an audit to create a report.':'Jalankan audit untuk membuat laporan.',
 '↑ Import report':'↑ Impor laporan',
 '↓ Export JSON':'↓ Ekspor JSON',
 '↓ Export package ZIP':'↓ Ekspor paket ZIP',
 '↓ Revised image':'↓ Gambar revisi',
 'COPY':'SALIN',
 '✧ SUGGESTED CAPTION':'✧ SARAN CAPTION',
 'Unlock Meta AI':'Buka akses Meta AI',
 'Enter the private access code shared with judges. Public browsing remains free.':'Masukkan kode akses privat yang diberikan kepada juri. Penelusuran publik tetap gratis.',
 'Demo access code':'Kode akses demo',
 'Enter code':'Masukkan kode',
 'Cancel':'Batal',
 'Verify code ↗':'Verifikasi kode ↗',
 'META CONFIGURED':'META TERKONFIGURASI',
 'META FLOW TESTED':'ALUR META TERUJI',
 'META MODELS RESPONDED':'MODEL META MERESPONS',
 'SPARK RESPONDED':'SPARK MERESPONS',
 'API NOT SET':'API BELUM DIATUR',
 'SERVER OFFLINE':'SERVER OFFLINE',
 'API key not configured':'API key belum diatur',
 'API key configured · Models not tested':'API key diatur · Model belum diuji',
 'Muse Spark responded · Muse Image not tested':'Muse Spark merespons · Muse Image belum diuji',
 'Full audit → repair → re-audit responded':'Audit → perbaikan → audit ulang merespons',
 'Private demo access unavailable':'Akses demo privat tidak tersedia',
 'SUPPORTED BY INPUT':'DIDUKUNG INPUT',
 'NOT IN INPUT':'TIDAK ADA DI INPUT',
 'CONFLICTS WITH INPUT':'BERTENTANGAN DENGAN INPUT',
 'UNREADABLE':'TIDAK TERBACA',
 'REVIEW NEEDED':'PERLU DITINJAU',
 'CREATIVE':'GAMBAR',
 'CAPTION':'CAPTION',
 'SOURCE UNCERTAIN':'SUMBER BELUM PASTI',
 'INPUT FACT':'FAKTA INPUT',
 'Inspect claim ↗':'Periksa klaim ↗',
 'NOT approved':'BELUM disetujui',
 'NOT approved · Review images':'BELUM disetujui · Periksa gambar',
 'Candidate NOT approved · Review images':'Kandidat BELUM disetujui · Periksa gambar',
 'A higher score is NOT proof the image improved.':'Skor lebih tinggi BUKAN bukti gambar membaik.',
 'No clear issues detected. Review manually before publishing.':'Tidak ada masalah jelas terdeteksi. Tinjau manual sebelum dipublikasikan.',
 'No matched observation':'Tidak ada pengamatan cocok',
 'Review needed':'Perlu ditinjau',
 'Supported by input':'Didukung oleh input',
 'Not supported by input':'Tidak didukung input',
 'Conflicts with input':'Bertentangan dengan input',
 'Human review needed':'Perlu peninjauan manusia',
 'Unreadable':'Tidak terbaca',
 'Retained':'Tetap ada',
 'Still problematic':'Masih bermasalah',
 'Possible wording change':'Kemungkinan perubahan redaksi',
 'Not in re-audit list':'Tidak tercantum di audit ulang',
 'First seen in re-audit':'Pertama tercatat pada audit ulang',
 'Recorded in another source':'Tercatat di sumber lain',
 'Ambiguous match':'Kecocokan ambigu',
 'Awaiting re-audit':'Menunggu audit ulang',
 'SOURCE UNKNOWN':'SUMBER BELUM PASTI',
 'SOURCE':'SUMBER',
 'No matching fact':'Tidak ada fakta yang cocok',
 'CREATIVE QUALITY ESTIMATE · NOT LEGAL CERTIFICATION':'PERKIRAAN KUALITAS GAMBAR · BUKAN SERTIFIKASI HUKUM',
 'e.g. Aurora Wireless Lamp':'contoh: Lampu Nirkabel Aurora',
 'Material, size, price, features…':'Bahan, ukuran, harga, fitur…',
 'Existing ad copy (if any)':'Teks iklan yang sudah ada (jika ada)',
 'Select a claim or finding':'Pilih klaim atau temuan',
 'Slide to compare before and after':'Geser untuk membandingkan sebelum dan sesudah',
 'Uploaded ad creative':'Gambar iklan yang diunggah',
 'Edited creative':'Gambar yang diedit',
 'Original creative':'Gambar asli',
 'Creative canvas':'Kanvas gambar',
 'Project details':'Detail proyek',
 'Upload ad image. PNG, JPG or WebP, max 6 MB.':'Unggah gambar iklan PNG, JPG atau WebP, maks. 6 MB.',
 'Creative health score':'Skor kualitas gambar',
 'Audit report':'Laporan audit',
 'Continue editing from saved audit':'Lanjutkan pengeditan dari audit tersimpan',
 'Verification engine':'Mesin verifikasi',
 'Live access and Meta provider status':'Status akses dan penyedia model Meta',
 'AdProof AI home':'Beranda AdProof AI',
 'Documentation':'Dokumentasi',
 'Workflow progress':'Progres alur kerja',
 'Canvas view':'Tampilan kanvas',
 'Claim verification and evolution':'Verifikasi dan evolusi klaim',
 'Select a claim or finding':'Pilih klaim atau temuan',
 'Evidence relationships':'Hubungan bukti',
 'Claims detected':'Klaim terdeteksi',
 'NO CLAIMS':'BELUM ADA KLAIM',
 'INCOMPLETE':'TIDAK LENGKAP',
 'No clear issues':'Tidak ada masalah jelas',
 'IMAGE':'GAMBAR',
 'Upload creative':'Unggah gambar',
 'Initial observations available. Re-audit completes the comparison.':'Pengamatan awal tersedia. Audit ulang melengkapi perbandingan.',
 'Run an audit, then select a claim to inspect.':'Jalankan audit lalu pilih klaim untuk diperiksa.',
 'No readable claim selected.':'Tidak ada klaim terbaca yang dipilih.',
 'This audit has no selected claim to inspect. An empty or incomplete ledger does not prove that claims are absent.':'Audit ini tidak memiliki klaim terpilih. Daftar kosong atau tidak lengkap bukan bukti bahwa tidak ada klaim.',
 'Follow the evidence.':'Ikuti jejak bukti.',
 'No explanation returned.':'Tidak ada penjelasan yang diberikan.',
 'Input excerpt':'Kutipan input',
 'No validated input excerpt.':'Tidak ada kutipan fakta input yang tervalidasi.',
 'Review the source manually.':'Periksa sumber secara manual.',
 'FINDING':'TEMUAN',
 'No claim relationships available':'Tidak ada hubungan klaim yang tersedia',
 'An empty ledger is not proof that the creative contains no claims.':'Daftar kosong bukan bukti bahwa gambar tidak memiliki klaim.',
 'No additional detail.':'Tidak ada detail tambahan.',
 'Source':'Sumber',
 'Awaiting revised-image audit':'Menunggu audit gambar revisi',
 'Run Repair, then re-audit the actual revised image.':'Jalankan perbaikan, lalu audit ulang gambar revisi yang sebenarnya.',
 'Incomplete claim data. Matching is provisional; inspect both audits.':'Data klaim tidak lengkap. Pencocokan bersifat sementara; periksa kedua audit.',
 'Limited view: each audit supplies at most 8 selected claims. Missing from the list does NOT mean missing from the image or caption. Same wording may appear across both sources.':'Tampilan terbatas: tiap audit hanya memuat maksimal 8 klaim terpilih. Tidak tercantum BUKAN berarti hilang dari gambar atau caption. Teks yang sama bisa muncul di dua sumber.',
 'This compares selected audit observations, not exhaustive image text. Missing from a list does not prove removal; inspect both image and caption.':'Ini membandingkan pengamatan audit terpilih, bukan semua teks gambar. Hilang dari daftar bukan bukti penghapusan; periksa gambar dan caption.',
 'Image repair does not edit the caption. Its unsupported claims still need manual revision.':'Perbaikan gambar tidak mengubah caption. Klaim yang tidak didukung di caption masih perlu diedit manual.',
 'No claims returned for comparison. This does not prove the absence of claims.':'Tidak ada klaim untuk dibandingkan. Ini bukan bukti bahwa tidak ada klaim.',
 'Unreadable claim':'Klaim tidak terbaca',
 'Not evidence of removal':'Bukan bukti penghapusan',
 'Inspect source ↗':'Periksa sumber ↗',
 'No caption suggestion available.':'Belum ada saran caption.',
 'No readable claims reported':'Tidak ada klaim terbaca yang dilaporkan',
 'Image loaded · start audit':'Gambar dimuat · mulai audit',
 'Inspect traced evidence links':'Periksa hubungan bukti terlacak',
 'View claim trajectories':'Lihat jejak perubahan klaim',
 'Repair ready · run re-audit':'Perbaikan siap · jalankan audit ulang',
 'Awaiting comparison':'Menunggu perbandingan',
 'IMPORTED ARCHIVE · READ ONLY':'ARSIP DIIMPOR · BACA SAJA',
 'CONTINUED FROM ARCHIVE · LIVE REPAIR':'LANJUT DARI ARSIP · PERBAIKAN AKTIF',
 'META AI PROCESSING':'META AI MEMPROSES',
 'READY TO AUDIT':'SIAP DIAUDIT',
 'INITIAL AUDIT COMPLETE':'AUDIT AWAL SELESAI',
 'REPAIR GENERATED':'HASIL PERBAIKAN DIBUAT',
 'RE-AUDIT COMPLETE':'AUDIT ULANG SELESAI',
 'No readable claims returned':'Tidak ada klaim terbaca yang dikembalikan',
 'Uploaded creative · start audit':'Gambar diunggah · mulai audit',
 'Imported archive · choose Original or Revised to continue editing without re-auditing the saved image.':'Arsip diimpor · pilih Asli atau Revisi untuk melanjutkan tanpa mengulang audit gambar tersimpan.',
 'Processing with Meta. Please keep this tab open.':'Sedang memproses dengan Meta. Jangan tutup tab ini.',
 'Add facts, then run the initial audit.':'Masukkan fakta, lalu jalankan audit awal.',
 'Inspect the evidence, then repair the creative.':'Periksa bukti, lalu perbaiki gambar.',
 'Compare both images, then verify the revision.':'Bandingkan dua gambar, lalu verifikasi revisi.',
 'Re-audit complete, NOT approved. Compare both images and review possible defects before use.':'Audit ulang selesai, BELUM disetujui. Bandingkan gambar dan periksa potensi cacat sebelum digunakan.',
 'Saved audit restored locally. Choose a source to resume; no Meta request until you press Repair or Verify.':'Audit tersimpan dipulihkan secara lokal. Pilih sumber; tidak ada permintaan Meta sampai kamu menekan Perbaiki atau Verifikasi.',
 'JSON report restored without source images; continue editing requires a ZIP containing images.':'Laporan JSON dipulihkan tanpa gambar; kelanjutan memerlukan ZIP berisi gambar.',
 'Both audits, risk warnings and claim trajectories. Candidate image needs manual review.':'Kedua audit, peringatan risiko, dan jejak klaim tersimpan. Gambar kandidat perlu pemeriksaan manual.',
 'Initial observations available. Re-audit completes the comparison.':'Pengamatan awal tersedia. Audit ulang melengkapi perbandingan.',
 'Run an audit to create a report.':'Jalankan audit untuk membuat laporan.',
 'Archive · read only':'Arsip · baca saja',
 'Processing…':'Memproses…',
 'Inspect changes →':'Periksa perubahan →',
 'Review candidate image':'Periksa gambar kandidat',
 'Initial audit complete':'Audit awal selesai',
 'Add a creative to begin':'Tambahkan gambar untuk mulai',
 'Add facts to begin':'Tambahkan fakta untuk mulai',
 'Saved report · no Meta API used':'Laporan tersimpan · tanpa API Meta',
 'Meta model request':'Permintaan model Meta',
 'Inspecting…':'Memeriksa…',
 'Analyzing…':'Menganalisis…',
 'Verifying…':'Memverifikasi…',
 'Refining…':'Memperbaiki…',
 'Run audit':'Jalankan audit',
 'Upload creative · saved archive':'Unggah gambar · arsip tersimpan',
 'For a live audit, configure MODEL_API_KEY on the server.':'Untuk audit nyata, atur MODEL_API_KEY di server.',
 'Creative ready.':'Gambar siap.',
 'AI audit completed.':'Audit AI selesai.',
 'Caption copied.':'Caption disalin.',
 'Clipboard unavailable.':'Papan klip tidak tersedia.',
 'The revised image is a candidate, not an approved result.':'Gambar revisi adalah kandidat, bukan hasil yang sudah disetujui.',
 'Muse Spark and Muse Image responded · Re-audit pending':'Muse Spark dan Muse Image merespons · Audit ulang menunggu',
 'Muse Image responded · Spark baseline restored from archive':'Muse Image merespons · Audit Spark dasar dipulihkan dari arsip'
};
const textOriginal=new WeakMap();
const attributeOriginal=new WeakMap();
let preference='auto';
const browserLanguage=()=>{
 const langs=typeof navigator==='undefined'?[]:(navigator.languages?.length?navigator.languages:[navigator.language]);
 for(const lang of langs||[]){const base=String(lang||'').toLowerCase().split(/[-_]/)[0];if(supported.has(base))return base;}
 return 'en';
};
export function getLanguage(){return preference==='auto'?browserLanguage():preference;}
export function getPreference(){return preference;}
export function resolveLanguage(value,browser='en'){
 const chosen=String(value||'auto').toLowerCase();
 if(supported.has(chosen))return chosen;
 return String(browser).toLowerCase().startsWith('id')?'id':'en';
}
export function loadPreference(){
 try{const p=localStorage.getItem(key);preference=p==='en'||p==='id'?p:'auto';}catch{preference='auto';}
 return preference;
}
export function setPreference(p){
 preference=supported.has(p)?p:'auto';
 try{localStorage.setItem(key,preference);}catch{}
 return getLanguage();
}
export function t(english){
 const source=String(english??'');
 return getLanguage()==='id'?id[source]||source:source;
}
function ignored(node){
 const parent=node.parentElement;
 return !parent||Boolean(parent.closest('script,style,textarea,[data-no-translate],.model-generated'));
}
function translateNode(node){
 if(ignored(node))return;
 const value=node.nodeValue;
 const raw=value.trim();
 if(!raw)return;
 if(!textOriginal.has(node)){
  if(!Object.prototype.hasOwnProperty.call(id,raw))return;
  textOriginal.set(node,raw);
 }
 const original=textOriginal.get(node);
 // Preserve intentional whitespace in editorial layouts.
 const translated=t(original);
 const next=value.replace(raw,translated);
 if(value!==next)node.nodeValue=next;
}
function translateAttributes(root){
 const els=[...(root.nodeType===1?[root]:[]),...(root.querySelectorAll?.('[placeholder],[aria-label],[title]')||[])];
 for(const el of els){
  for(const attr of ['placeholder','aria-label','title']){
   if(!el.hasAttribute(attr))continue;
   const current=el.getAttribute(attr);
   if(!attributeOriginal.has(el))attributeOriginal.set(el,{});
   const previous=attributeOriginal.get(el);
   if(!(attr in previous)){
    if(!Object.prototype.hasOwnProperty.call(id,current))continue;
    previous[attr]=current;
   }
   const next=t(previous[attr]);
   if(current!==next)el.setAttribute(attr,next);
  }
 }
}
export function translateDom(root){
 if(typeof document==='undefined'||!root)return;
 if(root.nodeType===3)translateNode(root);
 else {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;while((node=walker.nextNode()))translateNode(node);
  translateAttributes(root);
 }
}
export function applyLanguage(){
 if(typeof document==='undefined')return;
 document.documentElement.lang=getLanguage();
 document.title='Proofroom — AdProof AI';
 translateDom(document.body);
}
export function observeDynamicLabels(){
 if(typeof MutationObserver==='undefined'||typeof document==='undefined')return ()=>{};
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')translateNode(record.target);
   for(const node of record.addedNodes)translateDom(node);
  }
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 return ()=>observer.disconnect();
}
export function onBrowserLanguageChange(fn){
 if(typeof window==='undefined')return;
 window.addEventListener('languagechange',()=>{if(preference==='auto'){applyLanguage();fn?.();}});
}
