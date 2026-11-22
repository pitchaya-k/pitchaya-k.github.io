# -*- coding: utf-8 -*-
"""สร้าง assets/a7-flow-data.js — แหล่งข้อมูลเดียวของ Flow to Page และ Flow Guide
ที่มา: User Flow V1.0.14 Option A/B (drawio) · เล่ม 4.1 Option B 22/11/2569 (ตาราง 2.2, DFD L1, ประเด็นรอยืนยัน, ข้อกำหนด R, รหัสหน้าจอบทที่ 4)
      · ผลตรวจต้นแบบ 22/11/2569 (node_map.py)"""
import json, os, re, sys
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from node_map import M, MA, NOTE_PREFIXES, LANE_ROLE, EXTERNAL_HINTS

uf = json.loads(Path(os.environ.get('A7_USERFLOW_JSON', HERE / 'userflow.json')).read_text(encoding='utf-8'))
book = Path(os.environ.get('A7_BOOK_MD', HERE.parent / 'doc' / 'book41B.md')).read_text(encoding='utf-8').splitlines()
disc = json.loads(Path(os.environ.get('A7_DISCOVER_JSON', HERE.parent / 'flow' / 'discover.json')).read_text(encoding='utf-8'))
OUT = Path(sys.argv[1])

# ---------- ตารางขั้นตอน (เล่ม 4.1 หัวข้อ 2.2) : เลขขั้น → ผู้รับผิดชอบ, ชื่อ, SLA ----------
STEP_TABLE = {}
for l in book:
    m = re.match(r'\| ([0-9]\.[0-9](?:\.[0-9])?[กข]?) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|$', l)
    if m and m.group(1) not in STEP_TABLE:
        STEP_TABLE[m.group(1)] = {'owner': m.group(2).strip(), 'name': m.group(3).strip(), 'pages': m.group(4).strip(), 'sla': m.group(5).strip()}

# ---------- DFD Level 1 : ข้อมูลเข้า/ออก ต่อกระบวนการ ----------
DFD = {}
cur = None
for l in book:
    m = re.match(r'#### กระบวนการ P(\d)', l)
    if m: cur = m.group(1); DFD[cur] = {'in': [], 'out': []}; continue
    if l.startswith('## Data Flow Diagram (Level 2)'): cur = None
    if cur and l.startswith('| ') and not l.startswith('| จาก'):
        parts = [p.strip() for p in l.strip('|').split('|')]
        if len(parts) >= 3:
            src, dst, data = parts[0], parts[1], re.sub(r'\s+', ' ', parts[2])
            if dst.startswith(f'{cur}.0'): DFD[cur]['in'].append(f'{data} (จาก {src})')
            elif src.startswith(f'{cur}.0'): DFD[cur]['out'].append(f'{data} (ไป {dst})')

# ---------- ข้อกำหนดจากมติที่ประชุม (R) และประเด็นรอยืนยัน (K) ----------
RULES, PENDING = {}, {}
for l in book:
    m = re.match(r'\| (R\d+) \| ([^|]*) \| ([^|]*) \|', l)
    if m: RULES[m.group(1)] = f'{m.group(2).strip()} ({m.group(3).strip()})'
    m = re.match(r'\| (K\d+) \| ([^|]*) \| ([^|]*) \|', l)
    if m: PENDING[m.group(1)] = f'{m.group(2).strip()} — {m.group(3).strip()}'
R_BY_STEP = {'1.1': ['R1', 'R2'], '1.3': ['R3'], '1.4': ['R2'], '3.4': ['R4'], '3.5': ['R4', 'R5', 'R6'], '3.6': ['R5', 'R6'],
             '4.2': ['R7'], '4.3': ['R7'], '4.4': ['R5', 'R6', 'R7', 'R8'], '5.1': ['R9'], '5.2': ['R9'], '5.3': ['R5', 'R6'],
             '5.4': ['R9'], '6.1': ['R10', 'R12', 'R5', 'R6'], '6.2': ['R10', 'R5', 'R6'], '7.1': ['R11'], '7.2': ['R11'], '8.': ['R14']}
K_BY_STEP = {'1.1': ['K2', 'K3'], '1.3': ['K3'], '3.2': ['K1', 'K21'], '5.4': ['K1'], '6.4': ['K1'], '7.1.3': ['K1'],
             '6.1.3ก': ['K15'], '7.2.3': ['K17'], '8.2': ['K19'], '4.4': ['K19']}
def pick(table, step):
    out = []
    for k, v in table.items():
        if step == k or step.startswith(k + '.') or (k.endswith('.') and step.startswith(k)) or (len(k) == 3 and step[:3] == k):
            out += v
    return list(dict.fromkeys(out))

# ---------- หน้าจอ (บทที่ 4) → ไฟล์ต้นแบบ ----------
SCREENS = {
    'RES-001': ('รายการพิจารณา/ลงนาม', 'inbox.html', 'secgen, deputy, dir_case'),
    'RES-002': ('พิจารณาและลงนามรายงาน', 'approval-review.html', 'deputy, secgen, dir_case'),
    'RES-003': ('รายการสำนวนรอกลั่นกรอง (อนุสนับสนุนฯ)', 'support-subcommittee-inbox.html', 'support_sub'),
    'RES-004': ('กลั่นกรองสำนวนซับซ้อน', 'support-subcommittee.html', 'support_sub'),
    'RES-005': ('ทะเบียนวาระการประชุม', 'agenda-registry.html', 'board_sec'),
    'RES-006': ('รายละเอียดวาระการประชุม', 'agenda-detail.html', 'board_sec'),
    'RES-007': ('จัดทำเอกสารการประชุม', 'meeting-docs.html', 'board_sec'),
    'RES-008': ('รายการพิจารณาสั่งการและบรรจุวาระ', 'inbox.html', 'chairman'),
    'RES-009': ('พิจารณาสั่งการบรรจุวาระและออกคำสั่ง ม.24', 'chairman-agenda.html', 'chairman'),
    'RES-010': ('รอบการประชุมและอ่านวาระล่วงหน้า', 'board-inbox.html', 'board'),
    'RES-011': ('รายละเอียดวาระและสำนวนการประชุม', 'board-detail.html', 'board'),
    'RES-012': ('รายการสำนวนรอกลั่นกรอง (อนุกลั่นกรองฯ)', 'subcommittee-inbox.html', 'subcommittee'),
    'RES-013': ('คณะอนุกรรมการกลั่นกรองเรื่องไต่สวนข้อเท็จจริง', 'subcommittee-screening.html', 'subcommittee'),
    'RES-014': ('รายการคดี (กองบริหารคดี)', 'case-admin-inbox.html', 'case_admin'),
    'RES-015': ('รายการรอจัดทำมติ', 'resolution-inbox.html', 'board_sec'),
    'RES-016': ('บันทึกมติที่ประชุม', 'board-resolution.html', 'board_sec'),
    'RES-017': ('จัดทำรายงานมติการประชุม', 'meeting-report.html', 'board_sec'),
    'RES-018': ('รายการเรื่องที่ต้องจัดทำ', 'inbox.html', 'affairs'),
    'RES-019': ('จัดทำรายงานวินิจฉัยชี้มูล', 'ruling-report.html', 'affairs, chairman'),
    'RES-020': ('จัดทำคำสั่งแต่งตั้งผู้ไต่สวน', 'order.html', 'affairs, secgen'),
    'RES-021': ('ทะเบียนสำนวน', 'case-register.html', 'ทุกบทบาท'),
    'RES-022': ('Dashboard สถิติมติ', 'dashboard.html', 'secgen, chairman, board_sec, board, affairs, case_admin'),
    'RES-023': ('แสดงผลข้อมูลสถิติมติ', 'report-07.html', 'ทุกบทบาท (เฉพาะโฟลเดอร์ Option)'),
    'RES-024': ('คำร้องขอบรรจุวาระด่วน', 'urgent-agenda.html', 'dir_case, secgen, chairman'),
    'RES-025': ('ออกเลขทะเบียนคุม / มอบหมายคณะอนุสนับสนุน', 'dir-case-support-assign.html', 'dir_case'),
    'RES-026': ('ฟอร์มคัดกรองสำนวน', 'affairs-case-detail.html', 'chairman'),
    'RES-027': ('ทำความเห็นเสนอประธานฯ', 'affairs-opinion.html', 'affairs'),
    'RES-028': ('บรรจุระเบียบวาระและหนังสือเชิญประชุม', 'agenda-set.html', 'board_sec'),
    'RES-029': ('ทะเบียนคุมเลขสารบรรณ', 'number-registry.html', 'affairs, board_sec, case_admin, dir_case'),
    'RES-030': ('จัดทำรายงานการไต่สวนเพิ่มเติม', 'additional-inquiry.html', 'affairs (Option B)'),
    'RES-031': ('บันทึกมติที่ประชุม (วินิจฉัยชี้มูล)', 'resolution-72.html', 'board_sec'),
    'RES-032': ('พิจารณาเห็นชอบเอกสาร (ผอ.กบค.)', 'dir-case-approve.html', 'dir_case (หน้าจอใหม่ 22/11/2569 ยังไม่มีในเล่ม 4.1)'),
}
PROCESSES = [
    ('P1', '1', 'รับและตรวจสอบรายงานเสนอพิจารณา', 'RCV'), ('P2', '2', 'กลั่นกรองสำนวนซับซ้อนยุ่งยาก', 'CPX'),
    ('P3', '3', 'กลั่นกรองเรื่องก่อนเสนอคณะกรรมการ ป.ป.ท.', 'SCR'), ('P4', '4', 'บรรจุวาระการประชุมคณะกรรมการ ป.ป.ท.', 'AGD'),
    ('P5', '5', 'พิจารณาและจัดทำมติคณะกรรมการ ป.ป.ท.', 'RES'), ('P6', '6', 'ดำเนินการจัดทำคำสั่ง', 'ORD'),
    ('P7', '7', 'จัดทำรายงานการไต่สวนเพื่อวินิจฉัยชี้มูล', 'RUL'), ('P8', '8', 'ค้นหาและรายงานข้อมูลคดี', 'SRH'),
]
case_status = {}
st_label = {s[0]: s[1] for s in disc['status']}
for c in disc['cases']: case_status[c['id']] = st_label.get(c['status'], c['status'])

def lane_role(name):
    for k, r in LANE_ROLE:
        if k in name: return r
    return 'any'
norm = lambda s: re.sub(r'\s+', '', s or '')

# ---------- รวมผัง + แมปหน้าจอ ----------
by_label_B = {}
for p in uf['B']:
    for n in p['nodes']:
        if n['id'] in M:
            by_label_B.setdefault((p['id'], norm(n['label'])), n['id'])      # หน้าเดียวกันก่อน
            by_label_B.setdefault((p['id'][0], norm(n['label'])), n['id'])   # แล้วจึงกระบวนการเดียวกัน
import difflib
def fuzzy_B(proc, n):
    """Option A ใช้ชื่อโหนดต่างจาก B เล็กน้อย — จับคู่โหนดชนิดเดียวกันในกระบวนการเดียวกันที่ชื่อคล้ายที่สุด (≥ 0.6)"""
    if n['type'] not in ('task', 'decision'): return None
    best, score = None, 0.0
    for p in uf['B']:
        if p['id'][0] != proc: continue
        for m in p['nodes']:
            if m['id'] not in M or m['type'] != n['type']: continue
            s = difflib.SequenceMatcher(None, norm(n['label']), norm(m['label'])).ratio()
            if s > score: best, score = m['id'], s
    return best if score >= 0.6 else None
pages_out = {}
report = []
for opt in 'AB':
    pages = []
    for p in uf[opt]:
        lanes = {l['id']: l['name'] for l in p['lanes']}
        nodes = []
        for n in p['nodes']:
            if n['type'] == 'task' and any(n['label'].startswith(x) for x in NOTE_PREFIXES):
                n = dict(n, type='note')
            node = {'id': n['id'], 'type': n['type'], 'label': n['label'], 'lane': lanes.get(n['lane'], ''), 'laneRole': lane_role(lanes.get(n['lane'], ''))}
            ma = MA.get(f"{p['id']}:{n['id']}") if opt == 'A' else None
            if isinstance(ma, dict): key, mp = f"A:{p['id']}:{n['id']}", ma
            else:
                key = n['id'] if opt == 'B' else (ma or by_label_B.get((p['id'], norm(n['label']))) or by_label_B.get((p['id'][0], norm(n['label']))) or fuzzy_B(p['id'][0], n))
                mp = M.get(key) if key else None
            if n['type'] in ('task', 'decision'):
                if any(h in n['label'] for h in EXTERNAL_HINTS) and not mp:
                    mp = dict(step='', role='owner', url='', code='', status='external', case='—', do='ทำในระบบกระบวนการดำเนินงานเรื่องร้องเรียนกล่าวหา (นอกระบบนี้)', target='', result='', note='')
                if mp:
                    st = mp['step']
                    tbl = STEP_TABLE.get(st) or STEP_TABLE.get(st[:3]) or {}
                    proc = p['id'][0]
                    node.update({
                        'step': st, 'role': mp['role'], 'url': mp['url'], 'code': mp['code'], 'status': mp['status'], 'case': mp['case'],
                        'caseStatus': case_status.get(mp['case'], ''), 'do': mp['do'], 'target': mp['target'], 'result': mp['result'], 'note': mp['note'],
                        'stepName': tbl.get('name', ''), 'owner': tbl.get('owner', ''), 'sla': tbl.get('sla', ''),
                        'rules': [r for r in pick(R_BY_STEP, st) if r in RULES],
                        'pending': [k for k in pick(K_BY_STEP, st) if k in PENDING],
                        'mappedFrom': key if opt == 'A' else None, 'proc': 'P' + proc,
                    })
                else:
                    node.update({'status': 'missing', 'proc': 'P' + p['id'][0], 'note': 'ไม่พบการแมปกับหน้าจอ (Missing Mapping)'})
                    report.append({'option': opt, 'page': p['id'], 'node': n['id'], 'label': n['label'], 'issue': 'ไม่พบการแมปหน้าจอ'})
            nodes.append(node)
        edges = [{'from': e['from'], 'to': e['to'], 'label': e['label']} for e in p['edges']]
        pages.append({'id': p['id'], 'proc': 'P' + p['id'][0], 'title': p['title'], 'sub': p['sub'], 'lanes': [l['name'] for l in p['lanes']], 'nodes': nodes, 'edges': edges})
    pages_out[opt] = pages

# ---------- ปลายทางตัวเชื่อม "ไป x-x" ที่ไม่มีหน้า ----------
ALIASES = {'6-3': '6-1'}
for opt in 'AB':
    ids = {p['id'] for p in pages_out[opt]}
    for p in pages_out[opt]:
        for n in p['nodes']:
            if n['type'] == 'connector' and n['label'].startswith('ไป'):
                for t in re.findall(r'\d-\d', n['label']):
                    if t not in ids:
                        report.append({'option': opt, 'page': p['id'], 'node': n['id'], 'label': n['label'],
                                       'issue': f'ตัวเชื่อมชี้ไปหน้า {t} ที่ไม่มีใน Option {opt}' + (f' — ใช้หน้า {ALIASES[t]} แทน (6.3 รวมเข้า 6.1 ตามเล่ม 4.1)' if t in ALIASES and ALIASES[t] in ids else '')})

# ---------- รายงานหน้าจอ mapping สถานะ ----------
for opt in 'AB':
    for p in pages_out[opt]:
        for n in p['nodes']:
            if n.get('status') in ('partial', 'pending', 'missing', 'external') and n['type'] in ('task', 'decision') and n.get('note'):
                report.append({'option': opt, 'page': p['id'], 'node': n['id'], 'label': n['label'], 'issue': f"[{n['status']}] {n['note']}"})

# ---------- สถานการณ์จำลอง (เส้นทางผ่านผังจริง + คำตอบตั้งต้นของจุดตัดสินใจ) ----------
SCEN = [
    dict(id='S71-normal', name='7.1 ไต่สวนเบื้องต้น · เส้นทางปกติ (สำนวนกองปราบ · รับไว้ไต่สวน)', line='7.1', option='AB', start=('1-1', 'p1_t1'),
         objective='เดินสำนวนไต่สวนเบื้องต้นตั้งแต่รับเรื่องจนออกคำสั่งแต่งตั้งผู้ไต่สวน',
         outcome='คำสั่งแต่งตั้งผู้ไต่สวนลงนามแล้ว และส่งหนังสือแจ้งหน่วยงาน',
         choices={'p1_g1': 'ครบ', 'p1_g2': 'ไม่', 'p2_g1': 'ไม่', 'p2_g2': 'ไม่', 'p2_g3': 'ใช่', 'p10_g1': 'ใช่', 'p17_g1': 'ไม่',
                  'p20_p1': 0, 'p21_g1': 'ไม่', 'p21_g2': 'ใช่', 'p22_g1': 'ใช่'},
         choicesA={'p12_g1': 'ไม่', 'p14_g1': 'รับไว้ไต่สวน หรือไม่ชี้มูล'}),
    dict(id='S71-complex', name='7.1 ไต่สวนเบื้องต้น · สำนวนซับซ้อน (ผ่านคณะอนุสนับสนุนฯ)', line='7.1', option='AB', start=('1-2', 'p2_t1'),
         objective='เลขาธิการฯ ชี้ว่าซับซ้อน ผอ.กบค. มอบหมายคณะอนุสนับสนุนฯ แล้วกลับมาลงนาม',
         outcome='สำนวนผ่านความเห็นคณะอนุสนับสนุนฯ แล้วเข้าสู่การกลั่นกรองก่อนเสนอคณะกรรมการ',
         choices={'p2_g1': 'ใช่', 'p2_g3': 'ไม่', 'p10_g1': 'ไม่'}, stop_at_page='4-1'),
    dict(id='S71-urgent', name='7.1 ไต่สวนเบื้องต้น · มีใบด่วน (วาระด่วน)', line='7.1', option='AB', start=('1-1', 'p1_t1'),
         objective='เรื่องที่แนบใบด่วน ผ่าน ผอ.กบค. รับรอง แล้วเลขาธิการฯ ยืนยันเข้าวาระด่วน',
         outcome='เรื่องเข้าบรรจุวาระด่วน', choices={'p1_g1': 'ครบ', 'p1_g2': 'ใช่'}, stop_at_page='4-2'),
    dict(id='S71-reject', name='7.1 ไต่สวนเบื้องต้น · สำนวนไม่ครบ (ปฏิเสธการรับ)', line='7.1', option='AB', start=('1-1', 'p1_t1'),
         objective='สำนวนไม่ครบ เลขาธิการฯ ปฏิเสธการรับพร้อมหมายเหตุ', outcome='เรื่องคืนผู้รับผิดชอบสำนวน (สิ้นสุดในระบบนี้)', choices={'p1_g1': 'ไม่ครบ'}),
    dict(id='S72-normal', name='7.2 วินิจฉัยชี้มูล · ไม่ซับซ้อน · ชี้มูลสายอาญาและวินัย', line='7.2', option='AB', start=('1-3', 'p3_t1'),
         objective='เดินสำนวนวินิจฉัยชี้มูลจนจัดทำรายงานและหนังสือลงโทษทางวินัย',
         outcome='รายงานวินิจฉัยชี้มูลลงนาม ส่งดำเนินคดีอาญา และส่งหนังสือลงโทษทางวินัย',
         choices={'p3_g1': 'ครบ', 'p3_g2': 'ไม่', 'p4_g1': 'ไม่', 'p4_g2': 'ไม่', 'p8_g1': 'ไม่', 'p17_g1': 'ไม่', 'p20_p1': 0,
                  'p21_g1': 'ใช่', 'p25_g1': 'ใช่'},
         choicesA={'p12_g1': 'ไม่', 'p14_g1': 'ชี้มูล'}),
    dict(id='S72-complex', name='7.2 วินิจฉัยชี้มูล · ประธานฯ คัดกรองว่าซับซ้อน (ผ่านคณะอนุกลั่นกรองฯ)', line='7.2', option='AB', start=('3-1', 'p8_t1'),
         objective='ประธานฯ คัดกรองว่าซับซ้อน ส่งคณะอนุกลั่นกรองฯ พิจารณาเสนอมติ', outcome='เรื่องพร้อมบรรจุวาระ',
         choices={'p8_g1': 'ใช่', 'p10_g1': 'ไม่'}, stop_at_page='4-1'),
    dict(id='S73-agenda', name='7.3 เรื่องทั่วไป · เสนอคณะกรรมการ แล้วจัดทำรายงานการไต่สวนเพิ่มเติม', line='7.3', option='B', start=('1-5', 'p5_t1'),
         objective='เรื่องทั่วไปผ่านเลขาธิการฯ ประธานฯ บรรจุวาระ คณะกรรมการมีมติ แล้วจัดทำรายงานการไต่สวนเพิ่มเติม (6.4)',
         outcome='ส่งรายงานการไต่สวนเพิ่มเติมให้ผู้รับผิดชอบสำนวน',
         choices={'p5_g1': 'ครบ', 'p5_g2': 'ไม่', 'p11_g1': 'ไม่', 'p17_g1': 'ไม่', 'p20_p1': 0, 'p21_g1': 'ไม่', 'p21_g2': 'ไม่', '__multi': '6-4'}),
    dict(id='S73-assign', name='7.3 เรื่องทั่วไป · ประธานฯ มอบหมาย/สั่งการหน่วยงาน', line='7.3', option='AB', start=('1-5', 'p5_t1'),
         objective='ประธานฯ มอบหมายหน่วยงานที่เกี่ยวข้องโดยไม่บรรจุวาระ', outcome='สิ้นสุดที่การมอบหมาย (ต้นแบบยังไม่มีหน้าจอขั้นนี้)',
         choices={'p5_g1': 'ครบ', 'p5_g2': 'ไม่', 'p11_g1': 'ใช่'}),
    dict(id='S8-search', name='ค้นหาและรายงานข้อมูลคดี (ใช้ได้ทุกช่วง)', line='ทุกสาย', option='AB', start=('8-1', 'p27_t1'),
         objective='ค้นหา กรอง ดูแดชบอร์ด และส่งออกข้อมูล', outcome='ได้รายงาน/ไฟล์ส่งออก', choices={}),
]

# ---------- จำลองเดินผังเพื่อยืนยันว่าเส้นทางของทุกสถานการณ์ครบ ----------
def simulate(opt, sc, max_steps=200):
    pages = {p['id']: p for p in pages_out[opt]}
    cur_page, cur = sc['start']
    path, notes = [], []
    seen = 0
    while seen < max_steps:
        seen += 1
        pg = pages.get(cur_page)
        if not pg: notes.append(f'ไม่พบหน้า {cur_page}'); break
        nodes = {n['id']: n for n in pg['nodes']}
        n = nodes.get(cur)
        if not n: notes.append(f'ไม่พบโหนด {cur}'); break
        if n['type'] in ('task', 'decision'): path.append(f"{cur_page}:{cur}")
        if sc.get('stop_at_page') and cur_page == sc['stop_at_page']: break
        outs = [e for e in pg['edges'] if e['from'] == cur]
        if n['type'] == 'end': break
        if n['type'] == 'connector' and n['label'].startswith('ไป'):
            targets = [ALIASES.get(t, t) for t in re.findall(r'\d-\d', n['label'])]
            targets = [t for t in targets if t in pages]
            if not targets: notes.append(f'ปลายทาง {n["label"]} ไม่มีใน Option {opt}'); break
            t = sc['choices'].get('__multi') if len(targets) > 1 and sc['choices'].get('__multi') in targets else targets[0]
            tp = pages[t]
            entry = next((x for x in tp['nodes'] if x['type'] == 'connector' and x['label'].startswith('จาก') and cur_page in x['label']), None)
            if not entry:
                entry = next((x for x in tp['nodes'] if x['type'] == 'start'), None)
            if not entry:
                tos = {e['to'] for e in tp['edges']}
                entry = next((x for x in tp['nodes'] if x['id'] not in tos and x['type'] in ('connector', 'task')), tp['nodes'][0])
            cur_page, cur = t, entry['id']
            continue
        if not outs: notes.append(f'ไม่มีทางออกจาก {cur_page}:{cur} ({n["label"][:20]})'); break
        if n['type'] in ('decision', 'gateway'):
            ch = sc['choices'].get(cur)
            e = outs[ch] if isinstance(ch, int) else next((o for o in outs if o['label'] == ch), None)
            if e is None: e = outs[0]; notes.append(f'ใช้ทางแรกที่ {cur} (ไม่มีคำตอบตั้งต้น)')
        else:
            e = outs[0]
        cur = e['to']
    return path, notes

scen_out = []
for sc in SCEN:
    res = {}
    for opt in 'AB':
        if opt not in sc['option'] and sc['option'] != 'AB': continue
        if opt == 'A':
            # Option A: เริ่มจากหน้าเดียวกันด้วยโหนดที่ชื่อตรงกัน
            pa = {p['id']: p for p in pages_out['A']}
            pb = {p['id']: p for p in pages_out['B']}
            sp, sn = sc['start']
            lab = next((n['label'] for n in pb[sp]['nodes'] if n['id'] == sn), '')
            cand = next(((p['id'], n['id']) for p in pages_out['A'] for n in p['nodes'] if p['id'] == sp and norm(n['label']) == norm(lab)), None)                 or next(((p['id'], n['id']) for p in pages_out['A'] for n in p['nodes'] if p['id'][0] == sp[0] and norm(n['label']) == norm(lab)), None)
            if not cand: continue
            # คำตอบของจุดตัดสินใจ Option A แปลงจากชื่อโหนด
            chA = {}
            for kB, v in sc['choices'].items():
                if kB.startswith('__'): chA[kB] = v; continue
                labB = next((n['label'] for p in pages_out['B'] for n in p['nodes'] if n['id'] == kB), None)
                for p in pages_out['A']:
                    for n in p['nodes']:
                        if n['type'] == 'decision' and labB is not None and norm(n['label']) == norm(labB) and p['id'][0] == next(pp['id'][0] for pp in pages_out['B'] if any(x['id'] == kB for x in pp['nodes'])):
                            chA[n['id']] = v
            chA.update(sc.get('choicesA', {}))
            scA = dict(sc, start=cand, choices=chA)
            path, notes = simulate('A', scA)
            res['A'] = {'start': list(cand), 'choices': chA, 'path': path, 'notes': notes}
        else:
            path, notes = simulate('B', sc)
            res['B'] = {'start': list(sc['start']), 'choices': sc['choices'], 'path': path, 'notes': notes}
    roles = []
    for opt, r in res.items():
        pg = {p['id']: {n['id']: n for n in p['nodes']} for p in pages_out[opt]}
        for k in r['path']:
            pid, nid = k.split(':')
            n = pg[pid][nid]
            if n.get('role') and n['role'] not in roles: roles.append(n['role'])
    scen_out.append({k: v for k, v in sc.items() if k not in ('choices', 'start')} | {'byOption': res, 'roles': roles})

data = {
    'version': '2026-11-22', 'source': {
        'userFlow': 'กิจกรรมที่ 7 User Flow V1.0.14 Option A/B_21112026.drawio',
        'book': 'เล่ม 4.1 กิจกรรมที่ 7 ฉบับเต็ม - Option B_22112026.docx (หัวข้อ 2.2, DFD L1, 2.6, บทที่ 4)',
        'verified': 'เปิดต้นแบบตรวจปุ่ม/หน้าจอทุกขั้น 22/11/2569 (บล็อกการเขียนฐานข้อมูล)'},
    'processes': [{'id': p[0], 'num': p[1], 'name': p[2], 'abbr': p[3], 'inputs': DFD.get(p[1], {}).get('in', []), 'outputs': DFD.get(p[1], {}).get('out', [])} for p in PROCESSES],
    'pages': pages_out, 'aliases': ALIASES, 'screens': {k: {'name': v[0], 'path': v[1], 'roles': v[2]} for k, v in SCREENS.items()},
    'rules': RULES, 'pendingConfirm': PENDING, 'scenarios': scen_out, 'mappingReport': report,
    'externals': [
        {'id': 'X-CMP', 'name': 'ระบบกระบวนการดำเนินงานเรื่องร้องเรียนกล่าวหา', 'rel': 'ส่งสำนวน/รายงานเข้าระบบ (ต้นทาง) และรับเรื่องที่ปฏิเสธการรับกลับ'},
        {'id': 'X-EOF', 'name': 'ระบบงานสารบรรณ สำนักงาน ป.ป.ท. (e-office)', 'rel': 'ออกเลขหนังสือทุกขั้นที่มีการขอเลข (ต้นแบบจำลอง)'},
        {'id': 'X-FOL', 'name': 'กลุ่มงานบริหารติดตามคดี / กิจกรรมที่ 8', 'rel': 'รับหนังสือลงโทษทางวินัยไปติดตามผล'},
        {'id': 'X-NACC', 'name': 'สำนักงาน ป.ป.ช. / พนักงานสอบสวน / อัยการ', 'rel': 'รับเรื่องส่งต่อและส่งดำเนินคดีอาญา'},
    ],
}
OUT.write_text('/* สร้างอัตโนมัติด้วย build_flow_data.py — ห้ามแก้มือ (แก้ที่ node_map.py แล้วสร้างใหม่)\n'
               '   แหล่งข้อมูลเดียวของ flow-to-page.html และ flow-guide.html */\n'
               'window.A7FLOW = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print('written', OUT, OUT.stat().st_size, 'bytes · steps table', len(STEP_TABLE), '· rules', len(RULES), '· pending', len(PENDING), '· DFD', {k: (len(v['in']), len(v['out'])) for k, v in DFD.items()})
for s in scen_out:
    for opt, r in s['byOption'].items():
        print(f"{s['id']:12} {opt} steps={len(r['path']):3} notes={r['notes']}")
print('report', len(report))
for r in report: print('  ', r['option'], r['page'], r['label'][:30], '|', r['issue'][:110])
