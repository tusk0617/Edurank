const pool = require('../../db');
pool.query(`
  SELECT u.username, u.nama,
    COALESCE(SUM(CASE WHEN js.benar=1 THEN s.bobot_poin ELSE 0 END),0) AS poin,
    COALESCE(SUM(s.bobot_poin),0) AS total,
    CASE WHEN COALESCE(SUM(s.bobot_poin),0)=0 THEN 0
    ELSE ROUND(SUM(CASE WHEN js.benar=1 THEN s.bobot_poin ELSE 0 END)/SUM(s.bobot_poin)*100,1)
    END AS pct
  FROM users u
  LEFT JOIN hasil_assessment ha ON ha.user_id=u.id
  LEFT JOIN jawaban_siswa js ON js.hasil_id=ha.id
  LEFT JOIN soal s ON js.soal_id=s.id
  WHERE u.role='siswa' AND u.username IN ('S001','S002','S003')
  GROUP BY u.id, u.username, u.nama
  ORDER BY u.username
`).then(([r]) => { console.log(r); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
