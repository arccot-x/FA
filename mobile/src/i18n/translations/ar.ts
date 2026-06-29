import type { Translations } from "./en";

export const ar: Translations = {
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    close: "إغلاق",
    edit: "تعديل",
    add: "إضافة",
    done: "تم",
    delete: "حذف",
    amount: "المبلغ",
    category: "الفئة",
    optional: "اختياري",
    loading: "جارٍ التحميل"
  },
  tabs: {
    home: "الرئيسية",
    bills: "الفواتير",
    vault: "الخزنة",
    analytics: "التحليلات",
    settings: "الإعدادات"
  },
  auth: {
    appName: "فريكشنلس فاينانس",
    tagline: "احفظ فواتيرك وإيصالاتك وملفاتك ودخلك في حسابك.",
    login: "دخول",
    create: "إنشاء",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    loginCta: "تسجيل الدخول",
    createCta: "إنشاء حساب",
    invalidLogin: "أدخل بريدك وكلمة مرور من 8 أحرف على الأقل.",
    invalidRegister: "أدخل اسمك وبريدك وكلمة مرور من 8 أحرف على الأقل.",
    genericError: "حدث خطأ ما. حاول مرة أخرى."
  },
  loadingAccount: "جارٍ فتح حسابك",
  home: {
    title: "اللوحة",
    subtitle: "ملخص هذا الشهر",
    offline: "غير متصل — آخر بيانات محفوظة",
    safeToSpend: "متاح للإنفاق",
    perDay: "{amount}/يوم",
    daysToPayday: "{days} يوم حتى الراتب",
    paydayToday: "اليوم هو يوم الراتب",
    incomeUsed: "تم استخدام {percent}٪ من الدخل",
    usedShort: "مستخدم",
    available: "المتبقي",
    unpaidBills: "فواتير غير مدفوعة",
    income: "الدخل",
    spent: "المصروف",
    recentActivity: "آخر الحركات",
    pendingCount: "{count} قيد الانتظار",
    pendingReceipt: "إيصال معلق",
    tapToAdd: "اضغط لإضافة التفاصيل",
    noActivity: "لا توجد حركات بعد. أضف أول مصروف.",
    quickAdd: "إضافة سريعة"
  },
  income: {
    title: "الدخل",
    monthlyIncome: "الدخل الشهري",
    payday: "يوم الراتب",
    variable: "دخل متغير",
    variableHint: "حدد دخلاً متوقعاً خاصاً لهذا الشهر.",
    expectedThisMonth: "الدخل المتوقع هذا الشهر",
    received: "وضع علامة كمستلَم",
    receivedHint: "تتبّع الأموال التي وصلت فعلاً.",
    save: "حفظ الدخل",
    presets: "مبالغ سريعة",
    receivedBadge: "مستلَم",
    expectedBadge: "متوقع"
  },
  quickAdd: {
    title: "إضافة سريعة",
    saveExpense: "حفظ المصروف"
  },
  pending: {
    title: "إكمال الإيصال",
    merchant: "المتجر",
    notes: "ملاحظات",
    saveExpense: "حفظ المصروف"
  },
  transaction: {
    editTitle: "تعديل المصروف",
    deleteTitle: "حذف المصروف؟",
    deleteMessage: "سيُحذف هذا المصروف نهائياً.",
    delete: "حذف المصروف"
  },
  budgets: {
    title: "الميزانيات",
    subtitle: "حدود شهرية حسب الفئة",
    empty: "حدد حداً شهرياً لفئة لتتبعها هنا.",
    manage: "تحديد الميزانيات",
    editTitle: "الميزانيات الشهرية",
    cap: "الحد الشهري",
    of: "{spent} من {cap}",
    left: "متبقٍ {amount}",
    over: "تجاوز {amount}"
  },
  reminders: {
    title: "تذكيرات الفواتير",
    enable: "ذكّرني قبل استحقاق الفواتير",
    hint: "احصل على إشعار قبل أيام من كل فاتورة غير مدفوعة.",
    daysBefore: "عدد الأيام قبل الاستحقاق",
    denied: "الإشعارات مغلقة. فعّلها من إعدادات النظام.",
    notifTitle: "{bill} يقترب موعدها",
    notifBody: "{bill} · {amount} يقترب موعدها. لا تنسَ الدفع."
  },
  bills: {
    title: "الفواتير",
    subtitle: "غير المدفوعة تبقى في الأعلى",
    remaining: "المتبقي هذا الشهر",
    unpaid: "غير مدفوعة",
    settled: "مدفوعة",
    empty: "لا توجد فواتير بعد. أضف واحدة للبدء.",
    paid: "دُفعت",
    unpay: "تراجع",
    settledLabel: "مدفوعة",
    due: "الاستحقاق {date}",
    newBill: "فاتورة جديدة",
    billName: "اسم الفاتورة",
    billNamePlaceholder: "كهرباء، إيجار، نتفليكس",
    dueDay: "يوم الاستحقاق",
    icon: "الأيقونة",
    createBill: "إنشاء فاتورة",
    editThisMonth: "تعديل هذا الشهر",
    autopay: "دفع تلقائي",
    deleteBill: "حذف الفاتورة",
    deleteTitle: "حذف الفاتورة؟",
    deleteMessage: "ستُحذف هذه الفاتورة وسجلّها."
  },
  vault: {
    title: "الخزنة",
    subtitle: "المستندات والإيصالات منظمة",
    saveDocument: "حفظ المستند",
    docTitle: "العنوان",
    folder: "المجلد",
    upload: "رفع إلى الخزنة",
    noDocuments: "لا مستندات",
    documentCount: "{count} ملف"
  },
  analytics: {
    title: "التحليلات",
    subtitle: "مقارنة شهرية",
    income: "الدخل",
    expenses: "المصروفات",
    incomeVsExpenses: "الدخل مقابل المصروف",
    categoryMix: "توزيع الفئات",
    addExpenses: "أضف مصروفات لعرض اتجاهات الفئات.",
    comparisonLabel: "هذا الشهر",
    bills: "الفواتير",
    cmpFirst: "أنفقت {current} على البقالة هذا الشهر. أضف المزيد من السجل للمقارنة.",
    cmpLess: "أنفقت {current} على البقالة — أقل بـ {delta} من الشهر الماضي.",
    cmpMore: "أنفقت {current} على البقالة — أكثر بـ {delta} من الشهر الماضي."
  },
  settings: {
    title: "الإعدادات",
    appearance: "المظهر",
    theme: "السمة",
    themeSystem: "النظام",
    themeLight: "فاتح",
    themeDark: "داكن",
    language: "اللغة",
    currency: "العملة",
    account: "الحساب",
    incomeSettings: "إعدادات الدخل",
    notifications: "الإشعارات",
    signOut: "تسجيل الخروج",
    about: "حول",
    version: "الإصدار",
    madeWith: "فريكشنلس فاينانس"
  },
  category: {
    GROCERIES: "بقالة",
    DINING: "مطاعم",
    GAS: "وقود",
    TRANSPORT: "مواصلات",
    SHOPPING: "تسوق",
    ENTERTAINMENT: "ترفيه",
    HEALTH: "صحة",
    HOME: "المنزل",
    UTILITIES: "خدمات",
    TRAVEL: "سفر",
    SUBSCRIPTION: "اشتراك",
    OTHER: "أخرى"
  },
  vaultCategory: {
    LEASE: "إيجار",
    TAX: "ضريبة",
    INSURANCE: "تأمين",
    RECEIPT: "إيصال",
    BANKING: "بنوك",
    MEDICAL: "طبي",
    WARRANTY: "ضمان",
    OTHER: "أخرى"
  },
  camera: {
    needAccess: "الوصول إلى الكاميرا مطلوب للإيصالات",
    allow: "السماح للكاميرا"
  },
  activity: {
    title: "كل الحركات",
    search: "ابحث في المصروفات",
    seeAll: "عرض الكل",
    none: "لا توجد مصروفات مطابقة."
  },
  trends: {
    title: "اتجاه الإنفاق",
    empty: "لا يوجد سجل كافٍ بعد — استمر بتسجيل المصروفات."
  },
  goals: {
    title: "أهداف الادخار",
    subtitle: "تتبّع تقدمك نحو هدف",
    empty: "أضف هدفاً لتبدأ الادخار من أجله.",
    add: "إضافة هدف",
    editTitle: "هدف ادخار",
    name: "اسم الهدف",
    namePlaceholder: "صندوق الطوارئ، إجازة",
    target: "المبلغ المستهدف",
    saved: "المدّخر حتى الآن",
    reached: "تحقق",
    remaining: "متبقٍ {amount}",
    delete: "حذف الهدف",
    deleteTitle: "حذف الهدف؟"
  },
  security: {
    title: "الأمان",
    appLock: "قفل التطبيق",
    appLockHint: "اطلب بصمة الوجه / الإصبع لفتح التطبيق.",
    unlockTitle: "مقفل",
    unlockSubtitle: "افتح القفل لعرض أموالك.",
    unlockCta: "فتح القفل",
    unavailable: "القفل البيومتري غير متاح على هذا الجهاز."
  },
  dataExport: {
    title: "البيانات",
    hint: "احفظ مصروفاتك كملف CSV.",
    button: "تصدير CSV",
    nothing: "لا توجد مصروفات للتصدير."
  },
  onboarding: {
    welcome: "أهلاً بك",
    subtitle: "إعدادات سريعة لتخصيص أموالك.",
    incomeStep: "ما هو دخلك الشهري؟",
    paydayStep: "في أي يوم تتقاضى راتبك عادةً؟",
    next: "متابعة",
    start: "ابدأ"
  },
  account: {
    changePassword: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    passwordChanged: "تم تحديث كلمة المرور.",
    deleteAccount: "حذف الحساب",
    deleteTitle: "حذف الحساب؟",
    deleteMessage: "يحذف هذا حسابك وكل بياناته نهائياً. لا يمكن التراجع.",
    deleteConfirm: "احذف كل شيء"
  }
};
