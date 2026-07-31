import sys
from faster_whisper import WhisperModel

model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    r"D:\coding\Edurank\.vidframes\audio.wav",
    language="id",
    vad_filter=True,
    beam_size=5,
)
print(f"# detected language: {info.language} (p={info.language_probability:.2f})\n")
out = []
for s in segments:
    line = f"[{int(s.start)//60:02d}:{int(s.start)%60:02d}] {s.text.strip()}"
    print(line, flush=True)
    out.append(line)

with open(r"D:\coding\Edurank\.vidframes\transcript.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
