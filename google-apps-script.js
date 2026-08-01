/**
 * SUKOON REGISTRATION — Google Apps Script Backend (v6 Meal Multiplier)
 * Wisdom Youth Organisation, Thrissur District Committee
 */

const SPREADSHEET_ID = '19RhyFN5f43Z2cDlWRf0--93EecH2-L349Qm1gGfY_0A';

const HEADERS = [
  'Timestamp', 'Name',
  'Mobile Code', 'Mobile',
  'WhatsApp Code', 'WhatsApp',
  'Zone', 'Unit',
  'Designation Level', 'Designation',
  'Marital Status',
  'Spouse Name', 'Spouse Mobile', 'Spouse Not Attending',
  'Children (JSON)',
  'Reason Not Coming',
  'Lunch Needed',
  'Willing To Donate',
  'Donation Amount (₹)'
];

function saveRegistration(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName('Registrations');
  if (!sheet) {
    sheet = ss.insertSheet('Registrations');
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
    hRange.setBackground('#0077b6');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
  }

  const row = [
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    p.name        || '',
    p.mobile_code || '+91',
    p.mobile      || '',
    p.whatsapp_code || '+91',
    p.whatsapp    || '',
    p.zone        || '',
    p.unit        || '',
    p.designation_level || '',
    p.designation || '',
    p.marital_status || '',
    p.spouse_name || '',
    p.spouse_mobile || '',
    p.spouse_not_attending || 'No',
    p.children    || '[]',
    p.reason_not_coming || '',
    p.need_lunch  || 'No',
    p.want_to_donate || 'No',
    Number(p.donation_amount || 0),
  ];

  sheet.appendRow(row);
  return { success: true };
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const res = saveRegistration(p);
    return jsonResponse(res);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'stats';

  try {
    if (action === 'submit' || p.name) {
      const res = saveRegistration(p);
      return jsonResponse(res);
    }

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Registrations');

    if (!sheet || sheet.getLastRow() < 2) {
      if (action === 'all') return jsonResponse({ rows: [] });
      return jsonResponse(emptyStats());
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();

    if (action === 'all') {
      const rows = data.map(r => ({
        timestamp:            String(r[0]),
        name:                 String(r[1]),
        mobile_code:          String(r[2]),
        mobile:               String(r[3]),
        whatsapp_code:        String(r[4]),
        whatsapp:             String(r[5]),
        zone:                 String(r[6]),
        unit:                 String(r[7]),
        designation_level:    String(r[8]),
        designation:          String(r[9]),
        marital_status:       String(r[10]),
        spouse_name:          String(r[11]),
        spouse_mobile:        String(r[12]),
        spouse_not_attending: String(r[13]),
        children:             String(r[14]),
        reason_not_coming:    String(r[15]),
        need_lunch:           String(r[16] || 'No'),
        want_to_donate:       String(r[17] || 'No'),
        donation_amount:      Number(r[18] || 0),
      }));
      return jsonResponse({ rows });
    }

    const total = data.length;
    let married = 0, single = 0, spouseCount = 0;
    let childrenCount = 0, ageBelow5 = 0, age5to10 = 0, age11to18 = 0;
    let lunchCount = 0, totalDonation = 0;
    const zones = {}, units = {}, designations = {};
    let totalAttendees = 0;

    data.forEach(r => {
      const marital  = String(r[10]);
      const zone     = String(r[6]);
      const unit     = String(r[7]);
      const desig    = String(r[9]);
      const spouseNA = String(r[13]);
      const lunch    = String(r[16] || 'No');
      const donAmt   = parseFloat(r[18] || 0);

      if (marital === 'Married') { married++; } else { single++; }
      if (!isNaN(donAmt) && donAmt > 0) { totalDonation += donAmt; }

      let personSpouse = 0;
      if (marital === 'Married' && spouseNA !== 'Yes') {
        spouseCount++;
        personSpouse = 1;
      }

      let personChildren = 0;
      try {
        const children = JSON.parse(String(r[14]) || '[]');
        children.forEach(c => {
          if (!c.not_attending) {
            personChildren++;
            const age = parseInt(c.age, 10);
            if (!isNaN(age)) {
              if (age < 5)        ageBelow5++;
              else if (age <= 10) age5to10++;
              else if (age <= 18) age11to18++;
            }
          }
        });
      } catch {}

      const personTotal = 1 + personSpouse + personChildren;
      totalAttendees += personTotal;

      // If lunch is requested, add personTotal meals for this family!
      if (lunch === 'Yes') {
        lunchCount += personTotal;
      }

      if (zone) {
        if (!zones[zone]) { zones[zone] = { youth: 0, spouses: 0, children: 0, total: 0 }; }
        zones[zone].youth += 1;
        zones[zone].spouses += personSpouse;
        zones[zone].children += personChildren;
        zones[zone].total += personTotal;
      }

      if (unit) {
        if (!units[unit]) { units[unit] = { youth: 0, spouses: 0, children: 0, total: 0 }; }
        units[unit].youth += 1;
        units[unit].spouses += personSpouse;
        units[unit].children += personChildren;
        units[unit].total += personTotal;
      }

      if (desig) designations[desig] = (designations[desig] || 0) + 1;
    });

    return jsonResponse({
      total, married, single, totalAttendees,
      spouseCount, childrenCount,
      ageBelow5, age5to10, age11to18,
      lunchCount, totalDonation,
      zones, units, designations,
    });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function emptyStats() {
  return { total:0, married:0, single:0, totalAttendees:0,
           spouseCount:0, childrenCount:0, ageBelow5:0, age5to10:0, age11to18:0,
           lunchCount:0, totalDonation:0,
           zones:{}, units:{}, designations:{} };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
