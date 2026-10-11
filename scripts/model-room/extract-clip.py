"""Pull the animation out of an Avaturn GLB into a small JSON the Model Room plays on Rodion's own (optimised) avatar.

Avaturn's "Avatar with animation" download carries the same 52-bone skeleton as the T-pose avatar plus one
motion-captured clip (an 8 s idle). Only the clip is needed, so the 4 MB file is not shipped:

    python scripts/model-room/extract-clip.py artifacts/avaturn/rodion-idle.glb public/models/author/idle.json
"""
import json
import struct
import sys

src, out = sys.argv[1], sys.argv[2]
data = open(src, 'rb').read()
json_len = struct.unpack('<I', data[12:16])[0]
gltf = json.loads(data[20:20 + json_len])
bin_start = 20 + json_len + 8
COMPONENTS = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}

def read(index):
    acc = gltf['accessors'][index]; view = gltf['bufferViews'][acc['bufferView']]
    assert acc['componentType'] == 5126, 'float accessors only'
    n = acc['count'] * COMPONENTS[acc['type']]
    off = bin_start + view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    return list(struct.unpack_from('<%df' % n, data, off))

anim = gltf['animations'][0]
tracks = []
for ch in anim['channels']:
    node = gltf['nodes'][ch['target']['node']]['name']
    path = ch['target']['path']
    if path not in ('rotation', 'translation'):
        continue
    sampler = anim['samplers'][ch['sampler']]
    times = [round(t, 4) for t in read(sampler['input'])]
    values = [round(v, 5) for v in read(sampler['output'])]
    tracks.append({'name': f"{node}.{'quaternion' if path == 'rotation' else 'position'}", 'times': times, 'values': values})
json.dump({'name': 'idle', 'duration': max(t['times'][-1] for t in tracks), 'tracks': tracks}, open(out, 'w'), separators=(',', ':'))
print(out, len(tracks), 'tracks')
