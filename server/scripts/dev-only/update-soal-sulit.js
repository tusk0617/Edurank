/**
 * Update 10 dari 15 soal menjadi lebih sulit per kategori.
 * Jalankan: node server/scripts/dev-only/update-soal-sulit.js
 */
const pool = require('../../db');

// Soal ID dari DB: GA=49-63, TF=64-78
// Pertahankan 5 soal mudah per kategori, ganti 10 sisanya

const updates = [
  // ── GEOMETRI ANALITIK (ganti ID 51,52,54,56,57,58,59,60,61,62) ──

  { id: 51,
    pertanyaan: 'Segitiga ABC dengan A(0,0), B(4,0), C(2,6). Panjang median dari A ke sisi BC adalah...',
    opsi_a: '3', opsi_b: '3√2', opsi_c: '6', opsi_d: '2√3',
    jawaban_benar: 'b' },
  // Midpoint BC=(3,3), jarak A→(3,3)=√(9+9)=3√2

  { id: 52,
    pertanyaan: 'Garis l melalui titik potong 2x+y=5 dan x-y=1, serta sejajar 3x-y=0. Persamaan garis l adalah...',
    opsi_a: 'y = 3x + 5', opsi_b: 'y = 3x - 5', opsi_c: 'y = 3x + 1', opsi_d: 'y = -⅓x + 5',
    jawaban_benar: 'b' },
  // Titik potong: x=2,y=1. Gradien sejajar 3x-y=0 → m=3. y-1=3(x-2)→y=3x-5

  { id: 54,
    pertanyaan: 'Lingkaran x²+y²-6x+4y+4=0 bersinggungan dengan garis x=k. Nilai k yang mungkin adalah...',
    opsi_a: 'k=0 atau k=6', opsi_b: 'k=3', opsi_c: 'k=-3 atau k=9', opsi_d: 'k=1 atau k=5',
    jawaban_benar: 'a' },
  // (x-3)²+(y+2)²=9, pusat(3,-2), r=3. |3-k|=3 → k=0 atau k=6

  { id: 56,
    pertanyaan: 'Jarak antara garis sejajar 5x-12y+26=0 dan 5x-12y-26=0 adalah...',
    opsi_a: '2', opsi_b: '3', opsi_c: '4', opsi_d: '52',
    jawaban_benar: 'c' },
  // |26-(-26)|/√(25+144)=52/13=4

  { id: 57,
    pertanyaan: 'Titik P pada garis 2x-y+1=0 berjarak 5 satuan dari A(3,2). Koordinat P yang mungkin adalah...',
    opsi_a: '(3,7) saja', opsi_b: '(-1,-1) saja', opsi_c: '(3,7) dan (-1,-1)', opsi_d: '(0,1)',
    jawaban_benar: 'c' },
  // P=(t,2t+1): (t-3)²+(2t-1)²=25 → 5t²-10t-15=0 → t=3 atau t=-1 → (3,7) atau (-1,-1)

  { id: 58,
    pertanyaan: 'Titik A(2,1) ditranslasi oleh T(3,-2) lalu ditranslasi oleh T\'(-1,4). Koordinat akhir A adalah...',
    opsi_a: '(4, 3)', opsi_b: '(4, -3)', opsi_c: '(3, 4)', opsi_d: '(6, 3)',
    jawaban_benar: 'a' },
  // A+T=(5,-1), (5,-1)+T'=(4,3)

  { id: 59,
    pertanyaan: 'Panjang garis singgung dari titik A(7,0) ke lingkaran x²+y²=25 adalah...',
    opsi_a: '2√6', opsi_b: '4', opsi_c: '2√5', opsi_d: '5',
    jawaban_benar: 'a' },
  // √(|OA|²-r²)=√(49-25)=√24=2√6

  { id: 60,
    pertanyaan: 'Titik A(1,2), B(3,k), dan C(5,8) segaris. Nilai k adalah...',
    opsi_a: '3', opsi_b: '4', opsi_c: '5', opsi_d: '6',
    jawaban_benar: 'c' },
  // Gradien AB=Gradien AC: (k-2)/2=6/4=3/2 → k-2=3 → k=5

  { id: 61,
    pertanyaan: 'Titik C membagi ruas AB (A(-1,3) dan B(5,-1)) dengan AC:CB=1:2. Koordinat C adalah...',
    opsi_a: '(1, 5/3)', opsi_b: '(2, 1)', opsi_c: '(3, 1/3)', opsi_d: '(0, 2)',
    jawaban_benar: 'a' },
  // C=A+(1/3)(B-A)=(-1+2, 3-4/3)=(1, 5/3)

  { id: 62,
    pertanyaan: 'Gradien garis yang tegak lurus terhadap 2x-3y+6=0 adalah...',
    opsi_a: '2/3', opsi_b: '-2/3', opsi_c: '3/2', opsi_d: '-3/2',
    jawaban_benar: 'd' },
  // Gradien 2x-3y+6=0 → m=2/3. Tegak lurus: m=-3/2

  // ── TURUNAN FUNGSI (ganti ID 66,67,69,70,72,73,74,75,77,78) ──

  { id: 66,
    pertanyaan: 'Turunan dari f(x) = √(3x² - 2x + 1) adalah...',
    opsi_a: '(3x-1)/√(3x²-2x+1)', opsi_b: '(6x-2)·√(3x²-2x+1)',
    opsi_c: '1/(2√(3x²-2x+1))', opsi_d: '(6x-2)/(3x²-2x+1)',
    jawaban_benar: 'a' },
  // f'=(6x-2)/(2√(...))=(3x-1)/√(3x²-2x+1)

  { id: 67,
    pertanyaan: 'Turunan dari f(x) = x² · ln x adalah...',
    opsi_a: '2x ln x', opsi_b: 'x²/x', opsi_c: 'x(2 ln x + 1)', opsi_d: '2 ln x + x',
    jawaban_benar: 'c' },
  // Product rule: 2x·ln x + x²·(1/x)=2x ln x+x=x(2 ln x+1)

  { id: 69,
    pertanyaan: 'Jika f(x) = (x² + 2x)³, maka f\'(1) adalah...',
    opsi_a: '36', opsi_b: '72', opsi_c: '108', opsi_d: '144',
    jawaban_benar: 'c' },
  // f'=3(x²+2x)²·(2x+2). f'(1)=3·9·4=108

  { id: 70,
    pertanyaan: 'Persamaan garis singgung y=x³-3x yang sejajar dengan y=9x-5 adalah...',
    opsi_a: 'y=9x-16 saja', opsi_b: 'y=9x+16 saja', opsi_c: 'y=9x-16 dan y=9x+16', opsi_d: 'y=9x-2',
    jawaban_benar: 'c' },
  // y'=3x²-3=9→x=±2. Titik(2,2)→y=9x-16; titik(-2,-2)→y=9x+16

  { id: 72,
    pertanyaan: 'Turunan dari f(x) = eˣ · sin x adalah...',
    opsi_a: 'eˣ cos x', opsi_b: 'eˣ sin x', opsi_c: 'eˣ(sin x + cos x)', opsi_d: 'eˣ(sin x - cos x)',
    jawaban_benar: 'c' },
  // Product rule: eˣ sin x + eˣ cos x=eˣ(sin x+cos x)

  { id: 73,
    pertanyaan: 'f(x) = 2x³ - 9x² + 12x - 4 mencapai nilai maksimum lokal di x = ...',
    opsi_a: 'x = 1', opsi_b: 'x = 2', opsi_c: 'x = 1 dan x = 2', opsi_d: 'x = 3/2',
    jawaban_benar: 'a' },
  // f'=6x²-18x+12=0→x=1 atau x=2. f''(1)=-6<0→max di x=1

  { id: 74,
    pertanyaan: 'Turunan dari f(x) = (x² - 1)/(x² + 1) adalah...',
    opsi_a: '2x/(x²+1)', opsi_b: '4x/(x²+1)²', opsi_c: '2/(x²+1)²', opsi_d: '4x/(x²+1)',
    jawaban_benar: 'b' },
  // Quotient rule: [2x(x²+1)-(x²-1)·2x]/(x²+1)²=4x/(x²+1)²

  { id: 75,
    pertanyaan: 'Partikel bergerak dengan s(t)=t³-6t²+9t. Kecepatan partikel saat t=4 adalah...',
    opsi_a: '3', opsi_b: '6', opsi_c: '9', opsi_d: '12',
    jawaban_benar: 'c' },
  // v(t)=3t²-12t+9. v(4)=48-48+9=9

  { id: 77,
    pertanyaan: 'Titik belok (inflection point) dari f(x) = x⁴ - 2x² terjadi di x = ...',
    opsi_a: 'x = 0', opsi_b: 'x = ±1', opsi_c: 'x = ±√3/3', opsi_d: 'x = ±2',
    jawaban_benar: 'c' },
  // f''=12x²-4=0→x²=1/3→x=±1/√3=±√3/3

  { id: 78,
    pertanyaan: 'Percepatan benda a(t)=6t-4 dan v(0)=2. Kecepatan pada t=3 adalah...',
    opsi_a: '15', opsi_b: '17', opsi_c: '19', opsi_d: '21',
    jawaban_benar: 'b' },
  // v(t)=∫a dt=3t²-4t+C. v(0)=C=2. v(3)=27-12+2=17
];

async function run() {
  let updated = 0;
  for (const s of updates) {
    await pool.query(
      'UPDATE soal SET pertanyaan=?, opsi_a=?, opsi_b=?, opsi_c=?, opsi_d=?, jawaban_benar=? WHERE id=?',
      [s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.jawaban_benar, s.id]
    );
    updated++;
    console.log(`  [${s.id}] Updated: ${s.pertanyaan.substring(0, 60)}...`);
  }
  console.log(`\nSelesai: ${updated} soal dipersulit (10 GA + 10 TF).`);
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
