# Sukoon Registration PWA - Implementation Plan

## Form Fields (based on reference site, adapted for Thrissur District)
- Full Name
- Mobile Number (with country code)
- WhatsApp Number (with "same as mobile" toggle)
- Zone (Thrissur District zones)
- Unit (dependent dropdown based on selected zone)
- Travel Preference
- Marital Status → if Married: Spouse Name, Spouse Mobile, Children (dynamic add/remove with name, age, sex)
- Reason if family not attending (textarea)

## Files to Create
1. index.html - Main one-page PWA
2. style.css - Premium dark/glassmorphism styling
3. app.js - Form logic, zone/unit dependency, Google Sheets submission, admin panel
4. manifest.json - PWA manifest
5. sw.js - Service worker for PWA
6. icons/ - PWA icons

## Architecture
- Google Sheets via Apps Script Web App URL (user to provide)
- Admin panel: password-protected section showing count stats
- Zone → Unit mapping for Thrissur District Committee
