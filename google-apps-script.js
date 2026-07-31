/**
 * SUKOON REGISTRATION — Google Apps Script Backend (v2)
 * Wisdom Youth Organisation, Thrissur District Committee
 *
 * HOW TO DEPLOY:
 * 1. Open https://script.google.com and create a new project
 * 2. Paste all of this code
 * 3. Update SPREADSHEET_ID with your Google Sheet's ID
 * 4. Click Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL into app.js → CONFIG.SHEET_URL
 */

const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// Column headers for the Registrations sheet
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
  'Willing To Donate',
  'Donation Amount (₹)'
];

// ─────────────────────────────────────────────────────────
//  POST — Save a registration
// ─────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const p = e.parameter;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let sheet = ss.getSheetByName('Registrations');
    if (!sheet) {
      sheet = ss.insertSheet('Registrations');
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
      // Style header row
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
      p.want_to_donate || 'No',
      Number(p.donation_amount || 0),
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─────────────────────────────────────────────────────────
//  GET — Return stats or all rows
// ─────────────────────────────────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'stats';
  try {
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
        want_to_donate:       String(r[16] || 'No'),
        donation_amount:      Number(r[17] || 0),
      }));
      return jsonResponse({ rows });
    }

    // Build stats
    const total   = data.length;
    let married = 0, single = 0, spouseCount = 0;
    let childrenCount = 0, ageBelow5 = 0, age5to10 = 0, age11to18 = 0;
    let totalDonation = 0;
    const zones = {}, units = {}, designations = {};
    let totalAttendees = 0;

    data.forEach(r => {
      const marital  = String(r[10]);
      const zone     = String(r[6]);
      const unit     = String(r[7]);
      const desig    = String(r[9]);
      const spouseNA  = String(r[13]);
      const donAmt   = parseFloat(r[17] || 0);

      if (marital === 'Married') { married++; } else { single++; }

      // Total Donation sum
      if (!isNaN(donAmt) && donAmt > 0) {
        totalDonation += donAmt;
      }

      // Zone count
      zones[zone] = (zones[zone] || 0) + 1;

      // Unit count
      if (unit) units[unit] = (units[unit] || 0) + 1;

      // Designation count
      if (desig) designations[desig] = (designations[desig] || 0) + 1;

      // Attendees: self = 1
      let personAttendees = 1;

      // Spouse attending?
      if (marital === 'Married' && spouseNA !== 'Yes') {
        spouseCount++;
        personAttendees++;
      }

      // Children
      try {
        const children = JSON.parse(String(r[14]) || '[]');
        children.forEach(c => {
          if (!c.not_attending) {
            const age = parseInt(c.age, 10);
            childrenCount++;
            personAttendees++;
            if (!isNaN(age)) {
              if (age < 5)        ageBelow5++;
              else if (age <= 10) age5to10++;
              else if (age <= 18) age11to18++;
            }
          }
        });
      } catch {}

      totalAttendees += personAttendees;
    });

    return jsonResponse({
      total, married, single, totalAttendees,
      spouseCount, childrenCount,
      ageBelow5, age5to10, age11to18,
      totalDonation,
      zones, units, designations,
    });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function emptyStats() {
  return { total:0, married:0, single:0, totalAttendees:0,
           spouseCount:0, childrenCount:0, ageBelow5:0, age5to10:0, age11to18:0,
           totalDonation:0,
           zones:{}, units:{}, designations:{} };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
