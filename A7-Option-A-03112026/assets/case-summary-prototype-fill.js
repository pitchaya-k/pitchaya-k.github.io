/* เติมข้อมูลตัวอย่างประกอบให้การ์ดสรุปสำนวนของเคสเดิมใน approval-review.html (รองเลขาฯ / เลขาฯ)
   ฐานข้อมูลยังไม่มีคอลัมน์ ช่องทางรับเรื่อง / ฐานความผิด / ผลรายบุคคล / คุ้มครองพยาน — ไฟล์นี้อนุมานค่าที่ "ควรเป็น"
   จากข้อมูลที่เคสมีอยู่ (ประเภทเคส ผู้กล่าวหา เรื่อง/ข้อกล่าวหา ผู้ถูกกล่าวหา ความเห็นตามสาย) เพื่อให้เห็นหน้าตาการ์ดเมื่อมีข้อมูล
   - เติมเฉพาะช่องที่ว่างเท่านั้น ค่าจริงจากฐานข้อมูล/ทะเบียนกลางชนะเสมอ
   - คืนสำเนาใหม่ ไม่แก้ kase เดิม (ไม่หลุดไปบันทึกใน sessionStorage / Supabase)
   - ทุกช่องที่เติมถูกระบุใน prototypeFilled ให้การ์ดแสดงว่าเป็น "ตัวอย่างประกอบ" — ระบบจริงต้องรับข้อมูลจากกิจกรรมต้นทาง
   - หน้าจอ Mock (isMock) มีข้อมูลจำลองของตัวเองครบแล้ว จึงไม่เติมซ้ำ
   ต้องโหลดหลัง assets/ecmis-app.js */
(function (global) {
'use strict';

const ECMIS = global.ECMIS;

const OFFENSE_RULES = [
  { re: /เรียกรับ|สินบน|รับเงิน|เรียกเงิน/, offense: { section: 'ม.149 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานเรียกรับทรัพย์สินเพื่อกระทำการในตำแหน่ง' } },
  { re: /เบียดบัง|ยักยอก|เบิกจ่าย|เบิกเงิน|เบิกค่า|เบิกเกิน/, offense: { section: 'ม.147 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานเบียดบังทรัพย์' } },
  { re: /จัดซื้อ|จัดจ้าง|ประมูล|เสนอราคา|ก่อสร้าง|ฮั้ว/, offense: { section: 'ม.151 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานใช้อำนาจในตำแหน่งโดยทุจริตในการจัดการทรัพย์' } },
  { re: /ปลอม|เอกสารเท็จ|รับรองเท็จ/, offense: { section: 'ม.162 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานรับรองเป็นหลักฐานเท็จ' } }
];
const OFFENSE_157 = { section: 'ม.157 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานปฏิบัติหรือละเว้นการปฏิบัติหน้าที่โดยมิชอบ' };
const OFFENSE_MISCONDUCT = { section: 'ประพฤติมิชอบ', name: 'ฝ่าฝืนระเบียบ / วินัยในการปฏิบัติหน้าที่' };

/* เรื่องทั่วไป 7.3 ที่ผูกกับคดี (มีผู้ถูกกล่าวหา/ฐานความผิดของคดีเดิม) — ประเภทอื่นเป็นงานบริหาร ฐานความผิด/ผู้ถูกกล่าวหาไม่เกี่ยวข้อง */
const CASE_LINKED_73 = /^(PROSECUTOR_|DISCIPLINE_REVIEW_|AMEND_RESOLUTION_73|ADD_ACCUSED_73|OVERDUE_REPORT_73)/;

const isBlank = v => v == null || v === '' || v === '—' || v === '-';
const has = (k, key) => {
  const p = (k.junction && k.junction.payload) || {};
  return !isBlank(k[key]) || !isBlank(p[key]) || !isBlank((p.caseContext || {})[key]);
};
const named = k => (Array.isArray(k.accused) ? k.accused : []).filter(a => a && !isBlank(String(a.name || '').trim()));

/* A7-01: ช่องทางรับเรื่องอนุมานจากผู้กล่าวหา/ผู้ส่งเรื่อง */
function channelFor(k) {
  if (ECMIS.isCase73(k)) return 'เสนอตามภารกิจ (หน่วยงานภายใน)';
  const c = String(k.complainant || '');
  if (/ป\.ป\.ช/.test(c)) return 'NACC';
  if (/ไม่ประสงค์|ไม่ระบุชื่อ|บัตรสนเท่ห์/.test(c)) return 'HOTLINE_1206';
  if (/กรม|สำนักงาน|สตง|กระทรวง|องค์การ|เทศบาล|จังหวัด|อำเภอ|กอง|หน่วยงาน|มหาวิทยาลัย|โรงพยาบาล|สภา/.test(c)) return 'หนังสือจากหน่วยงาน';
  if (/^(นาย|นาง|นางสาว)/.test(c.trim())) return 'WALK_IN';
  return 'WEBSITE';
}

/* A7-03: ฐานความผิดอนุมานจากเรื่อง + ข้อกล่าวหา (ทุกเคสอาญาต่อท้าย ม.157) */
function offensesFor(k) {
  const text = `${k.subject || ''} ${k.allegation || ''}`;
  const list = OFFENSE_RULES.filter(r => r.re.test(text)).map(r => r.offense);
  return list.length ? list.concat(OFFENSE_157) : [OFFENSE_MISCONDUCT];
}
const shortSection = o => o.section.replace(' ประมวลกฎหมายอาญา', '');

function ownerOpinionFor(k) {
  if (ECMIS.isCase73(k)) return 'เห็นควรเสนอคณะกรรมการ ป.ป.ท. พิจารณาตามที่เสนอ';
  if (ECMIS.isCase72(k)) return 'เห็นควรชี้มูลความผิดผู้ถูกกล่าวหาตามรายงานการไต่สวนข้อเท็จจริง';
  return 'เห็นควรรับไว้ไต่สวน — ข้อกล่าวหามีมูลตามรายงานการไต่สวนเบื้องต้น';
}
function meetingResolutionFor(k) {
  const code = typeof k.resolution === 'object' ? k.resolution && k.resolution.code : k.resolution;
  const res = code && ECMIS.resolutionOf && ECMIS.resolutionOf(code);
  if (res) return `มีมติ: ${res.label}`;
  if (ECMIS.isCase72(k)) return 'มีมติรับไว้ไต่สวน (ชั้นไต่สวนเบื้องต้น) ก่อนเข้าสู่ชั้นวินิจฉัยชี้มูล';
  return null; // ยังไม่เคยเข้าที่ประชุม → "ไม่มีรายการ"
}

function apply(kase) {
  if (!kase || kase.isMock) return kase;
  const k = JSON.parse(JSON.stringify(kase));
  const filled = [];
  const states = Object.assign({}, k.fieldStates || {});
  /* เคสที่โหลดจาก Supabase ไม่มี generalType ติดมา (supabaseRowToCase ไม่คัดลอกจาก CASES ส่วนกลาง) —
     ใช้ค่าเดิมของเคสใน ECMIS.CASES / payload ทะเบียนกลาง ให้ชิปประเภทย่อยแสดงเหมือนหน้า Mock */
  if (!k.generalType) {
    const mem = (ECMIS.CASES || []).find(c => c.id === k.id);
    const gt = (mem && mem.generalType) || (k.junction && k.junction.payload && k.junction.payload.generalType);
    if (gt) k.generalType = gt;
  }
  const is73 = ECMIS.isCase73(k);
  const is72 = !is73 && ECMIS.isCase72(k);
  const t73 = is73 && ECMIS.generalType73 && ECMIS.generalType73(k.generalType);
  const caseLinked73 = !!(t73 && CASE_LINKED_73.test(t73.code));

  if (!has(k, 'intakeChannel')) { k.intakeChannel = channelFor(k); filled.push('ช่องทางรับเรื่อง'); }

  if (!has(k, 'offenses')) {
    if (is73 && !caseLinked73) states.offenses = 'NA';
    else { k.offenses = offensesFor(k); filled.push('ฐานความผิด'); }
  }

  const accused = named(k);
  if (is73 && !caseLinked73) {
    if (!accused.length) states.accused = 'NA';
    states.accusedResult = 'NA';
    states.findings = 'NA';
  } else if (is73) {
    /* ผลรายบุคคลของเรื่องทบทวน 7.3 เป็นของคดีเดิม ไม่ใช่ข้อเสนอในเรื่องนี้ — ไม่อนุมาน ปล่อย "ยังไม่มีข้อมูล" */
  } else if (accused.length) {
    const result = is72 ? 'INDICT' : 'MERIT';
    const label = is72 ? 'ชี้มูล' : 'มีมูล';
    const offenses = k.offenses || [];
    let touched = false;
    k.accused = (k.accused || []).map(a => {
      if (!named({ accused: [a] }).length) return a;
      const out = Object.assign({}, a);
      if (!out.result && !out.finding) { out.result = result; touched = true; }
      if (!Array.isArray(out.offenseResults) || !out.offenseResults.length) {
        out.offenseResults = offenses.map(o => ({ offense: shortSection(o), result: label }));
        touched = touched || out.offenseResults.length > 0;
      }
      return out;
    });
    if (touched) filled.push('ผลรายบุคคล / ผลแยกตามฐานความผิด');
  }

  /* 7.3 ไม่ใช้ความเห็น "รับไว้ไต่สวน" ของสายอนุมัติ (Task 179) — การ์ดไม่อ่าน chainOpinions ของ 7.3 จึงเติมเสมอเมื่อว่าง */
  if (!has(k, 'ownerOpinion') && (is73 || !(k.chainOpinions || []).some(o => o.roleId === 'owner'))) {
    k.ownerOpinion = ownerOpinionFor(k); filled.push('ความเห็นผู้รับผิดชอบสำนวน');
  }

  if (!has(k, 'meetingResolution')) {
    const m = meetingResolutionFor(k);
    if (m) { k.meetingResolution = m; filled.push('มติที่ประชุม'); } else states.meetingResolution = 'NONE';
  }

  if (!has(k, 'witnessProtection')) {
    if (t73 && /WITNESS/.test(t73.code)) {
      k.witnessProtection = { has: true, detail: 'คำขอตามสำนวนนี้', url: '#', mockLink: true };
      filled.push('การคุ้มครองพยาน');
    } else {
      k.witnessProtection = { has: false };
      filled.push('การคุ้มครองพยาน');
    }
  }

  k.fieldStates = states;
  k.prototypeFilled = filled;
  return k;
}

global.ECMISCaseSummaryFill = { apply };

})(window);
