"""แปลง User Flow V1.0.14 (drawio) Option A/B เป็น JSON โครงผัง: lanes / nodes / edges"""
import os, re, html, json, sys
from lxml import etree
from pathlib import Path
SRC = Path(os.environ.get("A7_USERFLOW_DIR", r"C:/Users/USER/Downloads/Code Prototype_Activity 7/04 บทที่ 4 User Flow และ Data Flow/4.1 User Flow"))
def clean(v):
    s = html.unescape(v or ''); s = re.sub(r'<br\s*/?>', ' ', s); s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()
def kind(st, val):
    if 'swimlane' in st: return 'lane'
    if 'parallelGw' in st: return 'gateway'
    if 'shape=mxgraph' in st or 'offPage' in st: return 'connector'
    if 'rhombus' in st: return 'decision'
    if 'ellipse' in st: return 'start' if val == 'เริ่ม' else ('end' if val.startswith('สิ้นสุด') else 'merge')
    if st.startswith('text;') or 'text;' in st[:6]: return 'text'
    if 'rounded=1' in st or 'rounded' in st: return 'task'
    return 'note'
out = {}
for opt in 'AB':
    f = SRC / f'กิจกรรมที่ 7 User Flow V1.0.14 Option {opt}_21112026.drawio'
    root = etree.fromstring(f.read_bytes())
    pages = []
    for dia in root.iter('diagram'):
        cells = dia.find('mxGraphModel').find('root')
        lanes, nodes, edges, texts = [], [], [], []
        geo = {}
        for c in cells:
            st = c.get('style') or ''; val = clean(c.get('value'))
            g = c.find('mxGeometry')
            if c.get('edge'):
                edges.append({'from': c.get('source'), 'to': c.get('target'), 'label': val})
                continue
            if not c.get('vertex'): continue
            k = kind(st, val)
            if g is not None: geo[c.get('id')] = (float(g.get('x') or 0), float(g.get('y') or 0))
            if k == 'lane': lanes.append({'id': c.get('id'), 'name': val}); continue
            if k == 'text': texts.append(val); continue
            nodes.append({'id': c.get('id'), 'type': k, 'label': val, 'lane': c.get('parent'),
                          'x': geo.get(c.get('id'), (0, 0))[0], 'y': geo.get(c.get('id'), (0, 0))[1],
                          'red': ('dashed=1' in st and ('#C0392B' in st.upper() or 'ff0000' in st.lower() or 'c0392b' in st.lower()))})
        title = texts[0] if texts else ''; sub = texts[1] if len(texts) > 1 else ''
        pages.append({'id': dia.get('name'), 'title': title, 'sub': sub, 'lanes': lanes, 'nodes': nodes,
                      'edges': [e for e in edges if e['from'] and e['to']], 'notes': texts[2:]})
    out[opt] = pages
Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for opt in 'AB':
    print(opt, len(out[opt]), 'pages', sum(len(p['nodes']) for p in out[opt]), 'nodes')
