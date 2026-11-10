/* ============================================================
   DEMO CONFIG for the simple 3-feature demo.
   Every value is sample data. Doctors and patients are invented.
   ============================================================ */
window.APP = {
  defaultLang: 'ar',

  brand: {
    name: { ar: 'مجمع الصفا الطبي', en: 'Alsafa Medical Complex' },
    logoIcon: 'assets/brand/icon.png',
    whatsapp: '966538111232',
    email: 'info@alsafaclinic.com',
    website: 'https://alsafaclinic.com/',
    // Direct "write a review" link needs the Google place ID. Until then the button opens the Maps listing.
    googleReviewUrl: null,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=%D9%85%D8%AC%D9%85%D8%B9+%D8%A7%D9%84%D8%B5%D9%81%D8%A7+%D8%A7%D9%84%D8%B7%D8%A8%D9%8A',
    // Branch names and phones from alsafaclinic.com
    branches: [
      { id: 1, name: { ar: 'فرع المنتزه الشرقي', en: 'Al Muntazah branch' }, phone: '0165435556' },
      { id: 2, name: { ar: 'فرع النقرة', en: 'An Naqrah branch' }, phone: '0165435557' }
    ]
  },

  // Reward points: the complex sets every value here.
  rewards: {
    perRating: 100,
    perVisit: 50,
    welcome: 150,
    googleTap: 0,      // no points for the Google button (Google does not allow paid reviews)
    voucherDays: 60,
    prefix: 'SAFA',
    catalog: [
      { id: 'check',  pts: 200, icon: 'activity', title: { ar: 'فحص سكر وضغط مجاني', en: 'Free sugar and blood pressure check' }, note: { ar: 'بدون موعد', en: 'No appointment needed' } },
      { id: 'med50',  pts: 300, icon: 'pill',     title: { ar: 'خصم 50 ريال على الأدوية', en: 'SAR 50 off medicines' }, note: { ar: 'من صيدلية المجمع', en: 'At the complex pharmacy' } },
      { id: 'kit',    pts: 350, icon: 'gift',     title: { ar: 'هدية: حقيبة عناية شخصية', en: 'Gift: personal care kit' }, note: { ar: 'تستلمها من الاستقبال', en: 'Pick it up at reception' } },
      { id: 'lab100', pts: 450, icon: 'flask',    title: { ar: 'خصم 100 ريال على التحاليل', en: 'SAR 100 off lab tests' }, note: { ar: 'في مختبر المجمع', en: 'At the complex lab' } },
      { id: 'dental', pts: 500, icon: 'tooth',    title: { ar: 'خصم 30% على تنظيف الأسنان', en: '30% off a dental cleaning' }, note: { ar: 'في عيادة الأسنان', en: 'At the dental clinic' } },
      { id: 'gp',     pts: 600, icon: 'steth',    title: { ar: 'كشف مجاني في الطب العام', en: 'Free general medicine visit' }, note: { ar: 'في أي فرع', en: 'At either branch' } }
    ]
  },

  patients: [
    { ar: 'محمد السبيعي', en: 'Mohammed Al-Subaie' }, { ar: 'نوف العنزي', en: 'Nouf Al-Anazi' },
    { ar: 'عبدالعزيز الحربي', en: 'Abdulaziz Al-Harbi' }, { ar: 'هيا القحطاني', en: 'Haya Al-Qahtani' },
    { ar: 'سلطان المطيري', en: 'Sultan Al-Mutairi' }, { ar: 'ريما الشمري', en: 'Rima Al-Shammari' },
    { ar: 'فيصل الدوسري', en: 'Faisal Al-Dosari' }, { ar: 'منيرة العتيبي', en: 'Munira Al-Otaibi' },
    { ar: 'تركي الزهراني', en: 'Turki Al-Zahrani' }, { ar: 'لمى الغامدي', en: 'Lama Al-Ghamdi' },
    { ar: 'بندر الرشيدي', en: 'Bandar Al-Rashidi' }, { ar: 'جواهر السهلي', en: 'Jawaher Al-Sahli' },
    { ar: 'ماجد البقمي', en: 'Majed Al-Baqami' }, { ar: 'أروى الخالدي', en: 'Arwa Al-Khalidi' },
    { ar: 'خالد الجهني', en: 'Khalid Al-Juhani' }, { ar: 'شهد العمري', en: 'Shahad Al-Omari' }
  ],

  // The clinics listed on alsafaclinic.com
  specialties: [
    { id: 'general',  color: '#0E9F6E', name: { ar: 'الطب العام', en: 'General medicine' } },
    { id: 'internal', color: '#E5484D', name: { ar: 'الباطنة', en: 'Internal medicine' } },
    { id: 'women',    color: '#C2418E', name: { ar: 'النساء والولادة', en: "Women's health" } },
    { id: 'peds',     color: '#E39B12', name: { ar: 'الأطفال', en: 'Paediatrics' } },
    { id: 'derm',     color: '#7C5CD6', name: { ar: 'البشرة', en: 'Skin care' } },
    { id: 'dental',   color: '#2F6FE4', name: { ar: 'الأسنان', en: 'Dentistry' } }
  ],

  // SAMPLE doctors: alsafaclinic.com does not list its doctors.
  doctors: [
    { id: 'khalid', wd: [0, 2, 3], branch: 1, spec: 'internal',
      name: { ar: 'د. خالد العتيبي', en: 'Dr. Khalid Al-Otaibi' }, title: { ar: 'استشاري الباطنة', en: 'Consultant, internal medicine' } },
    { id: 'noura', wd: [6, 1, 3], branch: 2, spec: 'internal',
      name: { ar: 'د. نورة القحطاني', en: 'Dr. Noura Al-Qahtani' }, title: { ar: 'استشارية الباطنة والسكري', en: 'Consultant, diabetes' } },
    { id: 'fahad', wd: [0, 1, 2, 3, 4, 6], branch: 1, spec: 'peds',
      name: { ar: 'د. فهد الشهري', en: 'Dr. Fahad Al-Shehri' }, title: { ar: 'أخصائي طب الأطفال', en: 'Paediatric specialist' } },
    { id: 'reem', wd: [0, 1, 4], branch: 2, spec: 'women',
      name: { ar: 'د. ريم الدوسري', en: 'Dr. Reem Al-Dosari' }, title: { ar: 'استشارية النساء والولادة', en: 'Consultant obstetrician' } },
    { id: 'sara', wd: [6, 2], branch: 1, spec: 'derm',
      name: { ar: 'د. سارة الحربي', en: 'Dr. Sara Al-Harbi' }, title: { ar: 'أخصائية الجلدية', en: 'Dermatology specialist' } },
    { id: 'abdullah', wd: [1, 3], branch: 2, spec: 'general',
      name: { ar: 'د. عبدالله الزهراني', en: 'Dr. Abdullah Al-Zahrani' }, title: { ar: 'طبيب عام', en: 'General practitioner' } },
    { id: 'majed', wd: [0, 1, 2, 3, 4, 6], branch: 1, spec: 'dental',
      name: { ar: 'د. ماجد السبيعي', en: 'Dr. Majed Al-Subaie' }, title: { ar: 'أخصائي الأسنان', en: 'Dental specialist' } }
  ],

  // Sample notes for the seeded ratings in the staff view
  sampleNotes: [
    { s: 5, tags: ['doctor'], ar: 'الدكتور فهد كان صبور جداً مع ولدي، وشرح لنا كل شيء.', en: 'Dr Fahad was very patient with my son and explained everything.' },
    { s: 5, tags: ['reception', 'clean'], ar: 'استقبال راقي والمكان نظيف.', en: 'Friendly reception and a clean place.' },
    { s: 4, tags: ['booking'], ar: 'الحجز سهل، ياليت يكون فيه تذكير على الواتساب.', en: 'Booking was easy. A WhatsApp reminder would help.' },
    { s: 2, tags: ['wait'], ar: 'انتظرت أكثر من ساعة بعد موعدي في عيادة الأسنان.', en: 'I waited over an hour past my time at the dental clinic.' },
    { s: 5, tags: ['doctor'], ar: 'د. ريم ممتازة وتسمع للمريض.', en: 'Dr Reem is excellent and really listens.' },
    { s: 3, tags: ['parking'], ar: 'المواقف قليلة في الفترة المسائية.', en: 'Not enough parking in the evening.' },
    { s: 4, tags: ['doctor', 'wait'], ar: 'الطبيب ممتاز بس الانتظار طويل شوي.', en: 'Great doctor, the wait was a bit long.' },
    { s: 5, tags: [], ar: '', en: '' },
    { s: 1, tags: ['wait'], ar: 'نتيجة التحليل تأخرت يومين.', en: 'My lab result came two days late.' },
    { s: 5, tags: ['clean'], ar: '', en: '' }
  ]
};
