"""Remove KHR_materials_transmission from GLB files, in place.

Some converted works came out of their exporter with every material at transmissionFactor 1: the children's
room wall (all 56 materials, plush and lacquer alike) and the hanging garden's rack and leaves. In three.js a
single transmissive material makes the renderer draw the whole room a second time, every frame, into a
refraction buffer, and the "glass" plush looked washed out and smeared. None of the works is meant to be glass,
so the extension goes; everything else in the file (Draco geometry, textures, sheen, clearcoat) is untouched.

    python scripts/model-room/strip-transmission.py public/models/archive/kids-room-8.glb ...
"""
import json
import struct
import sys


def strip(path):
    data = open(path, 'rb').read()
    magic, version, _ = struct.unpack('<4sII', data[:12])
    assert magic == b'glTF' and version == 2, path
    json_len, json_type = struct.unpack('<I4s', data[12:20])
    assert json_type == b'JSON', path
    gltf = json.loads(data[20:20 + json_len])
    rest = data[20 + json_len:]
    changed = 0
    for material in gltf.get('materials', []):
        ext = material.get('extensions', {})
        if 'KHR_materials_transmission' in ext:
            del ext['KHR_materials_transmission']
            changed += 1
        if not ext and 'extensions' in material:
            del material['extensions']
    for key in ('extensionsUsed', 'extensionsRequired'):
        if key in gltf:
            gltf[key] = [e for e in gltf[key] if e != 'KHR_materials_transmission']
            if not gltf[key]:
                del gltf[key]
    if not changed:
        print('unchanged', path)
        return
    chunk = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    chunk += b' ' * (-len(chunk) % 4)
    body = struct.pack('<I4s', len(chunk), b'JSON') + chunk + rest
    open(path, 'wb').write(struct.pack('<4sII', b'glTF', 2, 12 + len(body)) + body)
    print(f'{path}: {changed} materials no longer transmissive')


for file in sys.argv[1:]:
    strip(file)
