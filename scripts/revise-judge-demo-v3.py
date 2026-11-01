#!/usr/bin/env python3
"""Edit only the dated style chapter of the existing AdProof AI judge demo.

All stills are derived from the existing, dated source MP4. The scene at
1:45 is explicitly labelled an *archived, cropped UI view*; it makes no
claim of successful lock validation or approval. No application behavior
or provider results are modified or synthesized.
"""
import argparse
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

DURATIONS = [15,15,15,15,7.5,7.5,15,7.5,7.5,7.5,7.5,15,15,7.5,7.5,15]
PAPER = '#f1f0e5'
INK = '#1d2b23'
LIME = '#d8f58c'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def run(*args):
    subprocess.run(args, check=True)

def face(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

def crop_style_capture(frame):
    # These are exact pixels from the recorded UI, including imported-archive
    # banner and active locks. The lower unverified result is omitted and
    # acknowledged in the embedded note, not cosmetically changed to "pass".
    shot = frame.crop((310,340,1325,705))
    preview = ImageOps.contain(shot,(1294,620),Image.Resampling.LANCZOS)
    panel = Image.new('RGB',(1374,912),PAPER)
    d = ImageDraw.Draw(panel)
    d.text((55,42),'RECORDED VISUAL STYLE CONTROLS',font=face(36,True),fill=INK)
    d.text((55,99),'Actual archived interface crop  -  no new model run',font=face(24),fill=INK)
    panel.paste(preview,((1374-preview.width)//2,175))
    d.line((55,800,1318,800),fill='#b9c5ad',width=2)
    d.text((55,826),'Archived controls only. A new verification is required before export.',font=face(24),fill=INK)
    frame.paste(panel,(26,118))

def scene_note(frame, heading, lines):
    d = ImageDraw.Draw(frame)
    d.rectangle((1420,528,1896,824),fill=INK)
    d.text((1440,553),heading,font=face(22,True),fill=LIME)
    for i,line in enumerate(lines):
        d.text((1440,601+37*i),line,font=face(22),fill=PAPER)

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--source',required=True)
    a.add_argument('--voice',required=True)
    a.add_argument('--output',required=True)
    args=a.parse_args()
    source=Path(args.source).resolve()
    voice=Path(args.voice).resolve()
    out=Path(args.output).resolve()
    work=out.parent/'.judge-demo-v3-frames'
    work.mkdir(parents=True,exist_ok=True)
    concat=[]
    elapsed=0
    for i,seconds in enumerate(DURATIONS):
        still=work/f'source_{i:02}.png'
        run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
            '-ss',str(elapsed+seconds/2),'-i',str(source),'-frames:v','1',str(still))
        frame=Image.open(still).convert('RGB')
        if i==9:  # First 7.5 seconds of the style scene, 1:45 - 1:52.5
            crop_style_capture(frame)
            scene_note(frame,'ARCHIVED CONTROLS',
                ['A saved browser view, not a','successful export verification.'])
        elif i==10:  # Genuine recorded before/after from 1:52.5 - 2:00
            scene_note(frame,'VISUAL COMPARISON',
                ['Recorded image comparison.','Review locks before export.'])
        target=work/f'frame_{i:02}.png'
        frame.save(target)
        concat += [f"file '{target.name}'",f'duration {seconds}']
        elapsed+=seconds
    concat.append(concat[-2])
    listing=work/'frames.txt'
    listing.write_text('\n'.join(concat)+'\n')
    run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
        '-f','concat','-safe','0','-i',str(listing),'-i',str(source),'-i',str(voice),
        '-filter_complex',
        '[1:a]atrim=start=0:end=105,asetpts=PTS-STARTPTS,aresample=48000[a0];'
        '[2:a]atrim=start=0:end=15,asetpts=PTS-STARTPTS,aresample=48000[a1];'
        '[1:a]atrim=start=120:end=180,asetpts=PTS-STARTPTS,aresample=48000[a2];'
        '[a0][a1][a2]concat=n=3:v=0:a=1[a]',
        '-map','0:v','-map','[a]','-t','180','-vf','fps=12,format=yuv420p',
        '-c:v','libx264','-preset','veryfast','-crf','24',
        '-c:a','aac','-b:a','96k','-movflags','+faststart',str(out))
    if not 2500000 <= out.stat().st_size <= 15000000:
        raise RuntimeError('Unexpected media size')
    # Check the recomposed MP4 duration in the publishing workflow.
    print(f'Wrote {out} ({out.stat().st_size} bytes)')

if __name__=='__main__':
    main()
