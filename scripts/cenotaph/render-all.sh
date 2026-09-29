#!/bin/bash
# Builds and renders every film the 404 needs, then encodes them into public/cenotaph.
set -e
cd "$(dirname "$0")"
B=/c/Users/user/Documents/rodionbelousov/.tools/blender-5.2.2-windows-x64/blender.exe
FF=/c/Users/user/Documents/rodionbelousov/.tools/imageio_ffmpeg/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe
OUT=../../../public/cenotaph
PORT="import bpy;r=bpy.context.scene.render;r.resolution_x=810;r.resolution_y=1440"
for m in night day; do
  $B -b -P build.py -- out=film-$m.blend engine=eevee mode=$m meta=camera-$m.json astro=astronaut.glb > /dev/null 2>&1
  $B -b -P build.py -- out=loop-$m.blend engine=eevee mode=$m loop=1 astro=astronaut.glb astroanim=astronaut-anim.glb > /dev/null 2>&1
done
for m in night day; do
  for o in land port; do
    for k in film loop; do
      d=r-$k-$m-$o; mkdir -p $d; rm -f $d/*.png
      if [ $o = port ]; then $B -b $k-$m.blend --python-expr "$PORT" -o //$d/f#### -a > $d.log 2>&1; else $B -b $k-$m.blend -o //$d/f#### -a > $d.log 2>&1; fi
      n=$(ls $d | wc -l); echo "$d frames $n"
      suf=$([ $o = port ] && echo "-portrait" || echo "")
      first=$(ls $d | head -1 | sed 's/f\([0-9]*\).png/\1/')
      crf=$([ $o = port ] && echo 23 || echo 21)
      $FF -y -loglevel error -framerate 24 -start_number $first -i $d/f%04d.png -c:v libx264 -preset slow -crf $crf -tune film -pix_fmt yuv420p -g 48 -movflags +faststart $OUT/$k-$m$suf.mp4
      if [ $k = film ]; then
        $FF -y -loglevel error -i $d/$(ls $d | head -1) -q:v 3 $OUT/start-$m$suf.jpg
        $FF -y -loglevel error -i $d/$(ls $d | tail -1) -q:v 3 $OUT/end-$m$suf.jpg
      fi
      echo "ENCODED $k-$m$suf"
    done
  done
done
echo ALL DONE
