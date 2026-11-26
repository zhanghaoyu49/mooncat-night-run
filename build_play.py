"""Package the playable page with its scripts and materials for the public link."""
from pathlib import Path
import base64
import re
root=Path(__file__).resolve().parent
page=(root/'index.html').read_text().replace('<link rel="manifest" href="./game.webmanifest">','')
def asset(name,mime):
    return 'data:'+mime+';base64,'+base64.b64encode((root/name).read_bytes()).decode()
def script(match):
    name=match[1]
    source=(root/name).read_text()
    if name=='install.js':source=source.split('\n',1)[1]
    return '<script>\n'+source+'\n</script>'
page=page.replace('./icon-192.png',asset('icon-192.png','image/png'))
for name in ('surfaces.webp','alley-surfaces.webp','shopfronts.webp','apricot.webp'):
    page=page.replace('="'+name+'"','="'+asset(name,'image/webp')+'"')
(root/'play.html').write_text(re.sub(r'<script src="([^"]+)"></script>',script,page))
