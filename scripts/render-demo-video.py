#!/usr/bin/env python3
"""Assemble real production captures; never synthesize application screens.

Run after the browser captures and 15-second narration WAVs are available.
The JSON excerpt and output montage are explicitly labelled evidence panels.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'qa-artifacts/demo-video'
OUT = ROOT / 'public/demo'
OUT.mkdir(parents=True, exist_ok=True)
SCRIPT = json.loads((ROOT / 'docs/submission/demo-script.json').read_text())
W, H = 1920, 1080
INK, PAPER, LIME, MUTED = '#1d2b23', '#f1f0e5', '#d8f58c', '#aeb9ad'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

def wrapped(draw, text, xy, width, size, fill, bold=False, spacing=10):
    f = font(size, bold)
    words, lines, line = text.split(), [], ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if draw.textlength(candidate, font=f) > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=f, fill=fill)
        y += size + spacing
    return y

def paste_fit(canvas, source, box):
    im = Image.open(ROOT / source).convert('RGB')
    im = ImageOps.contain(im, (box[2]-box[0], box[3]-box[1]), Image.Resampling.LANCZOS)
    canvas.paste(im, (box[0]+(box[2]-box[0]-im.width)//2, box[1]+(box[3]-box[1]-im.height)//2))

report_path = 'evidence/live-2026-11-01/aruna/verified-production.json'
report = json.loads((ROOT / report_path).read_text())
v = report['visual_consistency']['verification']
receipt = report['runs'][-1]['provenance']
# A report excerpt, not an imitation of the application or a new inference.
panel = Image.new('RGB', (1348, 926), PAPER)
d = ImageDraw.Draw(panel)
d.text((44, 36), 'RECORDED PRODUCTION REPORT', font=font(22, True), fill=INK)
d.text((44, 80), 'Independent Meta comparison', font=font(40, True), fill=INK)
d.text((44, 146), receipt['completed_at'], font=font(22), fill=INK)
rows = [('Status in saved JSON', v['status']), ('Basis', v['validation_basis']),
        ('Model', receipt['model']), ('Source / revised score', f"{report['original']['score']} / {report['verified']['score']}"),
        ('Observed removed wording', 'DINGIN HINGGA 24 JAM / Lebih lama.'),
        ('New text observed', 'None'), ('Recorded risks', str(len(v['risks'])))]
y = 210
for label, value in rows:
    d.line((44, y-12, 1304, y-12), fill='#c4cabd', width=1)
    d.text((44, y), label, font=font(22), fill=INK)
    d.text((540, y), value, font=font(22, True), fill=INK)
    y += 62
d.text((44, y+5), '7 active locks: preserved_by_model', font=font(26, True), fill=INK)
wrapped(d, 'A model assessment, not an exact-pixel guarantee. Opening an archive does not approve a new export.', (44, y+62), 1230, 25, INK)
d.text((44, 823), 'SOURCE: verified-production.json / 1 November 2026', font=font(21), fill=INK)
d.text((44, 867), 'Saved application provenance; not a signed provider receipt.', font=font(20), fill=INK)
panel.save(WORK / '06-recorded-verification.png')

montage = Image.new('RGB', (1348, 926), PAPER)
md = ImageDraw.Draw(montage)
md.text((36, 25), 'ACTUAL DOWNLOADED PNG FILES', font=font(25, True), fill=INK)
paste_fit(montage, 'evidence/live-2026-11-01/nori/website-1920-verified.png', (24, 110, 1030, 690))
paste_fit(montage, 'evidence/live-2026-11-01/nori/a4-150ppi-verified.png', (1050, 110, 1320, 740))
md.text((36, 750), 'Website: 1920 x 1080 / 1600 x 900', font=font(28, True), fill=INK)
md.text((36, 800), 'A4: 1240 x 1754 at target 150 PPI', font=font(27), fill=INK)
md.text((36, 858), 'Native pixel limits are reported; print quality is not certified.', font=font(22), fill=INK)
montage.save(WORK / '10-downloaded-formats.png')

SOURCES = {
 '01': [('qa-artifacts/home-current-2026-11-01.jpg', 15)],
 '02': [('qa-artifacts/demo-video/02-source-facts.jpg', 15)],
 '03': [('qa-artifacts/demo-video/03-claim-xray.jpg', 15)],
 '04': [('qa-artifacts/demo-video/04-proof-constellation.jpg', 15)],
 '05': [('qa-artifacts/demo-video/05-repaired-creative.jpg', 7.5), ('evidence/live-2026-11-01/aruna/export-1080-verified.png', 7.5)],
 '06': [('qa-artifacts/demo-video/06-recorded-verification.png', 15)],
 '07': [('qa-artifacts/demo-video/07-claim-dna.jpg', 7.5), ('qa-artifacts/demo-video/07-compare-midpoint.jpg', 7.5)],
 '08': [('qa-artifacts/demo-video/08-style-controls.jpg', 7.5), ('qa-artifacts/demo-video/08-style-compare.jpg', 7.5)],
 '09': [('evidence/live-2026-11-01/aruna/production-export-success.jpg', 15)],
 '10': [('qa-artifacts/demo-video/10-downloaded-formats.png', 15)],
 '11': [('qa-artifacts/demo-video/11-read-only-archive.jpg', 7.5), ('qa-artifacts/demo-video/11-archive-continuation.jpg', 7.5)],
 '12': [('qa-artifacts/demo-video/12-public-example.jpg', 15)],
}
NOTES = {
 '01': 'Advertising claim verification & repair',
 '02': 'Seller-supplied facts are not independent product proof.',
 '03': 'Unsupported means evidence is missing. It does not mean the seller is lying.',
 '04': 'Inspect links and exact quotations. Uncertainty stays visible.',
 '05': 'Original and revised pixels are retained. Recorded successful repair.',
 '06': 'Exact fields from the saved production JSON. No fresh request during this replay.',
 '07': 'Not re-detected does not establish removal. Inspect both images.',
 '08': 'Recorded Cinematic result. Import is read-only; it never inherits export approval.',
 '09': 'Actual 1080 x 1080 PNG. Native 1600 x 1600 revision; no enlargement.',
 '10': 'Previously completed production format tests. Actual downloaded image files.',
 '11': 'Explicit continuation is required. Private code is needed for new Meta requests.',
 '12': 'Open the recorded example without a code. Inspect source and dated evidence on GitHub.',
}
manifest = {'title': SCRIPT['title'], 'duration_seconds': 180, 'disclosure': SCRIPT['disclosure'],
            'format': 'Edited narrated walkthrough using actual UI captures, downloaded outputs and a labelled JSON excerpt. Not continuous live footage.',
            'sources': [], 'narration': 'Offline synthesized English narration (flite slt).', 'chapters': []}
concat = []
for index, scene in enumerate(SCRIPT['scenes']):
    sid = scene['id']
    manifest['chapters'].append({'start_seconds': index*15, 'title': scene['title']})
    for sub, (source, seconds) in enumerate(SOURCES[sid]):
        canvas = Image.new('RGB', (W, H), INK)
        draw = ImageDraw.Draw(canvas)
        draw.text((32, 23), 'adproof.', font=font(35, True), fill=PAPER)
        draw.text((218, 31), 'AI / PRODUCTION WALKTHROUGH', font=font(19), fill=LIME)
        draw.text((1320, 32), 'FICTIONAL QA INPUTS / REAL META RESULTS', font=font(17), fill=MUTED)
        draw.line((32, 87, 1888, 87), fill='#5f7062', width=1)
        draw.rectangle((26, 118, 1400, 1030), fill='#e7e8dc')
        paste_fit(canvas, source, (28, 120, 1398, 1028))
        draw.text((1440, 125), f"{sid} / 12", font=font(22, True), fill=LIME)
        y = wrapped(draw, scene['title'], (1440, 188), 436, 44, PAPER, True, 12)
        draw.line((1440, y+30, 1880, y+30), fill='#5f7062', width=2)
        y = wrapped(draw, scene['caption'], (1440, y+65), 420, 27, LIME, False, 12)
        wrapped(draw, NOTES[sid], (1440, max(y+58, 600)), 420, 25, PAPER, False, 12)
        draw.text((1440, 923), 'RECORDED RESULTS', font=font(18, True), fill=LIME)
        draw.text((1440, 959), 'adproof-ai.vercel.app', font=font(21), fill=PAPER)
        for n in range(12):
            draw.rectangle((1440+n*36, 1023, 1467+n*36, 1029), fill=LIME if n<=index else '#526356')
        path = WORK / f'frame-{sid}-{sub}.png'
        canvas.save(path)
        if sid == '01' and sub == 0:
            canvas.save(OUT/'poster.jpg', quality=88)
        concat += [f"file '{path.name}'", f'duration {seconds}']
        manifest['sources'].append({'scene': sid, 'path': source, 'duration_seconds': seconds,
                                    'sha256': hashlib.sha256((ROOT/source).read_bytes()).hexdigest()})
concat.append(concat[-2])
(WORK / 'frames-concat.txt').write_text('\n'.join(concat)+'\n')
(ROOT / 'docs/submission/demo-provenance.json').write_text(json.dumps(manifest, indent=2)+'\n')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
                '-i', str(WORK/'frames-concat.txt'), '-i', str(WORK/'narration.wav'),
                '-t', '180', '-vf', 'fps=12,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow',
                '-tune', 'stillimage', '-crf', '25', '-c:a', 'aac', '-b:a', '64k', '-ac', '1',
                '-movflags', '+faststart', str(OUT/'adproof-ai-demo.mp4')], check=True)
# Optional accessible transcript synchronized to chapters; not word-timing claims.
def stamp(s):
    return f'{s//3600:02d}:{s//60%60:02d}:{s%60:02d}.000'
vtt = ['WEBVTT', '']
for i, scene in enumerate(SCRIPT['scenes']):
    # Split into three readable cues over the 15-second chapter.
    words = scene['narration'].split()
    for part in range(3):
        text = ' '.join(words[len(words)*part//3:len(words)*(part+1)//3])
        vtt += [f'{stamp(i*15+part*5)} --> {stamp(i*15+(part+1)*5)}', text, '']
(OUT/'adproof-ai-demo.vtt').write_text('\n'.join(vtt))
print(json.dumps({'path': str(OUT/'adproof-ai-demo.mp4'), 'bytes': (OUT/'adproof-ai-demo.mp4').stat().st_size}))
