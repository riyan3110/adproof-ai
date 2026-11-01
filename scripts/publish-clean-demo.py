#!/usr/bin/env python3
"""Reframe dated browser-session headers in the existing AdProof AI video.

This is an edited replay, not a new Meta inference. Does not alter source ads,
result fields, scores, or audio. Captions explicitly identify edited crops.
"""
import argparse
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

DURATIONS = [15,15,15,15,7.5,7.5,15,7.5,7.5,7.5,7.5,15,15,7.5,7.5,15]
HEADER_SCENES = {1,4,8,10,15}
PAPER = (241,240,229)

def run(*args):
    subprocess.run(args, check=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    source, output = Path(args.source).resolve(), Path(args.output).resolve()
    work = output.parent / '.demo-build'
    work.mkdir(parents=True, exist_ok=True)
    concat = []
    elapsed = 0
    for index, seconds in enumerate(DURATIONS):
        still = work / f'original-{index:02}.png'
        run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-ss',str(elapsed + seconds/2),'-i',str(source),'-frames:v','1',str(still))
        canvas = Image.open(still).convert('RGB')
        if index in HEADER_SCENES:
            # Crop the real browser header and its session-only state.
            region = canvas.crop((45,247,1375,1025))
            matte = Image.new('RGB',(1381,928),PAPER)
            scaled = ImageOps.contain(region,(1365,855),Image.Resampling.LANCZOS)
            matte.paste(scaled,((1381-scaled.width)//2,(928-scaled.height)//2))
            canvas.paste(matte,(22,102))
            pen = ImageDraw.Draw(canvas)
            pen.rectangle((1427,595,1875,888),fill=(29,43,35))
            face = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',22)
            bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',21)
            pen.text((1440,614),'ARCHIVED SCREEN CAPTURE',font=bold,fill=(216,245,140))
            for line_no, line in enumerate([
                'Browser-session header omitted',
                'from this edited crop.',
                'Real Meta model results are',
                'documented in separate scenes.'
            ]):
                pen.text((1440,660+line_no*34),line,font=face,fill=(241,240,229))
        frame = work / f'frame-{index:02}.png'
        canvas.save(frame, optimize=True)
        concat.extend([f"file '{frame.name}'",f'duration {seconds}'])
        elapsed += seconds
    concat.append(concat[-2])
    listing = work / 'frames.txt'
    listing.write_text('\n'.join(concat)+'\n')
    run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-i',str(source),'-map','0:v','-map','1:a:0','-t','180','-vf','fps=12,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','24','-c:a','copy','-movflags','+faststart',str(output))
    if not 2500000 <= output.stat().st_size <= 15000000:
        raise RuntimeError('Unexpected output size, aborting publication')

if __name__ == '__main__':
    main()
