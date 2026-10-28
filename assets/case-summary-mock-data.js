/* ข้อมูลจำลองของหน้าจอ Mock การ์ดสรุปสำนวน (approval-review-mock-01..06.html) — ไม่ใช่ข้อมูลจริง ไม่บันทึกลงฐานข้อมูล
   3 ประเภทเคส × 2 สถานะ (ยังไม่ครบ / ครบ) — สองสถานะของเคสเดียวกันใช้เลขสำนวน Mock เดียวกัน
   เลขสำนวน Mock รันต่อจากเลขสูงสุดของปีเดียวกันที่พบทั้งในโค้ดและในตาราง tbl_cmp_case (ตรวจ 22 ต.ค. 2569):
     ปี 2569 สูงสุด 9942/2569 → 9943/2569 (7.3), 9944/2569 (213) · ปี 2566 สูงสุด 1465/2566 → 1466/2566 (644)
   "ยังไม่ครบ" = ข้อมูลเท่าที่เคสอ้างอิงมีอยู่เดิม (9409/2569, 9207/2569, 1177/2566) · "ครบ" = เติมข้อมูลจำลองทุกช่อง
   mockDaysElapsed เป็นค่าจำลองนับถึง 22 ต.ค. 2569 — ระบบจริงต้องคำนวณอัตโนมัติจากวันที่รับเรื่อง */
(function (global) {
'use strict';

const CASES = {
  '73': {
    label: 'เรื่องทั่วไป 7.3', refNo: '9409/2569',
    files: { partial: 'approval-review-mock-01.html', full: 'approval-review-mock-02.html' },
    partial: {
      id: '9943/2569', procType: '7.3', docType: 'GENERAL', generalType: 'WITNESS_PROTECTION',
      subject: 'ขออนุมัติมาตรการคุ้มครองพยานบุคคลและครอบครัวในคดีทุจริตจัดซื้อจัดจ้างโครงการก่อสร้างขนาดใหญ่ ตามมาตรา ๕๔ (กิจกรรม 7.3)',
      legalBase: 'ระเบียบฯ',
      owner: 'กลุ่มงานคุ้มครองพยานและสิทธิประโยชน์', ownerOrg: 'กองปราบปรามการทุจริตในภาครัฐ 1',
      accused: [],
      allegation: 'พยานบุคคลสำคัญถูกข่มขู่คุกคามสวัสดิภาพและความปลอดภัยจากการให้ถ้อยคำในคดีจัดซื้อจัดจ้าง เข้าเกณฑ์ตามมาตรา ๕๔ แห่ง พ.ร.บ. มาตรการของฝ่ายบริหารฯ จึงเสนอขออนุมัติมาตรการคุ้มครองความปลอดภัยขั้นพิเศษ',
      receivedDate: '2569-05-20', mockDaysElapsed: 155
    },
    full: {
      intakeChannel: 'เสนอตามภารกิจจากกิจกรรมที่ 6 (คุ้มครองพยาน)',
      legalBase: 'ม.๕๔ พ.ร.บ. มาตรการของฝ่ายบริหารในการป้องกันและปราบปรามการทุจริต',
      ownerOpinion: 'ประเมินระดับความเสี่ยงของพยานแล้วอยู่ในระดับสูง เห็นควรอนุมัติมาตรการคุ้มครองความปลอดภัยขั้นพิเศษแก่พยานและครอบครัว',
      witnessProtection: { has: true, caseNo: 'คพ. 37/2569', detail: 'พยานบุคคล 1 ราย และครอบครัว 3 ราย', url: '#', mockLink: true },
      /* คำขอคุ้มครองพยานไม่ใช่การกล่าวหาความผิด — ฐานความผิด/ผู้ถูกกล่าวหาไม่เกี่ยวข้อง · ยังไม่เคยเข้าที่ประชุม */
      fieldStates: { offenses: 'NA', accused: 'NA', meetingResolution: 'NONE' }
    }
  },
  '213': {
    label: 'ไต่สวน 213', refNo: '9207/2569',
    files: { partial: 'approval-review-mock-03.html', full: 'approval-review-mock-04.html' },
    partial: {
      id: '9944/2569', procType: '7.1', docType: '213',
      subject: 'กล่าวหาเจ้าหน้าที่สำนักงานขนส่งจังหวัดแห่งหนึ่ง เรียกรับเงินเพื่ออำนวยความสะดวกในการออกใบอนุญาตขับขี่',
      legalBase: 'ม.62',
      owner: 'นายธีรพงษ์ ซื่อสัตย์', ownerOrg: 'สำนักงานคณะกรรมการป้องกันและปราบปรามการทุจริตในภาครัฐ เขต 5',
      accused: [{ no: 1, name: 'นายสมพงษ์ เร่งงาน', pos: 'นายทะเบียนใบอนุญาตขับรถ', agency: 'สำนักงานขนส่งจังหวัดแห่งหนึ่ง' }],
      allegation: 'เรียกรับเงินจากประชาชนผู้มาติดต่อขอรับใบอนุญาตขับรถเพื่อแลกกับการอำนวยความสะดวกและลัดคิว',
      receivedDate: '2569-07-20', deadline60: '2569-09-18', deadline2y: '2571-07-20', mockDaysElapsed: 94
    },
    full: {
      intakeChannel: 'HOTLINE_1206',
      offenses: [
        { section: 'ม.149 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานเรียกรับทรัพย์สินเพื่อกระทำการในตำแหน่ง' },
        { section: 'ม.157 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานปฏิบัติหน้าที่โดยมิชอบ' }
      ],
      accused: [
        { no: 1, name: 'นายสมพงษ์ เร่งงาน', pos: 'นายทะเบียนใบอนุญาตขับรถ', agency: 'สำนักงานขนส่งจังหวัดแห่งหนึ่ง', result: 'MERIT',
          offenseResults: [{ offense: 'ม.149', result: 'มีมูล' }, { offense: 'ม.157', result: 'มีมูล' }] },
        { no: 2, name: 'นางสาวปราณี ช่วยงาน', pos: 'เจ้าพนักงานธุรการชำนาญงาน', agency: 'สำนักงานขนส่งจังหวัดแห่งหนึ่ง', result: 'NO_MERIT',
          offenseResults: [{ offense: 'ม.149', result: 'ไม่มีมูล', note: 'ไม่ปรากฏพยานหลักฐานว่ารับเงิน' }, { offense: 'ม.157', result: 'ไม่มีมูล' }] }
      ],
      ownerOpinion: 'เห็นควรรับไว้ไต่สวนเฉพาะผู้ถูกกล่าวหาที่ 1 ตามฐานความผิด ม.149 และ ม.157 ส่วนผู้ถูกกล่าวหาที่ 2 ข้อกล่าวหาไม่มีมูล',
      witnessProtection: { has: false },
      fieldStates: { meetingResolution: 'NONE' }
    }
  },
  '644': {
    label: 'วินิจฉัยชี้มูล 644', refNo: '1177/2566',
    files: { partial: 'approval-review-mock-05.html', full: 'approval-review-mock-06.html' },
    partial: {
      id: '1466/2566', procType: '7.2', docType: '644', round72: 1,
      subject: 'รายงานผลการไต่สวนเพื่อวินิจฉัยชี้มูล กรณีเจ้าหน้าที่กรมสรรพากรแห่งหนึ่ง เรียกรับสินบนก่อนคดีขาดอายุความ',
      legalBase: 'ม.18/4',
      owner: 'นายฉัตรชัย ตรวจการ', ownerOrg: 'สำนักงานคณะกรรมการป้องกันและปราบปรามการทุจริตในภาครัฐ เขต 2',
      accused: [{ no: 1, name: 'นายสมพงษ์ สรรพากรดี', pos: 'นักตรวจสอบภาษีชำนาญการ', agency: 'สนง.สรรพากรพื้นที่' }],
      allegation: 'เรียกรับเงินจากผู้ประกอบการเพื่อแลกกับการลดยอดประเมินภาษี คดีใกล้ครบกำหนดอายุความ เห็นควรเสนอขอวาระด่วน',
      receivedDate: '2569-06-12', prescription: '2569-09-20', mockDaysElapsed: 132
    },
    full: {
      intakeChannel: 'WEBSITE',
      offenses: [
        { section: 'ม.149 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานเรียกรับทรัพย์สินเพื่อกระทำการในตำแหน่ง' },
        { section: 'ม.157 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานปฏิบัติหน้าที่โดยมิชอบ' },
        { section: 'ม.85 พ.ร.บ. ระเบียบข้าราชการพลเรือน', name: 'ทุจริตต่อหน้าที่ราชการ (วินัยอย่างร้ายแรง)' }
      ],
      accused: [
        { no: 1, name: 'นายสมพงษ์ สรรพากรดี', pos: 'นักตรวจสอบภาษีชำนาญการ', agency: 'สนง.สรรพากรพื้นที่', result: 'INDICT',
          offenseResults: [{ offense: 'ม.149', result: 'ชี้มูล' }, { offense: 'ม.157', result: 'ชี้มูล' }, { offense: 'ม.85 (วินัย)', result: 'ชี้มูล' }] },
        { no: 2, name: 'นางสาวกนกวรรณ ภาษีงาม', pos: 'นักวิชาการภาษีปฏิบัติการ', agency: 'สนง.สรรพากรพื้นที่', result: 'NO_INDICT',
          offenseResults: [{ offense: 'ม.149', result: 'ไม่ชี้มูล', note: 'ข้อกล่าวหาไม่มีมูล' }, { offense: 'ม.85 (วินัย)', result: 'ไม่ชี้มูล' }] }
      ],
      ownerOpinion: 'เห็นควรชี้มูลความผิดผู้ถูกกล่าวหาที่ 1 ทั้งทางอาญาและวินัยอย่างร้ายแรง ส่วนผู้ถูกกล่าวหาที่ 2 ข้อกล่าวหาไม่มีมูลให้ตกไป',
      meetingResolution: 'การประชุมคณะกรรมการ ป.ป.ท. ครั้งที่ 12/2566 — มีมติรับไว้ไต่สวนตาม ม.24 วรรคหนึ่ง (ชั้นไต่สวนเบื้องต้น)',
      witnessProtection: { has: true, caseNo: 'คพ. 21/2567', detail: 'พยานผู้ประกอบการ 1 ราย', url: '#', mockLink: true }
    }
  }
};

const STATE_LABEL = { partial: 'ข้อมูลยังมาไม่ครบ', full: 'ข้อมูลมาครบ' };

/* สร้างสำนวนจำลองของสถานะที่เลือก — "ครบ" = ข้อมูลเดิมของสถานะ "ยังไม่ครบ" + ข้อมูลที่เติม */
function buildCase(type, state) {
  const c = CASES[type];
  if (!c) return null;
  const base = JSON.parse(JSON.stringify(c.partial));
  const kase = state === 'full' ? Object.assign(base, JSON.parse(JSON.stringify(c.full))) : base;
  kase.isMock = true;
  return kase;
}

/* ---------- สถานการณ์การ์ดความเห็นของเลขาฯ (กล่องเร่งด่วน / ซับซ้อน / เส้นทางเมื่อลงนาม) ----------
   เคสใหม่รันเลขต่อจากเลขสูงสุดปี 2569 (9944/2569 ของหน้า Mock เดิม · ฐานข้อมูลสูงสุด 9942/2569 · ตรวจ 22 ต.ค. 2569)
   "รอบที่ 2" คือเคส 9944/2569 เดิมในสถานะถัดไป (คณะอนุฯ สนับสนุนส่งความเห็นกลับแล้ว) จึงใช้เลขเดิม */
const ACCEPT_CHAIN = (dates) => [
  { roleId: 'owner', type: 'ACCEPT', note: 'พิจารณาสำนวนแล้วเห็นว่าเข้าหลักเกณฑ์รับไว้ดำเนินการ เห็นควรเสนอตามลำดับชั้น', date: dates[0] },
  { roleId: 'section_head', type: 'ACCEPT', note: 'ตรวจสอบสำนวนแล้วเห็นพ้องกับผู้รับผิดชอบสำนวน เห็นควรเสนอผู้บังคับบัญชาลำดับถัดไป', date: dates[1] },
  { roleId: 'director', type: 'ACCEPT', note: 'พิจารณาแล้วเห็นชอบตามที่เสนอ เห็นควรเสนอลำดับชั้นถัดไป', date: dates[2] },
  { roleId: 'deputy', type: 'ACCEPT', note: 'ตรวจสอบสำนวนแล้วเห็นชอบตามที่เสนอ เห็นควรนำเสนอเลขาธิการฯ พิจารณา', date: dates[3] }
];
const SCENARIOS = {
  kong71: {
    label: '7.1 กองปราบ', refNo: '1420/2569', file: 'approval-review-mock-07.html',
    data: {
      id: '9945/2569', procType: '7.1', docType: '213',
      subject: 'กล่าวหาเจ้าหน้าที่ฝ่ายปกครองอำเภอแห่งหนึ่ง ออกบัตรประจำตัวประชาชนโดยมิชอบด้วยกฎหมาย',
      legalBase: 'ม.18/4', owner: 'นายวรพล ตรวจสอบ', ownerOrg: 'กองปราบปรามการทุจริตในภาครัฐ 2',
      complainant: 'สำนักทะเบียนอำเภอ (ตรวจพบ)',
      allegation: 'เพิ่มชื่อและทำรายการออกบัตรประจำตัวประชาชนให้แก่บุคคลต่างด้าวโดยมิชอบด้วยระเบียบและกฎหมาย',
      receivedDate: '2569-07-16', deadline60: '2569-09-14', deadline2y: '2571-07-16', mockDaysElapsed: 98,
      intakeChannel: 'หนังสือจากหน่วยงาน',
      offenses: [
        { section: 'ม.157 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานปฏิบัติหน้าที่โดยมิชอบ' },
        { section: 'ม.162 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานรับรองเป็นหลักฐานเท็จ' }
      ],
      accused: [{ no: 1, name: 'นายบุญส่ง ทะเบียนดี', pos: 'เจ้าหน้าที่ปกครองชำนาญงาน', agency: 'ที่ว่าการอำเภอแห่งหนึ่ง', result: 'MERIT',
        offenseResults: [{ offense: 'ม.157', result: 'มีมูล' }, { offense: 'ม.162', result: 'มีมูล' }] }],
      ownerOpinion: 'เห็นควรรับไว้ไต่สวน — ข้อกล่าวหามีมูลตามฐานความผิด ม.157 และ ม.162',
      witnessProtection: { has: false }, fieldStates: { meetingResolution: 'NONE' },
      chainOpinions: ACCEPT_CHAIN(['2569-07-26', '2569-08-01', '2569-08-08', '2569-08-15'])
    }
  },
  urgent: {
    label: 'มีใบด่วนแนบ', refNo: '9202/2569', file: 'approval-review-mock-08.html',
    data: {
      id: '9946/2569', procType: '7.1', docType: '213',
      subject: 'กล่าวหาเจ้าหน้าที่กรมทางหลวงชนบทแห่งหนึ่ง เร่งรัดเบิกจ่ายเงินงบประมาณก่อสร้างถนนก่อนตรวจรับงานจริง ใกล้ขาดอายุความ',
      legalBase: 'ม.18/4', owner: 'นางสาวปรียา ตั้งมั่น', ownerOrg: 'สำนักงานคณะกรรมการป้องกันและปราบปรามการทุจริตในภาครัฐ เขต 2',
      complainant: 'ผู้ตรวจสอบภายในหน่วยงาน (ผู้ร้อง)',
      allegation: 'อนุมัติเบิกจ่ายเงินงบประมาณโครงการก่อสร้างถนนทั้งที่งานยังไม่แล้วเสร็จตามสัญญา คดีใกล้ครบกำหนดอายุความ',
      receivedDate: '2569-06-01', deadline60: '2569-07-31', deadline2y: '2571-06-01', mockDaysElapsed: 143,
      urgent: true, urgentReason: 'คดีใกล้ครบกำหนดอายุความภายใน 34 วัน เห็นควรเสนอเร่งรัดพิจารณา',
      intakeChannel: 'WEBSITE',
      offenses: [
        { section: 'ม.151 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานใช้อำนาจในตำแหน่งโดยทุจริตในการจัดการทรัพย์' },
        { section: 'ม.157 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานปฏิบัติหน้าที่โดยมิชอบ' }
      ],
      accused: [{ no: 1, name: 'นายวิรัตน์ เร่งรัด', pos: 'ผู้อำนวยการแขวงทางหลวงชนบท', agency: 'กรมทางหลวงชนบทแห่งหนึ่ง', result: 'MERIT',
        offenseResults: [{ offense: 'ม.151', result: 'มีมูล' }, { offense: 'ม.157', result: 'มีมูล' }] }],
      ownerOpinion: 'เห็นควรรับไว้ไต่สวนและเสนอบรรจุวาระด่วน เนื่องจากคดีใกล้ครบกำหนดอายุความ',
      witnessProtection: { has: false }, fieldStates: { meetingResolution: 'NONE' },
      chainOpinions: ACCEPT_CHAIN(['2569-06-11', '2569-06-17', '2569-06-24', '2569-07-01'])
    }
  },
  diverged: {
    label: 'ความเห็นไม่ตรงกัน', refNo: '9204/2569', file: 'approval-review-mock-09.html',
    data: {
      id: '9947/2569', procType: '7.2', docType: '644', round72: 1,
      subject: 'รายงานการไต่สวนข้อเท็จจริงเพื่อวินิจฉัยชี้มูล กรณีเจ้าหน้าที่คลังจังหวัดแห่งหนึ่ง ยักยอกเงินภาษี',
      legalBase: 'ม.24 วรรคท้าย', owner: 'นายวรพล ตรวจสอบ (เจ้าพนักงานป้องกันการทุจริตชำนาญการ)', ownerOrg: 'กองปราบปรามการทุจริตในภาครัฐ 2',
      complainant: 'สำนักงานคลังจังหวัด (ผู้ร้อง)',
      allegation: 'ยักยอกเงินภาษีที่จัดเก็บได้ไปใช้ประโยชน์ส่วนตัวต่อเนื่องหลายเดือน',
      receivedDate: '2569-03-05', prescription: '2570-03-05', mockDaysElapsed: 231,
      intakeChannel: 'หนังสือจากหน่วยงาน',
      offenses: [
        { section: 'ม.147 ประมวลกฎหมายอาญา', name: 'เจ้าพนักงานเบียดบังทรัพย์' },
        { section: 'ม.85 พ.ร.บ. ระเบียบข้าราชการพลเรือน', name: 'ทุจริตต่อหน้าที่ราชการ (วินัยอย่างร้ายแรง)' }
      ],
      accused: [{ no: 1, name: 'นางสาวจิราพร เก็บเงิน', pos: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', agency: 'สำนักงานคลังจังหวัดแห่งหนึ่ง', result: 'INDICT',
        offenseResults: [{ offense: 'ม.147', result: 'ชี้มูล' }, { offense: 'ม.85 (วินัย)', result: 'ชี้มูล' }] }],
      ownerOpinion: 'เห็นควรชี้มูลความผิดทั้งทางอาญาและวินัยอย่างร้ายแรง',
      meetingResolution: 'มีมติรับไว้ไต่สวน (ชั้นไต่สวนเบื้องต้น) ก่อนเข้าสู่ชั้นวินิจฉัยชี้มูล',
      witnessProtection: { has: false },
      /* ความเห็นในสายบังคับบัญชาไม่ตรงกัน: หัวหน้ากลุ่มงานเห็นควรแสวงหาข้อเท็จจริงเพิ่มเติม (MORE) ต่างจากชั้นอื่น (ACCEPT) */
      chainOpinions: [
        { roleId: 'owner', type: 'ACCEPT', note: 'พิจารณาสำนวนแล้วเห็นควรชี้มูลความผิดตามรายงาน', date: '2569-03-15' },
        { roleId: 'section_head', type: 'MORE', note: 'ยอดเงินที่ถูกยักยอกยังตรวจสอบไม่ครบทุกเดือน เห็นควรแสวงหาข้อเท็จจริงเพิ่มเติมก่อน', date: '2569-03-21' },
        { roleId: 'director', type: 'ACCEPT', note: 'พิจารณาแล้วเห็นชอบตามผู้รับผิดชอบสำนวน เห็นควรเสนอลำดับชั้นถัดไป', date: '2569-03-28' },
        { roleId: 'deputy', type: 'ACCEPT', note: 'ตรวจสอบสำนวนแล้วเห็นชอบตามที่เสนอ เห็นควรนำเสนอเลขาธิการฯ พิจารณา', date: '2569-04-04' }
      ]
    }
  },
  round2: {
    label: 'รอบที่ 2', refNo: '9207/2569', file: 'approval-review-mock-10.html',
    /* เคส 9944/2569 (7.1 เขต) หลังคณะอนุฯ สนับสนุนส่งความเห็นกลับ — ข้อมูลครบเหมือนหน้า approval-review-mock-04 + ผลกลั่นกรอง */
    base: { type: '213', state: 'full' },
    overrides: {
      supportTeam: 'TEAM1', supportSubTeam: 'คณะที่ 1', supportControlNo: 'ทค.12/2569', supportDecision: 'AGREE',
      supportOpinion: 'กลั่นกรองแล้วเห็นพ้องกับความเห็นของผู้รับผิดชอบสำนวน เห็นควรรับไว้ไต่สวนเฉพาะผู้ถูกกล่าวหาที่ 1',
      chainOpinions: ACCEPT_CHAIN(['2569-07-30', '2569-08-05', '2569-08-12', '2569-08-19'])
    }
  }
};

/* ตัวอย่างการ์ดความเห็นของเลขาฯ ครบทุกแบบ — แต่ละรายการชี้ไปหน้า Mock ที่ใช้ดู */
const OPINION_EXAMPLES = [
  { key: 'kong71', label: '7.1 กองปราบ', file: SCENARIOS.kong71.file },
  { key: 'khet71', label: '7.1 เขต', file: CASES['213'].files.full },
  { key: 'r72', label: '7.2', file: CASES['644'].files.full },
  { key: 'r73', label: '7.3', file: CASES['73'].files.full },
  { key: 'urgent', label: 'มีใบด่วนแนบ', file: SCENARIOS.urgent.file },
  { key: 'diverged', label: 'ความเห็นไม่ตรงกัน', file: SCENARIOS.diverged.file },
  { key: 'round2', label: 'รอบที่ 2', file: SCENARIOS.round2.file }
];

function buildScenario(key) {
  const sc = SCENARIOS[key];
  if (!sc) return null;
  const kase = sc.base ? buildCase(sc.base.type, sc.base.state) : JSON.parse(JSON.stringify(sc.data));
  if (sc.overrides) Object.assign(kase, JSON.parse(JSON.stringify(sc.overrides)));
  kase.isMock = true;
  return kase;
}

global.ECMISCaseSummaryMocks = { CASES, STATE_LABEL, buildCase, SCENARIOS, OPINION_EXAMPLES, buildScenario };

})(window);
