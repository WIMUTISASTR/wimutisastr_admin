const KHMER_SCRIPT = /[\u1780-\u17FF\u19E0-\u19FF]/;

const EXACT_TRANSLATIONS: Record<string, string> = {
  "failed to load book": "ផ្ទុកឯកសារមិនជោគជ័យ។",
  "failed to fetch book": "ផ្ទុកឯកសារមិនជោគជ័យ។",
  "failed to update book": "ធ្វើបច្ចុប្បន្នភាពឯកសារមិនជោគជ័យ។",
  "failed to upload book": "ផ្ទុកឯកសារមិនជោគជ័យ។",
  "please fix the highlighted fields.": "សូមកែប្រែវាលដែលបានសម្គាល់។",
  "please select a main category.": "សូមជ្រើសរើសប្រភេទចម្បង។",
  "book updated successfully!": "ឯកសារត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!",
  "category deleted successfully!": "ប្រភេទត្រូវបានលុបដោយជោគជ័យ!",
  "category updated successfully!": "ប្រភេទត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!",
  "category created successfully!": "ប្រភេទត្រូវបានបង្កើតដោយជោគជ័យ!",
  "failed to delete category": "លុបប្រភេទមិនជោគជ័យ។",
  "failed to save category": "រក្សាទុកប្រភេទមិនជោគជ័យ។",
  "failed to upload cover image, continuing without it":
    "ផ្ទុករូបតំណាងមិនជោគជ័យ បន្តដោយគ្មានរូបតំណាង។",
  "video deleted successfully!": "វីដេអូត្រូវបានលុបដោយជោគជ័យ!",
  "failed to delete video": "លុបវីដេអូមិនជោគជ័យ។",
  "failed to update video": "ធ្វើបច្ចុប្បន្នភាពវីដេអូមិនជោគជ័យ។",
  "book deleted successfully!": "ឯកសារត្រូវបានលុបដោយជោគជ័យ!",
  "failed to delete book": "លុបឯកសារមិនជោគជ័យ។",
  "user deleted successfully!": "អ្នកប្រើប្រាស់ត្រូវបានលុបដោយជោគជ័យ!",
  "failed to delete user": "លុបអ្នកប្រើប្រាស់មិនជោគជ័យ។",
  "failed to update membership status": "ធ្វើបច្ចុប្បន្នភាពស្ថានភាពសមាជិកមិនជោគជ័យ។",
  "failed to load subscription plan": "ផ្ទុកគម្រោងសមាជិកមិនជោគជ័យ។",
  "subscription plan created successfully!": "គម្រោងសមាជិកត្រូវបានបង្កើតដោយជោគជ័យ!",
  "subscription plan updated successfully!": "គម្រោងសមាជិកត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!",
  "subscription plan deleted successfully!": "គម្រោងសមាជិកត្រូវបានលុបដោយជោគជ័យ!",
  "failed to create subscription plan": "បង្កើតគម្រោងសមាជិកមិនជោគជ័យ។",
  "failed to update subscription plan": "ធ្វើបច្ចុប្បន្នភាពគម្រោងសមាជិកមិនជោគជ័យ។",
  "failed to delete subscription plan": "លុបគម្រោងសមាជិកមិនជោគជ័យ។",
  "failed to update payment proof": "ធ្វើបច្ចុប្បន្នភាពបង្កាត់បង់ប្រាក់មិនជោគជ័យ។",
  "payment proof approved successfully!": "បង្កាត់បង់ប្រាក់ត្រូវបានទទួលដោយជោគជ័យ!",
  "payment proof rejected successfully!": "បង្កាត់បង់ប្រាក់ត្រូវបានបដិសេធដោយជោគជ័យ!",
  "upload failed. please try again.": "ការផ្ទុកបានបរាជ័យ។ សូមព្យាយាមម្តងទៀត។",
  "failed to render document": "មិនអាចបង្ហាញឯកសារបានទេ។",
  "failed to get file url from upload response": "ផ្ទុកឯកសារមិនជោគជ័យ។ មិនទទួលបានតំណភ្ជាប់ឯកសារ។",
  "not found": "មិនរកឃើញទិន្នន័យដែលស្នើ។",
  "unauthorized": "អ្នកមិនមានសិទ្ធិចូលប្រើទេ។",
  "forbidden": "អ្នកមិនមានសិទ្ធិធ្វើសកម្មភាពនេះទេ។",
  "invalid login credentials": "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។",
  "invalid email or password. please verify your credentials in supabase dashboard.":
    "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។",
  "please confirm your email address before logging in.": "សូមបញ្ជាក់អ៊ីមែលរបស់អ្នក មុនចូលប្រើប្រាស់។",
  "user not found. please create the user in supabase dashboard first.":
    "មិនរកឃើញអ្នកប្រើប្រាស់។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។",
  "access denied. only admin email is allowed.": "ការចូលប្រើត្រូវបានបដិសេធ។ អនុញ្ញាតតែអ៊ីមែលអ្នកគ្រប់គ្រងប៉ុណ្ណោះ។",
  "authentication failed. please check your credentials.":
    "ការផ្ទៀងផ្ទាត់បរាជ័យ។ សូមពិនិត្យអ៊ីមែល និងពាក្យសម្ងាត់ម្តងទៀត។",
};

const PATTERN_TRANSLATIONS: Array<{ test: RegExp; translate: (match: RegExpMatchArray) => string }> = [
  {
    test: /^http\s+(\d+)$/i,
    translate: (m) => `មានកំហុស (${m[1]})។ សូមព្យាយាមម្តងទៀត។`,
  },
  {
    test: /^user membership\s+(approved|denied|pending)!$/i,
    translate: (m) => {
      const labels: Record<string, string> = {
        approved: "បានទទួល",
        denied: "បានបដិសេធ",
        pending: "កំពុងរង់ចាំ",
      };
      const key = m[1].toLowerCase();
      return `ស្ថានភាពសមាជិកអ្នកប្រើប្រាស់ ${labels[key] ?? m[1]}!`;
    },
  },
  {
    test: /^payment proof\s+(approved|rejected)\s+successfully!$/i,
    translate: (m) =>
      m[1].toLowerCase() === "approved"
        ? "បង្កាត់បង់ប្រាក់ត្រូវបានទទួលដោយជោគជ័យ!"
        : "បង្កាត់បង់ប្រាក់ត្រូវបានបដិសេធដោយជោគជ័យ!",
  },
  {
    test: /invalid file type\. allowed:/i,
    translate: (m) => {
      const allowed = m[0].split(":")[1]?.trim();
      return allowed
        ? `ប្រភេទឯកសារមិនត្រឹមត្រូវ។ អនុញ្ញាត៖ ${allowed}`
        : "ប្រភេទឯកសារមិនត្រឹមត្រូវ។";
    },
  },
  {
    test: /book file must be less than/i,
    translate: (m) => {
      const size = m[0].split("less than")[1]?.trim();
      return size
        ? `ឯកសារត្រូវតែតូចជាង ${size}`
        : "ទំហំឯកសារធំពេកពេក។";
    },
  },
];

const GENERIC_ERROR = "មានកំហុសមិនបានរំពឹងទុក។ សូមព្យាយាមម្តងទៀត។";

function normalizeKey(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function isMostlyLatin(text: string): boolean {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const khmer = (text.match(KHMER_SCRIPT) ?? []).length;
  return latin > khmer * 2;
}

export function translateToastMessage(message: string): string {
  const trimmed = normalizeKey(message);
  if (!trimmed) return GENERIC_ERROR;
  // Any message containing Khmer script is an app-authored, already-localized string
  // (it may also embed Latin titles/filenames/sizes). Always show it verbatim instead of
  // letting it fall through to GENERIC_ERROR.
  if (KHMER_SCRIPT.test(trimmed)) {
    return trimmed;
  }

  const exact = EXACT_TRANSLATIONS[trimmed.toLowerCase()];
  if (exact) return exact;

  for (const { test, translate } of PATTERN_TRANSLATIONS) {
    const match = trimmed.match(test);
    if (match) return translate(match);
  }

  if (isMostlyLatin(trimmed)) {
    return GENERIC_ERROR;
  }

  return trimmed;
}
