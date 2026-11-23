import React, { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'English' | 'हिन्दी' | 'తెలుగు';

export const LANGUAGE_OPTIONS: Language[] = ['English', 'हिन्दी', 'తెలుగు'];

type Translation = { hi: string; te: string };

// UI and catalog translations live here so every page uses the same vocabulary.
const translations: Record<string, Translation> = {
  'YOUR SPACE': { hi: 'आपका क्षेत्र', te: 'మీ విభాగం' },
  ACCOUNT: { hi: 'खाता', te: 'ఖాతా' },
  Dashboard: { hi: 'डैशबोर्ड', te: 'డ్యాష్‌బోర్డ్' },
  'Discover Schemes': { hi: 'योजनाएँ खोजें', te: 'పథకాలను కనుగొనండి' },
  'Eligibility Checker': { hi: 'पात्रता जाँच', te: 'అర్హత తనిఖీ' },
  'Document Assistant': { hi: 'दस्तावेज़ सहायक', te: 'పత్రాల సహాయకుడు' },
  'My Applications': { hi: 'मेरे आवेदन', te: 'నా దరఖాస్తులు' },
  'AI Assistant': { hi: 'AI सहायक', te: 'AI సహాయకుడు' },
  'My profile': { hi: 'मेरी प्रोफ़ाइल', te: 'నా ప్రొఫైల్' },
  'My workspace': { hi: 'मेरा कार्यक्षेत्र', te: 'నా కార్యస్థలం' },
  'BENEFITS, MADE CLEARER': { hi: 'लाभों की आसान जानकारी', te: 'ప్రయోజనాలపై స్పష్టమైన సమాచారం' },
  'Your information stays yours': { hi: 'आपकी जानकारी आपके नियंत्रण में', te: 'మీ సమాచారం మీ నియంత్రణలోనే ఉంటుంది' },
  'We never ask for passwords, OTPs or bank details.': { hi: 'हम पासवर्ड, OTP या बैंक विवरण कभी नहीं माँगते।', te: 'మేము పాస్‌వర్డ్‌లు, OTPలు లేదా బ్యాంక్ వివరాలు అడగము.' },
  Notifications: { hi: 'सूचनाएँ', te: 'నోటిఫికేషన్‌లు' },
  'YOUR PERSONAL BENEFITS GUIDE': { hi: 'आपके लिए सरकारी लाभ मार्गदर्शिका', te: 'మీ వ్యక్తిగత ప్రభుత్వ ప్రయోజనాల మార్గదర్శి' },
  'Guidance that gets you closer to support.': { hi: 'सहायता पाने की दिशा में स्पष्ट मार्गदर्शन।', te: 'సహాయం పొందేందుకు స్పష్టమైన మార్గదర్శకం.' },
  'Discover government schemes, understand where you stand, and take your next step with confidence.': { hi: 'सरकारी योजनाएँ खोजें, अपनी पात्रता समझें और आत्मविश्वास से अगला कदम उठाएँ।', te: 'ప్రభుత్వ పథకాలను తెలుసుకోండి, మీ అర్హతను అర్థం చేసుకుని ధైర్యంగా తదుపరి అడుగు వేయండి.' },
  'Explore schemes': { hi: 'योजनाएँ देखें', te: 'పథకాలను చూడండి' },
  'Official sources': { hi: 'आधिकारिक स्रोत', te: 'అధికారిక మూలాలు' },
  'Clear eligibility': { hi: 'स्पष्ट पात्रता', te: 'స్పష్టమైన అర్హత' },
  'Your language': { hi: 'आपकी भाषा', te: 'మీ భాష' },
  'Support, made simpler': { hi: 'सहायता अब आसान', te: 'సహాయం మరింత సులభం' },
  'One clear next step at a time': { hi: 'हर बार एक स्पष्ट अगला कदम', te: 'ఒక్కోసారి ఒక స్పష్టమైన తదుపరి అడుగు' },
  'Good': { hi: 'शुभ', te: 'శుభ' },
  morning: { hi: 'सुबह', te: 'ఉదయం' },
  afternoon: { hi: 'दोपहर', te: 'మధ్యాహ్నం' },
  evening: { hi: 'शाम', te: 'సాయంత్రం' },
  'Your journey to the right support starts here.': { hi: 'सही सहायता पाने की आपकी शुरुआत यहाँ से होती है।', te: 'సరైన సహాయం వైపు మీ ప్రయాణం ఇక్కడ మొదలవుతుంది.' },
  'Complete your profile': { hi: 'प्रोफ़ाइल पूरी करें', te: 'ప్రొఫైల్‌ను పూర్తి చేయండి' },
  'PROFILE COMPLETION': { hi: 'प्रोफ़ाइल पूर्णता', te: 'ప్రొఫైల్ పూర్తితనం' },
  'SCHEMES FOR YOU': { hi: 'आपके लिए योजनाएँ', te: 'మీకు సరిపడే పథకాలు' },
  'From official sources': { hi: 'आधिकारिक स्रोतों से', te: 'అధికారిక మూలాల నుంచి' },
  'YOUR SAVED SCHEMES': { hi: 'आपकी सहेजी योजनाएँ', te: 'మీరు భద్రపరిచిన పథకాలు' },
  'Ready when you are': { hi: 'आपकी सुविधा के लिए तैयार', te: 'మీరు సిద్ధమైనప్పుడు అందుబాటులో ఉంటాయి' },
  'A GOOD PLACE TO START': { hi: 'शुरुआत के लिए अच्छा स्थान', te: 'ప్రారంభించడానికి మంచి స్థలం' },
  'Recommended for you': { hi: 'आपके लिए सुझाव', te: 'మీ కోసం సూచనలు' },
  'View all schemes': { hi: 'सभी योजनाएँ देखें', te: 'అన్ని పథకాలను చూడండి' },
  'NOT SURE WHERE YOU STAND?': { hi: 'अपनी पात्रता को लेकर अनिश्चित हैं?', te: 'మీ అర్హతపై స్పష్టత లేదా?' },
  'Check eligibility in a few steps': { hi: 'कुछ आसान चरणों में पात्रता जाँचें', te: 'కొన్ని సులభమైన దశల్లో అర్హతను తనిఖీ చేయండి' },
  'See which criteria match and what still needs checking.': { hi: 'कौन-से मानदंड मेल खाते हैं और क्या जाँचना बाकी है, देखें।', te: 'ఏ ప్రమాణాలు సరిపోతున్నాయి, ఇంకా ఏమి తనిఖీ చేయాలో చూడండి.' },
  'Start eligibility check': { hi: 'पात्रता जाँच शुरू करें', te: 'అర్హత తనిఖీ ప్రారంభించండి' },
  'PICK UP WHERE YOU LEFT OFF': { hi: 'जहाँ छोड़ा था, वहीं से आगे बढ़ें', te: 'మీరు ఆపిన చోటు నుంచి కొనసాగించండి' },
  'Your saved schemes': { hi: 'आपकी सहेजी योजनाएँ', te: 'మీరు భద్రపరిచిన పథకాలు' },
  'See all': { hi: 'सभी देखें', te: 'అన్నీ చూడండి' },
  'Saved schemes will show up here.': { hi: 'सहेजी गई योजनाएँ यहाँ दिखेंगी।', te: 'భద్రపరిచిన పథకాలు ఇక్కడ కనిపిస్తాయి.' },
  'FIND YOUR BENEFITS': { hi: 'अपने लाभ खोजें', te: 'మీ ప్రయోజనాలను కనుగొనండి' },
  'Discover schemes': { hi: 'योजनाएँ खोजें', te: 'పథకాలను కనుగొనండి' },
  'Explore government support that may fit your circumstances.': { hi: 'आपकी परिस्थिति के अनुसार सरकारी सहायता देखें।', te: 'మీ పరిస్థితికి సరిపడే ప్రభుత్వ సహాయాన్ని చూడండి.' },
  'Search by scheme, benefit or department': { hi: 'योजना, लाभ या विभाग से खोजें', te: 'పథకం, ప్రయోజనం లేదా శాఖతో వెతకండి' },
  'All categories': { hi: 'सभी श्रेणियाँ', te: 'అన్ని వర్గాలు' },
  'Scheme category': { hi: 'योजना की श्रेणी', te: 'పథకం వర్గం' },
  Agriculture: { hi: 'कृषि', te: 'వ్యవసాయం' },
  Health: { hi: 'स्वास्थ्य', te: 'ఆరోగ్యం' },
  'Women & Child Development': { hi: 'महिला एवं बाल विकास', te: 'మహిళా మరియు శిశు అభివృద్ధి' },
  'Financial Services': { hi: 'वित्तीय सेवाएँ', te: 'ఆర్థిక సేవలు' },
  schemes: { hi: 'योजनाएँ', te: 'పథకాలు' },
  'Information linked to official sources': { hi: 'जानकारी आधिकारिक स्रोतों से जुड़ी है', te: 'సమాచారం అధికారిక మూలాలకు అనుసంధానించబడింది' },
  'No schemes found': { hi: 'कोई योजना नहीं मिली', te: 'పథకాలు కనబడలేదు' },
  'Try a different search term.': { hi: 'कोई दूसरा खोज शब्द आज़माएँ।', te: 'మరో శోధన పదాన్ని ప్రయత్నించండి.' },
  'Try a different search term or category.': { hi: 'कोई दूसरा खोज शब्द या श्रेणी चुनें।', te: 'మరో శోధన పదం లేదా వర్గాన్ని ఎంచుకోండి.' },
  'CLEAR, PERSONAL GUIDANCE': { hi: 'स्पष्ट और व्यक्तिगत मार्गदर्शन', te: 'స్పష్టమైన వ్యక్తిగత మార్గదర్శకం' },
  'Eligibility checker': { hi: 'पात्रता जाँच', te: 'అర్హత తనిఖీ' },
  'Check scheme criteria against the details you share. Final eligibility is confirmed by the government department.': { hi: 'आपकी दी गई जानकारी से योजना के मानदंड जाँचें। अंतिम पात्रता की पुष्टि संबंधित सरकारी विभाग करेगा।', te: 'మీరు ఇచ్చిన వివరాలతో పథక ప్రమాణాలను తనిఖీ చేయండి. తుది అర్హతను ప్రభుత్వ శాఖ నిర్ధారిస్తుంది.' },
  'Transparent by design': { hi: 'पारदर्शी प्रक्रिया', te: 'పారదర్శక విధానం' },
  'Checks use published criteria where available. If information is missing or official verification is required, we’ll say so.': { hi: 'जहाँ उपलब्ध हों, जाँच प्रकाशित मानदंडों पर आधारित है। जानकारी कम हो या आधिकारिक पुष्टि ज़रूरी हो, तो हम बताएँगे।', te: 'అందుబాటులో ఉన్న ప్రచురిత ప్రమాణాలతో తనిఖీ చేస్తాం. సమాచారం తక్కువగా ఉన్నా లేదా అధికారిక ధృవీకరణ అవసరమైనా తెలియజేస్తాం.' },
  'Complete profile': { hi: 'प्रोफ़ाइल पूरी करें', te: 'ప్రొఫైల్ పూర్తి చేయండి' },
  'GET PAPERWORK READY': { hi: 'दस्तावेज़ तैयार रखें', te: 'పత్రాలను సిద్ధం చేసుకోండి' },
  'Document assistant': { hi: 'दस्तावेज़ सहायक', te: 'పత్రాల సహాయకుడు' },
  'Extract text from a document and compare its detected type with a scheme checklist. This is not official verification.': { hi: 'दस्तावेज़ से पाठ निकालें और पहचाने गए प्रकार की योजना की सूची से तुलना करें। यह आधिकारिक सत्यापन नहीं है।', te: 'పత్రం నుంచి పాఠ్యాన్ని తీసి, గుర్తించిన రకాన్ని పథక పత్రాల జాబితాతో పోల్చండి. ఇది అధికారిక ధృవీకరణ కాదు.' },
  'Upload a document': { hi: 'दस्तावेज़ अपलोड करें', te: 'పత్రాన్ని అప్‌లోడ్ చేయండి' },
  'Choose a PDF, JPG or PNG file up to 8 MB. Files are processed in memory only.': { hi: '8 MB तक की PDF, JPG या PNG फ़ाइल चुनें। फ़ाइल केवल मेमोरी में संसाधित होती है।', te: '8 MB వరకు ఉన్న PDF, JPG లేదా PNG ఫైల్‌ను ఎంచుకోండి. ఫైళ్లు మెమరీలో మాత్రమే ప్రాసెస్ చేయబడతాయి.' },
  'Compare with a scheme (optional)': { hi: 'योजना से तुलना करें (वैकल्पिक)', te: 'పథకంతో పోల్చండి (ఐచ్ఛికం)' },
  'Choose a scheme': { hi: 'योजना चुनें', te: 'పథకాన్ని ఎంచుకోండి' },
  'I consent to process this document in memory. The file will not be stored.': { hi: 'मैं इस दस्तावेज़ को मेमोरी में संसाधित करने की सहमति देता/देती हूँ। फ़ाइल संग्रहीत नहीं होगी।', te: 'ఈ పత్రాన్ని మెమరీలో ప్రాసెస్ చేయడానికి నేను సమ్మతిస్తున్నాను. ఫైల్ నిల్వ చేయబడదు.' },
  'Choose a file': { hi: 'फ़ाइल चुनें', te: 'ఫైల్‌ను ఎంచుకోండి' },
  'Do not upload documents containing information you do not want processed.': { hi: 'ऐसे दस्तावेज़ अपलोड न करें जिनकी जानकारी आप संसाधित नहीं करवाना चाहते।', te: 'మీరు ప్రాసెస్ చేయించకూడదనుకునే సమాచారం ఉన్న పత్రాలను అప్‌లోడ్ చేయవద్దు.' },
  'DOCUMENT REVIEW': { hi: 'दस्तावेज़ समीक्षा', te: 'పత్రాల సమీక్ష' },
  'Extracted information': { hi: 'निकाली गई जानकारी', te: 'సేకరించిన సమాచారం' },
  'Not officially verified': { hi: 'आधिकारिक रूप से सत्यापित नहीं', te: 'అధికారికంగా ధృవీకరించబడలేదు' },
  'No readable text found.': { hi: 'पढ़ने योग्य पाठ नहीं मिला।', te: 'చదవగలిగే పాఠ్యం కనబడలేదు.' },
  'Scheme document checklist': { hi: 'योजना के दस्तावेज़ों की सूची', te: 'పథక పత్రాల తనిఖీ జాబితా' },
  'Only this upload was checked. A document listed as missing may be available in a separate file.': { hi: 'केवल इस अपलोड की जाँच हुई है। सूची में अनुपस्थित दस्तावेज़ किसी दूसरी फ़ाइल में हो सकता है।', te: 'ఈ అప్‌లోడ్‌ను మాత్రమే తనిఖీ చేశాం. కనిపించని పత్రం మరో ఫైల్‌లో ఉండవచ్చు.' },
  'Detected types are suggestions based on text. No uploaded document is stored or officially authenticated.': { hi: 'पहचाने गए प्रकार पाठ पर आधारित सुझाव हैं। अपलोड किया गया दस्तावेज़ न तो संग्रहीत है, न आधिकारिक रूप से प्रमाणित।', te: 'గుర్తించిన రకాలు పాఠ్యంపై ఆధారమైన సూచనలు మాత్రమే. అప్‌లోడ్ చేసిన పత్రం నిల్వ చేయబడదు లేదా అధికారికంగా ధృవీకరించబడదు.' },
  'KEEP TRACK': { hi: 'अपनी प्रगति देखें', te: 'మీ పురోగతిని గమనించండి' },
  'My applications': { hi: 'मेरे आवेदन', te: 'నా దరఖాస్తులు' },
  'Your saved schemes and the next step you marked for yourself.': { hi: 'आपकी सहेजी योजनाएँ और आपके द्वारा चुना गया अगला कदम।', te: 'మీరు భద్రపరిచిన పథకాలు, మీరు గుర్తించిన తదుపరి చర్య.' },
  'Application status for': { hi: 'आवेदन की स्थिति:', te: 'దరఖాస్తు స్థితి:' },
  Saved: { hi: 'सहेजा गया', te: 'భద్రపరచబడింది' },
  'In progress': { hi: 'प्रगति पर', te: 'ప్రగతిలో ఉంది' },
  Submitted: { hi: 'जमा किया गया', te: 'సమర్పించబడింది' },
  Completed: { hi: 'पूरा हुआ', te: 'పూర్తయింది' },
  'Open portal': { hi: 'पोर्टल खोलें', te: 'పోర్టల్‌ను తెరవండి' },
  Remove: { hi: 'हटाएँ', te: 'తొలగించండి' },
  'No saved schemes yet': { hi: 'अभी कोई योजना सहेजी नहीं गई', te: 'ఇంకా ఏ పథకమూ భద్రపరచలేదు' },
  'Save a scheme from Discover to keep it here.': { hi: 'इसे यहाँ रखने के लिए खोजें पृष्ठ से कोई योजना सहेजें।', te: 'ఇక్కడ ఉంచడానికి పథకాల పేజీ నుంచి ఒక పథకాన్ని భద్రపరచండి.' },
  'ASK IN YOUR LANGUAGE': { hi: 'अपनी भाषा में पूछें', te: 'మీ భాషలో అడగండి' },
  'Your scheme guide': { hi: 'योजना मार्गदर्शिका', te: 'పథకాల మార్గదర్శి' },
  'Ask a question about government schemes. Answers use the scheme information in this app and point you to official sources.': { hi: 'सरकारी योजनाओं के बारे में पूछें। उत्तर इस ऐप की योजना जानकारी पर आधारित होंगे और आधिकारिक स्रोत दिखाएँगे।', te: 'ప్రభుత్వ పథకాల గురించి అడగండి. సమాధానాలు ఈ యాప్‌లోని పథక సమాచారాన్ని ఉపయోగించి అధికారిక మూలాలను చూపిస్తాయి.' },
  'How can I help?': { hi: 'मैं आपकी कैसे मदद कर सकता/सकती हूँ?', te: 'నేను మీకు ఎలా సహాయపడగలను?' },
  'Try asking: “I’m a farmer. What support might I qualify for?”': { hi: 'पूछें: “मैं किसान हूँ। मुझे कौन-सी सहायता मिल सकती है?”', te: 'ఇలా అడగండి: “నేను రైతును. నాకు ఏ సహాయం అర్హత కావచ్చు?”' },
  'Needs checking:': { hi: 'जाँच बाकी:', te: 'తనిఖీ చేయాల్సినవి:' },
  'Documents:': { hi: 'दस्तावेज़:', te: 'పత్రాలు:' },
  'Official source': { hi: 'आधिकारिक स्रोत', te: 'అధికారిక మూలం' },
  'Read aloud': { hi: 'ज़ोर से सुनें', te: 'బిగ్గరగా చదవండి' },
  'Ask about schemes, eligibility or documents...': { hi: 'योजनाओं, पात्रता या दस्तावेज़ों के बारे में पूछें...', te: 'పథకాలు, అర్హత లేదా పత్రాల గురించి అడగండి...' },
  'Voice input': { hi: 'आवाज़ से बोलें', te: 'వాయిస్ ఇన్‌పుట్' },
  Send: { hi: 'भेजें', te: 'పంపండి' },
  'Guidance only. Check official sources before applying.': { hi: 'यह केवल मार्गदर्शन है। आवेदन से पहले आधिकारिक स्रोत देखें।', te: 'ఇది మార్గదర్శకం మాత్రమే. దరఖాస్తు చేసే ముందు అధికారిక మూలాలను చూడండి.' },
  'PERSONALISE YOUR GUIDANCE': { hi: 'अपना मार्गदर्शन अनुकूलित करें', te: 'మీ మార్గదర్శకాన్ని వ్యక్తిగతీకరించండి' },
  'Your profile': { hi: 'आपकी प्रोफ़ाइल', te: 'మీ ప్రొఫైల్' },
  'Share only what you’re comfortable sharing. These details help us match scheme criteria.': { hi: 'केवल वही जानकारी दें जिसे साझा करने में आप सहज हों। इससे योजनाओं के मानदंड मिलाने में मदद मिलती है।', te: 'మీకు సౌకర్యంగా ఉన్న సమాచారాన్ని మాత్రమే పంచుకోండి. ఈ వివరాలు పథక ప్రమాణాలను సరిపోల్చడంలో సహాయపడతాయి.' },
  'Citizen details': { hi: 'नागरिक विवरण', te: 'పౌరుల వివరాలు' },
  'Encrypted in the API database and scoped to this browser session.': { hi: 'API डेटाबेस में एन्क्रिप्टेड और इस ब्राउज़र सत्र तक सीमित।', te: 'API డేటాబేస్‌లో ఎన్‌క్రిప్ట్ చేయబడి ఈ బ్రౌజర్ సెషన్‌కే పరిమితం.' },
  'Load synthetic demo profile': { hi: 'डेमो प्रोफ़ाइल भरें', te: 'డెమో ప్రొఫైల్‌ను లోడ్ చేయండి' },
  'Full name': { hi: 'पूरा नाम', te: 'పూర్తి పేరు' },
  'Your name': { hi: 'आपका नाम', te: 'మీ పేరు' },
  Age: { hi: 'आयु', te: 'వయస్సు' },
  'Age in years': { hi: 'वर्षों में आयु', te: 'సంవత్సరాల్లో వయస్సు' },
  State: { hi: 'राज्य', te: 'రాష్ట్రం' },
  'e.g. Telangana': { hi: 'जैसे तेलंगाना', te: 'ఉదా. తెలంగాణ' },
  District: { hi: 'ज़िला', te: 'జిల్లా' },
  'Your district': { hi: 'आपका ज़िला', te: 'మీ జిల్లా' },
  Occupation: { hi: 'व्यवसाय', te: 'వృత్తి' },
  'Select occupation': { hi: 'व्यवसाय चुनें', te: 'వృత్తిని ఎంచుకోండి' },
  Farmer: { hi: 'किसान', te: 'రైతు' },
  'Agricultural worker': { hi: 'कृषि श्रमिक', te: 'వ్యవసాయ కార్మికుడు' },
  'Self-employed': { hi: 'स्वरोज़गार', te: 'స్వయం ఉపాధి' },
  Salaried: { hi: 'वेतनभोगी', te: 'జీతం పొందేవారు' },
  Student: { hi: 'विद्यार्थी', te: 'విద్యార్థి' },
  Homemaker: { hi: 'गृहिणी/गृहस्थ', te: 'గృహ నిర్వాహకుడు' },
  Unemployed: { hi: 'बेरोज़गार', te: 'నిరుద్యోగి' },
  Other: { hi: 'अन्य', te: 'ఇతరులు' },
  'Annual household income': { hi: 'परिवार की वार्षिक आय', te: 'కుటుంబ వార్షిక ఆదాయం' },
  'Income in rupees': { hi: 'रुपयों में आय', te: 'రూపాయల్లో ఆదాయం' },
  'Family category': { hi: 'परिवार श्रेणी', te: 'కుటుంబ వర్గం' },
  'Choose if applicable': { hi: 'लागू हो तो चुनें', te: 'వర్తిస్తే ఎంచుకోండి' },
  General: { hi: 'सामान्य', te: 'జనరల్' },
  Minority: { hi: 'अल्पसंख्यक', te: 'మైనారిటీ' },
  'Prefer not to say': { hi: 'बताना नहीं चाहते', te: 'చెప్పదలచుకోలేదు' },
  'Preferred language': { hi: 'पसंदीदा भाषा', te: 'ఇష్టమైన భాష' },
  'Pregnancy or lactation status': { hi: 'गर्भावस्था या स्तनपान की स्थिति', te: 'గర్భధారణ లేదా పాలిచ్చే స్థితి' },
  'Not provided': { hi: 'जानकारी नहीं दी गई', te: 'సమాచారం ఇవ్వలేదు' },
  Pregnant: { hi: 'गर्भवती', te: 'గర్భిణి' },
  Lactating: { hi: 'स्तनपान करा रही हैं', te: 'పాలిస్తున్నారు' },
  Neither: { hi: 'इनमें से कोई नहीं', te: 'ఏదీ కాదు' },
  'Children count': { hi: 'बच्चों की संख्या', te: 'పిల్లల సంఖ్య' },
  Optional: { hi: 'वैकल्पिक', te: 'ఐచ్ఛికం' },
  'Second child is a girl': { hi: 'दूसरी संतान लड़की है', te: 'రెండవ సంతానం అమ్మాయి' },
  Yes: { hi: 'हाँ', te: 'అవును' },
  No: { hi: 'नहीं', te: 'కాదు' },
  'Already have a bank account': { hi: 'क्या आपका बैंक खाता पहले से है', te: 'మీకు ఇప్పటికే బ్యాంక్ ఖాతా ఉందా' },
  'PMMVY qualifying categories (optional)': { hi: 'PMMVY की पात्र श्रेणियाँ (वैकल्पिक)', te: 'PMMVY అర్హత వర్గాలు (ఐచ్ఛికం)' },
  Disability: { hi: 'दिव्यांगता', te: 'వైకల్యం' },
  'Income below ₹8 lakh': { hi: '₹8 लाख से कम आय', te: '₹8 లక్షల కంటే తక్కువ ఆదాయం' },
  'NFSA ration card': { hi: 'NFSA राशन कार्ड', te: 'NFSA రేషన్ కార్డు' },
  'You can edit these details anytime. No ID/account numbers required.': { hi: 'आप इन विवरणों को कभी भी बदल सकते हैं। पहचान या खाता संख्या की ज़रूरत नहीं।', te: 'ఈ వివరాలను ఎప్పుడైనా మార్చవచ్చు. గుర్తింపు లేదా ఖాతా నంబర్లు అవసరం లేదు.' },
  'Save profile': { hi: 'प्रोफ़ाइल सहेजें', te: 'ప్రొఫైల్‌ను భద్రపరచండి' },
  'Scheme information is indicative. Verify details on official government portals.': { hi: 'योजना की जानकारी संकेतात्मक है। विवरण की पुष्टि आधिकारिक सरकारी पोर्टल पर करें।', te: 'పథక సమాచారం సూచనాత్మకం. వివరాలను అధికారిక ప్రభుత్వ పోర్టల్‌లో ధృవీకరించండి.' },
  'Made for citizens, with care': { hi: 'नागरिकों के लिए, संवेदनशीलता के साथ', te: 'పౌరుల కోసం, శ్రద్ధతో రూపొందించబడింది' },
  'Profile saved': { hi: 'प्रोफ़ाइल सहेजी गई', te: 'ప్రొఫైల్ భద్రపరచబడింది' },
  'Could not save profile to this session': { hi: 'इस सत्र में प्रोफ़ाइल सहेजी नहीं जा सकी', te: 'ఈ సెషన్‌లో ప్రొఫైల్‌ను భద్రపరచలేకపోయాం' },
  'Scheme saved': { hi: 'योजना सहेजी गई', te: 'పథకం భద్రపరచబడింది' },
  'Removed from saved schemes': { hi: 'सहेजी योजनाओं से हटाया गया', te: 'భద్రపరచిన పథకాల నుంచి తొలగించబడింది' },
  'Could not connect to the JanSaarthi service. Start the API with the setup instructions below.': { hi: 'JanSaarthi सेवा से संपर्क नहीं हो सका। नीचे दिए निर्देशों से API शुरू करें।', te: 'JanSaarthi సేవకు కనెక్ట్ కాలేకపోయాం. క్రింది సూచనలతో APIని ప్రారంభించండి.' },
  'Could not reach the scheme service. Please try again once the API is running.': { hi: 'योजना सेवा से संपर्क नहीं हो सका। API शुरू होने पर फिर कोशिश करें।', te: 'పథక సేవను చేరుకోలేకపోయాం. API ప్రారంభమైన తర్వాత మళ్లీ ప్రయత్నించండి.' },
  'Connect to the API to check eligibility.': { hi: 'पात्रता जाँचने के लिए API से जुड़ें।', te: 'అర్హత తనిఖీకి APIతో కనెక్ట్ అవ్వండి.' },
  'Speech output is not supported in this browser': { hi: 'इस ब्राउज़र में आवाज़ में पढ़ने की सुविधा उपलब्ध नहीं है', te: 'ఈ బ్రౌజర్‌లో వాయిస్ అవుట్‌పుట్‌కు మద్దతు లేదు' },
  'Speech input is not supported in this browser': { hi: 'इस ब्राउज़र में आवाज़ से लिखने की सुविधा उपलब्ध नहीं है', te: 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్‌కు మద్దతు లేదు' },
  'The document service is not available.': { hi: 'दस्तावेज़ सेवा उपलब्ध नहीं है।', te: 'పత్రాల సేవ అందుబాటులో లేదు.' },
  'No document type identified': { hi: 'दस्तावेज़ का प्रकार नहीं पहचाना गया', te: 'పత్ర రకాన్ని గుర్తించలేకపోయాం' },
  'Document type not identified': { hi: 'दस्तावेज़ का प्रकार नहीं पहचाना गया', te: 'పత్ర రకాన్ని గుర్తించలేకపోయాం' },
  'Only PDF, JPG and PNG files are accepted': { hi: 'केवल PDF, JPG और PNG फ़ाइलें स्वीकार की जाती हैं', te: 'PDF, JPG మరియు PNG ఫైళ్లు మాత్రమే అంగీకరించబడతాయి' },
  'File exceeds the 8 MB limit': { hi: 'फ़ाइल 8 MB की सीमा से बड़ी है', te: 'ఫైల్ 8 MB పరిమితిని మించింది' },
  'PDF is limited to 20 pages': { hi: 'PDF अधिकतम 20 पृष्ठों की हो सकती है', te: 'PDF గరిష్ఠంగా 20 పేజీలు మాత్రమే ఉండాలి' },
  'OCR could not process this image. Please try a clear JPG/PNG or a text PDF.': { hi: 'OCR इस छवि को संसाधित नहीं कर सका। स्पष्ट JPG/PNG या पाठ वाली PDF आज़माएँ।', te: 'OCR ఈ చిత్రాన్ని ప్రాసెస్ చేయలేకపోయింది. స్పష్టమైన JPG/PNG లేదా టెక్స్ట్ PDFను ప్రయత్నించండి.' },
  'Scheme not found': { hi: 'योजना नहीं मिली', te: 'పథకం కనబడలేదు' },
  'Not eligible': { hi: 'पात्र नहीं', te: 'అర్హులు కాదు' },
  'Needs verification': { hi: 'पुष्टि आवश्यक', te: 'ధృవీకరణ అవసరం' },
  'Likely eligible': { hi: 'संभावित रूप से पात्र', te: 'అర్హత ఉండవచ్చు' },
  'One or more listed criteria do not match the information provided.': { hi: 'एक या अधिक मानदंड दी गई जानकारी से मेल नहीं खाते।', te: 'ఒకటి లేదా అంతకంటే ఎక్కువ ప్రమాణాలు ఇచ్చిన సమాచారానికి సరిపోలడం లేదు.' },
  'Some key details or official checks are still needed.': { hi: 'कुछ ज़रूरी विवरण या आधिकारिक जाँच अभी बाकी है।', te: 'కొన్ని ముఖ్యమైన వివరాలు లేదా అధికారిక తనిఖీలు ఇంకా అవసరం.' },
  'The details you provided match the criteria checked here; the department must confirm eligibility.': { hi: 'दी गई जानकारी यहाँ जाँचे गए मानदंडों से मेल खाती है; विभाग पात्रता की पुष्टि करेगा।', te: 'మీరు ఇచ్చిన వివరాలు తనిఖీ చేసిన ప్రమాణాలకు సరిపోతున్నాయి; అర్హతను శాఖ నిర్ధారించాలి.' },
  'Age must be at least 18 years': { hi: 'आयु कम से कम 18 वर्ष होनी चाहिए', te: 'వయస్సు కనీసం 18 సంవత్సరాలు ఉండాలి' },
  'Age must be at least 70 years': { hi: 'आयु कम से कम 70 वर्ष होनी चाहिए', te: 'వయస్సు కనీసం 70 సంవత్సరాలు ఉండాలి' },
  'Age must be no more than 55 years': { hi: 'आयु 55 वर्ष से अधिक नहीं होनी चाहिए', te: 'వయస్సు 55 సంవత్సరాలకు మించకూడదు' },
  'Profile occupation is farmer': { hi: 'प्रोफ़ाइल में व्यवसाय किसान है', te: 'ప్రొఫైల్‌లో వృత్తి రైతుగా ఉంది' },
  'eligible landholding status': { hi: 'पात्र भूमि-स्वामित्व की स्थिति', te: 'అర్హమైన భూమి యాజమాన్య స్థితి' },
  'scheme exclusions and official beneficiary verification': { hi: 'योजना के अपवर्जन और आधिकारिक लाभार्थी पुष्टि', te: 'పథక మినహాయింపులు, అధికారిక లబ్ధిదారు ధృవీకరణ' },
  'age': { hi: 'आयु', te: 'వయస్సు' },
  'pregnancy/lactation status': { hi: 'गर्भावस्था/स्तनपान की स्थिति', te: 'గర్భధారణ/పాలిచ్చే స్థితి' },
  'one eligible social/economic category': { hi: 'एक पात्र सामाजिक/आर्थिक श्रेणी', te: 'ఒక అర్హమైన సామాజిక/ఆర్థిక వర్గం' },
  'child order and living-child details': { hi: 'बच्चे का क्रम और जीवित बच्चों का विवरण', te: 'పిల్లల క్రమం, జీవించి ఉన్న పిల్లల వివరాలు' },
  'whether the second child is a girl': { hi: 'क्या दूसरी संतान लड़की है', te: 'రెండవ సంతానం అమ్మాయా' },
  'official registration and health-care milestones': { hi: 'आधिकारिक पंजीकरण और स्वास्थ्य सेवा के पड़ाव', te: 'అధికారిక నమోదు, ఆరోగ్య సంరక్షణ దశలు' },
  'whether you already hold a bank account': { hi: 'क्या आपके पास पहले से बैंक खाता है', te: 'మీకు ఇప్పటికే బ్యాంక్ ఖాతా ఉందా' },
  'bank KYC and account-opening checks': { hi: 'बैंक KYC और खाता खोलने की जाँच', te: 'బ్యాంక్ KYC, ఖాతా ప్రారంభ తనిఖీలు' },
  'Profile indicates pregnant or lactating': { hi: 'प्रोफ़ाइल में गर्भावस्था या स्तनपान दर्ज है', te: 'ప్రొఫైల్‌లో గర్భధారణ లేదా పాలిచ్చే స్థితి ఉంది' },
  'At least one listed social/economic category was selected': { hi: 'सूचीबद्ध सामाजिक/आर्थिक श्रेणियों में से एक चुनी गई', te: 'జాబితాలోని సామాజిక/ఆర్థిక వర్గాల్లో కనీసం ఒకటి ఎంచుకున్నారు' },
  'First-child benefit may apply; official records must confirm': { hi: 'पहली संतान का लाभ लागू हो सकता है; आधिकारिक रिकॉर्ड से पुष्टि ज़रूरी है', te: 'మొదటి సంతానానికి ప్రయోజనం వర్తించవచ్చు; అధికారిక రికార్డులతో నిర్ధారించాలి' },
  'Second child is marked as a girl': { hi: 'दूसरी संतान को लड़की के रूप में दर्ज किया गया है', te: 'రెండవ సంతానం అమ్మాయిగా నమోదు చేయబడింది' },
  'Profile indicates no existing bank account': { hi: 'प्रोफ़ाइल में मौजूदा बैंक खाता नहीं बताया गया है', te: 'ప్రొఫైల్‌లో ఇప్పటికే బ్యాంక్ ఖాతా లేదని పేర్కొన్నారు' },
  'Identity document (unconfirmed)': { hi: 'पहचान दस्तावेज़ (अपुष्ट)', te: 'గుర్తింపు పత్రం (ధృవీకరించలేదు)' },
  'Land record (unconfirmed)': { hi: 'भूमि रिकॉर्ड (अपुष्ट)', te: 'భూమి రికార్డు (ధృవీకరించలేదు)' },
  'Income proof (unconfirmed)': { hi: 'आय प्रमाण (अपुष्ट)', te: 'ఆదాయ రుజువు (ధృవీకరించలేదు)' },
  'Bank document (unconfirmed)': { hi: 'बैंक दस्तावेज़ (अपुष्ट)', te: 'బ్యాంక్ పత్రం (ధృవీకరించలేదు)' },
  'Ration card (unconfirmed)': { hi: 'राशन कार्ड (अपुष्ट)', te: 'రేషన్ కార్డు (ధృవీకరించలేదు)' },
  'Employment job card (unconfirmed)': { hi: 'रोज़गार जॉब कार्ड (अपुष्ट)', te: 'ఉపాధి జాబ్ కార్డు (ధృవీకరించలేదు)' },
  'Health scheme card (unconfirmed)': { hi: 'स्वास्थ्य योजना कार्ड (अपुष्ट)', te: 'ఆరోగ్య పథక కార్డు (ధృవీకరించలేదు)' },
  'Maternity health record (unconfirmed)': { hi: 'मातृत्व स्वास्थ्य रिकॉर्ड (अपुष्ट)', te: 'మాతృత్వ ఆరోగ్య రికార్డు (ధృవీకరించలేదు)' },
  'Birth record (unconfirmed)': { hi: 'जन्म रिकॉर्ड (अपुष्ट)', te: 'జనన రికార్డు (ధృవీకరించలేదు)' },
  'Immunisation record (unconfirmed)': { hi: 'टीकाकरण रिकॉर्ड (अपुष्ट)', te: 'టీకాల రికార్డు (ధృవీకరించలేదు)' },
  'Caste proof (unconfirmed)': { hi: 'जाति प्रमाण (अपुष्ट)', te: 'కుల ధృవీకరణ (ధృవీకరించలేదు)' },
  'Disability proof (unconfirmed)': { hi: 'दिव्यांगता प्रमाण (अपुष्ट)', te: 'వైకల్య ధృవీకరణ (ధృవీకరించలేదు)' },
  'Possible supporting document detected; verify it meets official requirements': { hi: 'संभावित सहायक दस्तावेज़ मिला; आधिकारिक आवश्यकताओं से मिलान करें', te: 'సహాయక పత్రం ఉండవచ్చు; అధికారిక అవసరాలకు సరిపోతుందో ధృవీకరించండి' },
  'Not detected in this upload; may be provided separately': { hi: 'इस अपलोड में नहीं मिला; अलग से दिया जा सकता है', te: 'ఈ అప్‌లోడ్‌లో కనిపించలేదు; వేరుగా సమర్పించి ఉండవచ్చు' },
  'Land ownership records': { hi: 'भूमि स्वामित्व रिकॉर्ड', te: 'భూమి యాజమాన్య రికార్డులు' },
  'Bank account details': { hi: 'बैंक खाते का विवरण', te: 'బ్యాంక్ ఖాతా వివరాలు' },
  'Identity document (as required by official portal)': { hi: 'आधिकारिक पोर्टल के अनुसार पहचान दस्तावेज़', te: 'అధికారిక పోర్టల్ కోరిన గుర్తింపు పత్రం' },
  'Age proof as required by official enrolment': { hi: 'आधिकारिक नामांकन के अनुसार आयु प्रमाण', te: 'అధికారిక నమోదు ప్రకారం వయస్సు రుజువు' },
  'Identity document for e-KYC': { hi: 'e-KYC के लिए पहचान दस्तावेज़', te: 'e-KYC కోసం గుర్తింపు పత్రం' },
  'MCP/RCHI card and pregnancy/child health details (as applicable)': { hi: 'MCP/RCHI कार्ड और गर्भावस्था/बच्चे के स्वास्थ्य विवरण (जहाँ लागू हों)', te: 'MCP/RCHI కార్డు, గర్భధారణ/పిల్లల ఆరోగ్య వివరాలు (వర్తించినప్పుడు)' },
  'Proof of one eligible category (see Ministry list)': { hi: 'एक पात्र श्रेणी का प्रमाण (मंत्रालय की सूची देखें)', te: 'ఒక అర్హత వర్గానికి రుజువు (మంత్రిత్వ శాఖ జాబితా చూడండి)' },
  'Bank/post office account proof; Aadhaar requirements are handled only by the official portal': { hi: 'बैंक/डाकघर खाते का प्रमाण; आधार की आवश्यकता केवल आधिकारिक पोर्टल पर पूरी करें', te: 'బ్యాంక్/పోస్ట్ ఆఫీస్ ఖాతా రుజువు; ఆధార్ అవసరాలను అధికారిక పోర్టల్‌లో మాత్రమే సమర్పించండి' },
  'Child birth and immunisation details for applicable instalments': { hi: 'लागू किस्तों के लिए बच्चे का जन्म और टीकाकरण विवरण', te: 'వర్తించే విడతలకు పిల్లల జననం, టీకాల వివరాలు' },
  'Identity/address documents accepted by the bank (see official KYC guidance)': { hi: 'बैंक द्वारा स्वीकार पहचान/पता दस्तावेज़ (आधिकारिक KYC मार्गदर्शन देखें)', te: 'బ్యాంక్ అంగీకరించే గుర్తింపు/చిరునామా పత్రాలు (అధికారిక KYC సూచనలు చూడండి)' },
  'No document needs to be uploaded to JanSaarthi; do not enter account numbers or credentials': { hi: 'JanSaarthi पर कोई दस्तावेज़ अपलोड करने की ज़रूरत नहीं; खाता संख्या या लॉगिन विवरण न दें', te: 'JanSaarthiకు పత్రం అప్‌లోడ్ చేయాల్సిన అవసరం లేదు; ఖాతా నంబర్లు లేదా క్రెడెన్షియల్స్ ఇవ్వవద్దు' },
  'PM-KISAN Samman Nidhi': { hi: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN Samman Nidhi)', te: 'ప్రధానమంత్రి కిసాన్ సమ్మాన్ నిధి (PM-KISAN Samman Nidhi)' },
  'Ayushman Bharat PM-JAY for senior citizens (70+)': { hi: '70 वर्ष से अधिक आयु वालों के लिए आयुष्मान भारत PM-JAY (Ayushman Bharat PM-JAY)', te: '70 ఏళ్లు పైబడిన వారికి ఆయుష్మాన్ భారత్ PM-JAY (Ayushman Bharat PM-JAY)' },
  'Pradhan Mantri Matru Vandana Yojana (PMMVY)': { hi: 'प्रधानमंत्री मातृ वंदना योजना (PMMVY)', te: 'ప్రధానమంత్రి మాతృ వందన యోజన (PMMVY)' },
  'Pradhan Mantri Jan-Dhan Yojana (PMJDY)': { hi: 'प्रधानमंत्री जन-धन योजना (PMJDY)', te: 'ప్రధానమంత్రి జన్-ధన్ యోజన (PMJDY)' },
  'Ministry of Agriculture & Farmers Welfare': { hi: 'कृषि एवं किसान कल्याण मंत्रालय (Ministry of Agriculture & Farmers Welfare)', te: 'వ్యవసాయం మరియు రైతుల సంక్షేమ మంత్రిత్వ శాఖ (Ministry of Agriculture & Farmers Welfare)' },
  'National Health Authority, Ministry of Health and Family Welfare': { hi: 'राष्ट्रीय स्वास्थ्य प्राधिकरण, स्वास्थ्य एवं परिवार कल्याण मंत्रालय', te: 'జాతీయ ఆరోగ్య ప్రాధికార సంస్థ, ఆరోగ్య మరియు కుటుంబ సంక్షేమ మంత్రిత్వ శాఖ' },
  'Ministry of Women and Child Development': { hi: 'महिला एवं बाल विकास मंत्रालय', te: 'మహిళా మరియు శిశు అభివృద్ధి మంత్రిత్వ శాఖ' },
  'Department of Financial Services, Ministry of Finance': { hi: 'वित्तीय सेवा विभाग, वित्त मंत्रालय', te: 'ఆర్థిక సేవల విభాగం, ఆర్థిక మంత్రిత్వ శాఖ' },
  'Income support for eligible landholding farmer families across India.': { hi: 'भारत में पात्र भूमि-धारक किसान परिवारों के लिए आय सहायता।', te: 'భారతదేశంలోని అర్హతగల భూమి కలిగిన రైతు కుటుంబాలకు ఆదాయ సహాయం.' },
  'Health cover for all senior citizens aged 70 and above, irrespective of income.': { hi: 'आय की परवाह किए बिना 70 वर्ष या उससे अधिक आयु के सभी वरिष्ठ नागरिकों के लिए स्वास्थ्य कवच।', te: 'ఆదాయంతో సంబంధం లేకుండా 70 ఏళ్లు లేదా అంతకంటే ఎక్కువ వయస్సు ఉన్న సీనియర్ పౌరులందరికీ ఆరోగ్య కవరేజ్.' },
  'Maternity benefit for eligible pregnant and lactating women from socially and economically disadvantaged groups.': { hi: 'सामाजिक और आर्थिक रूप से वंचित समूहों की पात्र गर्भवती और स्तनपान कराने वाली महिलाओं के लिए मातृत्व लाभ।', te: 'సామాజిక, ఆర్థికంగా వెనుకబడిన వర్గాల అర్హతగల గర్భిణీ మరియు పాలిచ్చే మహిళలకు ప్రసూతి ప్రయోజనం.' },
  'Financial inclusion mission offering access to a basic savings account and linked financial services.': { hi: 'बुनियादी बचत खाते और उससे जुड़ी वित्तीय सेवाओं तक पहुँच देने वाला वित्तीय समावेशन मिशन।', te: 'ప్రాథమిక పొదుపు ఖాతా, అనుబంధ ఆర్థిక సేవలకు ప్రాప్యత కల్పించే ఆర్థిక సమ్మిళిత మిషన్.' },
  '₹6,000 per year per eligible farmer family in three instalments, subject to exclusions.': { hi: 'अपवर्जन नियमों के अधीन, पात्र किसान परिवार को तीन किस्तों में प्रति वर्ष ₹6,000।', te: 'మినహాయింపులకు లోబడి, అర్హతగల రైతు కుటుంబానికి సంవత్సరానికి ₹6,000 మూడు విడతల్లో.' },
  'Health cover up to ₹5 lakh per year for eligible senior citizens.': { hi: 'पात्र वरिष्ठ नागरिकों के लिए प्रति वर्ष ₹5 लाख तक का स्वास्थ्य कवच।', te: 'అర్హతగల సీనియర్ పౌరులకు సంవత్సరానికి ₹5 లక్షల వరకు ఆరోగ్య కవరేజ్.' },
  '₹5,000 for the first living child; ₹6,000 for the second child if the second child is a girl, subject to scheme conditions.': { hi: 'पहली जीवित संतान के लिए ₹5,000; दूसरी संतान लड़की होने पर ₹6,000, योजना की शर्तों के अधीन।', te: 'మొదటి జీవించి ఉన్న సంతానానికి ₹5,000; రెండవ సంతానం అమ్మాయి అయితే ₹6,000, పథక నిబంధనలకు లోబడి.' },
  'Basic savings bank account with no minimum balance requirement; other linked benefits depend on account and programme conditions.': { hi: 'न्यूनतम शेष राशि की आवश्यकता के बिना बुनियादी बचत बैंक खाता; अन्य लाभ खाते और कार्यक्रम की शर्तों पर निर्भर हैं।', te: 'కనీస నిల్వ అవసరం లేని ప్రాథమిక పొదుపు బ్యాంక్ ఖాతా; ఇతర ప్రయోజనాలు ఖాతా, కార్యక్రమ నిబంధనలపై ఆధారపడతాయి.' },
  'Landholding farmer family with cultivable land; exclusions apply': { hi: 'खेती योग्य भूमि वाला किसान परिवार; अपवर्जन लागू', te: 'సాగు భూమి కలిగిన రైతు కుటుంబం; మినహాయింపులు వర్తిస్తాయి' },
  'Age 70 or above, regardless of income': { hi: 'आय की परवाह किए बिना आयु 70 वर्ष या अधिक', te: 'ఆదాయంతో సంబంధం లేకుండా 70 ఏళ్లు లేదా అంతకంటే ఎక్కువ వయస్సు' },
  'Eligible pregnant/lactating women, with qualifying category and child-order rules': { hi: 'पात्र गर्भवती/स्तनपान कराने वाली महिलाएँ; श्रेणी और संतान क्रम के नियम लागू', te: 'అర్హతగల గర్భిణీ/పాలిచ్చే మహిళలు; వర్గం, పిల్లల క్రమ నిబంధనలు వర్తిస్తాయి' },
  'People without an existing bank account can enquire about opening a basic account': { hi: 'मौजूदा बैंक खाता न रखने वाले लोग बुनियादी खाता खोलने की जानकारी ले सकते हैं', te: 'ఇప్పటికే బ్యాంక్ ఖాతా లేని వారు ప్రాథమిక ఖాతా తెరవడం గురించి విచారించవచ్చు' },
  'WHO IT MAY HELP': { hi: 'किसे मदद मिल सकती है', te: 'ఎవరికి సహాయం అందవచ్చు' },
  'DOCUMENTS TO PREPARE': { hi: 'तैयार रखने वाले दस्तावेज़', te: 'సిద్ధం చేసుకోవాల్సిన పత్రాలు' },
  'Source checked': { hi: 'स्रोत जाँच की तारीख', te: 'మూలాన్ని తనిఖీ చేసిన తేదీ' },
  'Check eligibility': { hi: 'पात्रता जाँचें', te: 'అర్హతను తనిఖీ చేయండి' },
  'Check criteria': { hi: 'मानदंड जाँचें', te: 'ప్రమాణాలను తనిఖీ చేయండి' },
  'Save scheme': { hi: 'योजना सहेजें', te: 'పథకాన్ని భద్రపరచండి' },
  'Remove saved scheme': { hi: 'सहेजी योजना हटाएँ', te: 'భద్రపరచిన పథకాన్ని తొలగించండి' },
  'Your recommendations are on the way': { hi: 'आपके लिए सुझाव तैयार हो रहे हैं', te: 'మీ కోసం సూచనలు సిద్ధమవుతున్నాయి' },
  'Complete your profile to get a more tailored starting point.': { hi: 'अधिक उपयुक्त सुझाव पाने के लिए प्रोफ़ाइल पूरी करें।', te: 'మరింత అనుకూలమైన సూచనలు పొందేందుకు ప్రొఫైల్‌ను పూర్తి చేయండి.' },
  'Set up profile': { hi: 'प्रोफ़ाइल बनाएँ', te: 'ప్రొఫైల్‌ను ఏర్పాటు చేయండి' },
  'Catalog fallback': { hi: 'योजना सूची से उत्तर', te: 'పథక జాబితా ఆధారిత సమాధానం' },
  'The AI assistant is temporarily unavailable. I am using the scheme information available here.': { hi: 'AI सहायक अभी उपलब्ध नहीं है। मैं यहाँ उपलब्ध योजना की जानकारी से आपकी मदद कर रहा हूँ।', te: 'AI సహాయకుడు ప్రస్తుతం అందుబాటులో లేరు. ఇక్కడ ఉన్న పథక సమాచారంతో సహాయం చేస్తున్నాను.' },
  'Criterion:': { hi: 'मानदंड:', te: 'ప్రమాణం:' },
  'Still needed:': { hi: 'अभी आवश्यक:', te: 'ఇంకా అవసరమైనవి:' },
  'File:': { hi: 'फ़ाइल:', te: 'ఫైల్:' },
  'I could not reach the scheme service. Please try again once the API is running.': { hi: 'योजना सेवा से संपर्क नहीं हो सका। API शुरू होने के बाद फिर प्रयास करें।', te: 'పథక సేవను చేరుకోలేకపోయాను. API ప్రారంభమైన తర్వాత మళ్లీ ప్రయత్నించండి.' },
  '. How can I help?': { hi: '। मैं आपकी कैसे मदद कर सकता हूँ?', te: '। నేను మీకు ఎలా సహాయపడగలను?' },
  'Farmer family owns cultivable land recorded in State/UT land records': { hi: 'किसान परिवार के पास राज्य/केंद्रशासित प्रदेश के भूमि अभिलेखों में दर्ज खेती योग्य भूमि है', te: 'రైతు కుటుంబానికి రాష్ట్రం/కేంద్రపాలిత ప్రాంత భూ రికార్డుల్లో నమోదైన సాగుభూమి ఉంది' },
  "No member falls under the scheme's exclusion categories": { hi: 'परिवार का कोई सदस्य योजना की अपवर्जन श्रेणियों में नहीं आता', te: 'కుటుంబ సభ్యుల్లో ఎవరూ పథకం మినహాయింపు వర్గాల్లోకి రారు' },
  'State/UT verification is required': { hi: 'राज्य/केंद्रशासित प्रदेश द्वारा सत्यापन आवश्यक है', te: 'రాష్ట్రం/కేంద్రపాలిత ప్రాంత ధృవీకరణ అవసరం' },
  'Senior citizen is aged 70 or above': { hi: 'वरिष्ठ नागरिक की आयु 70 वर्ष या उससे अधिक है', te: 'సీనియర్ పౌరుడి వయస్సు 70 లేదా అంతకంటే ఎక్కువ' },
  'Age is determined using the identity record accepted by the official enrolment process': { hi: 'आयु आधिकारिक नामांकन प्रक्रिया में स्वीकार किए गए पहचान अभिलेख के आधार पर तय होती है', te: 'అధికారిక నమోదు ప్రక్రియ ఆమోదించిన గుర్తింపు రికార్డు ఆధారంగా వయస్సు నిర్ణయించబడుతుంది' },
  'Official enrolment and e-KYC are required': { hi: 'आधिकारिक नामांकन और ई-KYC आवश्यक हैं', te: 'అధికారిక నమోదు మరియు ఈ-KYC అవసరం' },
  'Applicant is pregnant or lactating and is in the scheme age range (the exact lower age is 18 years 7 months)': { hi: 'आवेदक गर्भवती या स्तनपान कराने वाली हैं और योजना की आयु सीमा में आती हैं (न्यूनतम आयु 18 वर्ष 7 माह)', te: 'దరఖాస్తుదారు గర్భవతి లేదా పాలిచ్చే తల్లి అయి, పథకం వయస్సు పరిధిలో ఉండాలి (కనీస వయస్సు 18 సంవత్సరాల 7 నెలలు)' },
  'Applicant belongs to at least one eligible social/economic category listed by the Ministry': { hi: 'आवेदक मंत्रालय द्वारा सूचीबद्ध कम से कम एक पात्र सामाजिक/आर्थिक श्रेणी में आती हैं', te: 'దరఖాస్తుదారు మంత్రిత్వ శాఖ జాబితాలోని కనీసం ఒక అర్హ సామాజిక/ఆర్థిక వర్గానికి చెందాలి' },
  'Benefit is for first living child; second-child benefit applies when the second child is a girl': { hi: 'लाभ पहले जीवित बच्चे के लिए है; दूसरे बच्चे के लिए लाभ तभी लागू होता है जब वह लड़की हो', te: 'మొదటి జీవించి ఉన్న బిడ్డకు ప్రయోజనం వర్తిస్తుంది; రెండవ బిడ్డ అమ్మాయి అయితేనే రెండవ బిడ్డ ప్రయోజనం వర్తిస్తుంది' },
  'Required registration and health-care milestones must be completed': { hi: 'आवश्यक पंजीकरण और स्वास्थ्य देखभाल के चरण पूरे होने चाहिए', te: 'అవసరమైన నమోదు మరియు ఆరోగ్య సంరక్షణ దశలు పూర్తిచేయాలి' },
  'Profile does not indicate pregnant or lactating': { hi: 'प्रोफ़ाइल में गर्भावस्था या स्तनपान की स्थिति दर्ज नहीं है', te: 'ప్రొఫైల్‌లో గర్భధారణ లేదా పాలిచ్చే స్థితి సూచించబడలేదు' },
  'Selected category is not in the listed PMMVY categories': { hi: 'चुनी गई श्रेणी PMMVY की सूचीबद्ध श्रेणियों में नहीं है', te: 'ఎంచుకున్న వర్గం PMMVY జాబితాలో లేదు' },
  'Second-child benefit is specified for a girl child': { hi: 'दूसरे बच्चे का लाभ लड़की के लिए निर्धारित है', te: 'రెండవ బిడ్డ ప్రయోజనం ఆడపిల్లకు నిర్దేశించబడింది' },
  'PMJDY basic account opening is for persons without an existing account': { hi: 'PMJDY में मूल खाता उन लोगों के लिए है जिनका पहले से खाता नहीं है', te: 'ఇప్పటికే ఖాతా లేని వారి కోసం PMJDY ప్రాథమిక ఖాతా తెరవబడుతుంది' },
  'A basic savings bank deposit account can be opened by a person not already holding another account': { hi: 'जिस व्यक्ति का पहले से कोई अन्य खाता नहीं है, वह मूल बचत बैंक जमा खाता खोल सकता है', te: 'ఇప్పటికే మరొక ఖాతా లేని వ్యక్తి ప్రాథమిక పొదుపు బ్యాంకు డిపాజిట్ ఖాతా తెరవవచ్చు' },
  'Bank completes applicable KYC and account-opening checks': { hi: 'बैंक लागू KYC और खाता खोलने की जाँच पूरी करता है', te: 'బ్యాంకు వర్తించే KYC మరియు ఖాతా ప్రారంభ తనిఖీలను పూర్తి చేస్తుంది' },
  'Insurance, overdraft and pension features have separate conditions and are not guaranteed': { hi: 'बीमा, ओवरड्राफ्ट और पेंशन सुविधाओं की अलग शर्तें हैं और उनकी गारंटी नहीं है', te: 'బీమా, ఓవర్‌డ్రాఫ్ట్ మరియు పెన్షన్ సౌకర్యాలకు వేర్వేరు షరతులు ఉంటాయి; అవి హామీ కావు' },
};

function phraseTranslation(value: string, language: Language): string {
  if (language === 'English') return value;
  const translated = translations[value];
  if (translated) return language === 'हिन्दी' ? translated.hi : translated.te;

  const welcome = value.match(/^Welcome, (.+)$/);
  if (welcome) return `${language === 'हिन्दी' ? 'स्वागत है,' : 'స్వాగతం,'} ${welcome[1]}`;
  if (value === 'Namaste') return language === 'हिन्दी' ? 'नमस्ते' : 'నమస్కారం';
  const applicationStatus = value.match(/^Application status for (.+)$/);
  if (applicationStatus) return `${language === 'हिन्दी' ? 'आवेदन की स्थिति:' : 'దరఖాస్తు స్థితి:'} ${applicationStatus[1]}`;
  const fileName = value.match(/^File: (.+)$/);
  if (fileName) return `${language === 'हिन्दी' ? 'फ़ाइल:' : 'ఫైల్:'} ${fileName[1]}`;
  const fallback = value.match(/^Catalog fallback \(([^)]+)\)\.$/);
  if (fallback) {
    const errors: Record<string, Translation> = {
      missing_api_key: { hi: 'API कुंजी उपलब्ध नहीं', te: 'API కీ అందుబాటులో లేదు' },
      provider_http_503: { hi: 'सेवा अस्थायी रूप से अनुपलब्ध (503)', te: 'సేవ తాత్కాలికంగా అందుబాటులో లేదు (503)' },
      quota_or_rate_limit: { hi: 'कोटा या अनुरोध सीमा पूरी हुई', te: 'కోటా లేదా అభ్యర్థన పరిమితి చేరింది' },
      provider_timeout: { hi: 'सेवा से उत्तर मिलने में समय लगा', te: 'సేవ స్పందనకు సమయం మించిపోయింది' },
    };
    const detail = errors[fallback[1]]?.[language === 'हिन्दी' ? 'hi' : 'te'] ?? fallback[1].replace(/_/g, ' ');
    return `${language === 'हिन्दी' ? 'योजना सूची से उत्तर' : 'పథక జాబితా ఆధారిత సమాధానం'} (${detail}).`;
  }
  return value;
}

export function translateText(value: string, language: Language): string {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return value;
  return `${match[1]}${phraseTranslation(match[2], language)}${match[3]}`;
}

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (value: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_STORAGE_KEY = 'jansaarthi-language';

function normalizeLanguage(value: string | null | undefined): Language {
  if (value === 'हिन्दी' || value?.toLowerCase().includes('hindi')) return 'हिन्दी';
  if (value === 'తెలుగు' || value?.toLowerCase().includes('telugu')) return 'తెలుగు';
  return 'English';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'English';
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  });
  const setLanguage = useCallback((value: string) => {
    const next = normalizeLanguage(value);
    updateLanguage(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);
  const t = useCallback((value: string) => translateText(value, language), [language]);
  useEffect(() => {
    document.documentElement.lang = language === 'हिन्दी' ? 'hi' : language === 'తెలుగు' ? 'te' : 'en';
  }, [language]);
  const context = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

function localizeNode(node: React.ReactNode, t: (value: string) => string): React.ReactNode {
  if (typeof node === 'string') return t(node);
  if (Array.isArray(node)) return node.map((child, index) => <React.Fragment key={index}>{localizeNode(child, t)}</React.Fragment>);
  if (!isValidElement(node)) return node;

  const props = node.props as Record<string, unknown>;
  if (props['data-no-translate']) return node;
  const localizedProps = { ...props };
  for (const attribute of ['title', 'placeholder', 'aria-label', 'aria-description', 'alt']) {
    if (typeof localizedProps[attribute] === 'string') localizedProps[attribute] = t(localizedProps[attribute] as string);
  }
  return props.children === undefined
    ? cloneElement(node, localizedProps)
    : cloneElement(node, localizedProps, localizeNode(props.children as React.ReactNode, t));
}

export function LocalizedContent({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return <>{localizeNode(children, t)}</>;
}
