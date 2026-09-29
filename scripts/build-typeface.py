"""Converts the site's display face (Space Grotesk, OFL) into a Three.js typeface
JSON for the 404's extruded brass letters. Weight 560, ASCII plus German letters."""
import json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen

font = instantiateVariableFont(TTFont('public/rb-space.woff2'), {'wght': 560})
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
upm = font['head'].unitsPerEm

class Typeface(BasePen):
    """Three's format: 'q' and 'b' list the end point first, then the control points."""
    def __init__(self, gs):
        super().__init__(gs); self.out = []
    def _moveTo(self, p): self.out += ['m', round(p[0]), round(p[1])]
    def _lineTo(self, p): self.out += ['l', round(p[0]), round(p[1])]
    def _qCurveToOne(self, c, p): self.out += ['q', round(p[0]), round(p[1]), round(c[0]), round(c[1])]
    def _curveToOne(self, c1, c2, p): self.out += ['b', round(p[0]), round(p[1]), round(c1[0]), round(c1[1]), round(c2[0]), round(c2[1])]
    def _closePath(self): pass

chars = [chr(c) for c in range(32, 127)] + list('äöüÄÖÜß…')
out = {}
for ch in chars:
    name = cmap.get(ord(ch))
    if not name: continue
    pen = Typeface(glyphs); glyphs[name].draw(pen)
    xs = pen.out
    out[ch] = {'ha': glyphs[name].width, 'o': ' '.join(str(v) for v in xs)}
hhea = font['hhea']
data = {
    'glyphs': out, 'familyName': 'RB Space', 'ascender': hhea.ascent, 'descender': hhea.descent,
    'underlinePosition': font['post'].underlinePosition, 'underlineThickness': font['post'].underlineThickness,
    'boundingBox': {'yMin': font['head'].yMin, 'xMin': font['head'].xMin, 'yMax': font['head'].yMax, 'xMax': font['head'].xMax},
    'resolution': upm, 'original_font_information': {'license': 'SIL Open Font License 1.1 — Space Grotesk'},
}
with open('public/type/rb-space-560.typeface.json', 'w', encoding='utf8') as f: json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
print(len(out), 'glyphs')
