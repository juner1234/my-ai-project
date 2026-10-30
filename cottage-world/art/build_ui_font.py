"""Subset system Noto Sans CJK SC for the game's Chinese UI; preserve SIL OFL."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
root = Path(__file__).resolve().parents[1]
font = TTFont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', fontNumber=2)
text = ''.join(chr(i) for i in range(32, 127)) + ''.join(p.read_text() for p in (root/'scripts').glob('*.gd'))
subsetter = subset.Subsetter(options=subset.Options())
subsetter.populate(text=text)
subsetter.subset(font)
for name in font['name'].names:
    if name.nameID in (1, 3, 4, 6, 16, 17):
        name.string = ('Regular' if name.nameID == 17 else 'MosslightUI' if name.nameID == 6 else 'Mosslight UI').encode(name.getEncoding())
output = root/'assets/ui'
output.mkdir(exist_ok=True)
font.save(output/'MosslightUI.otf')
license_text = Path('/usr/share/doc/fonts-noto-cjk/copyright').read_text()
start = license_text.index('License: SIL-1.1\n', license_text.index('License: SIL-1.1\n') + 1)
lines = license_text[start:].splitlines()[1:]
body = '\n'.join('' if s == ' .' else s[1:] if s.startswith(' ') else s for s in lines)
(output/'OFL.txt').write_text('Noto Sans CJK SC subset, renamed Mosslight UI.\nCopyright 2014-2018 Adobe (http://www.adobe.com/), with Reserved Font Name Source.\nCopyright 2014-2018 Google Inc. (http://www.google.com/), with Reserved Font Name Noto.\nSource: https://github.com/notofonts/noto-cjk\n\n' + body)
