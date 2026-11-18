const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const fontPath = 'C\\:/Windows/Fonts/arial.ttf';
const outputDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const tempDir = path.join(__dirname, '..', '.video_temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const slides = [
  {
    num: "1",
    tag: "مقدمة النظام",
    title: "نظام Ultra Pack المتكامل",
    subtitle: "الحل الشامل لإدارة مصانع الكرتون والتعبئة والتغليف",
    points: [
      "• يعمل بالكامل دون الحاجة لاتصال بالإنترنت (Offline-First)",
      "• دورة عمل متكاملة من الشراء حتى التسليم والتحصيل",
      "• دعم كامل للغة العربية والطباعة الرسمية"
    ],
    duration: 6
  },
  {
    num: "2",
    tag: "الخطوة الأولى",
    title: "لوحة القيادة والمؤشرات الحيوية",
    subtitle: "نظرة لحظية وشاملة على صحة وأداء المصنع",
    points: [
      "• متابعة المبيعات المحققة والمتحصلات النقدية الفعلية",
      "• رصد المصروفات التشغيلية ومسحوبات المالك وصافي الربح",
      "• تنبيهات ذكية وفورية لنقص خامات الورق والغراء"
    ],
    duration: 6
  },
  {
    num: "3",
    tag: "الخطوة الثانية",
    title: "المشتريات وإدارة المخازن",
    subtitle: "تأمين الخامات ومنع توقف خطوط الإنتاج",
    points: [
      "• تسجيل الموردين وإصدار أوامر الشراء الرسمية",
      "• إدارة أرصدة الورق (كرافت، دوبلكس) والأحبار ومستلزمات الإنتاج",
      "• تحديث آلي لأرصدة المخزون وحساب متوسط التكلفة"
    ],
    duration: 6
  },
  {
    num: "4",
    tag: "الخطوة الثالثة",
    title: "العملاء وعروض الأسعار والفواتير",
    subtitle: "تصدير رسمي واحترافي لوثائق البيع",
    points: [
      "• إنشاء عروض أسعار تفصيلية بالمقاسات والكميات وصور المنتجات",
      "• تصدير فوري لملفات PDF جاهزة للمشاركة والطباعة",
      "• دعم متقن لمحاذاة وتشكيل الخطوط العربية وحالات السداد"
    ],
    duration: 6
  },
  {
    num: "5",
    tag: "الخطوة الرابعة",
    title: "أوامر التشغيل والإنتاج بالمصنع",
    subtitle: "متابعة صالة التصنيع خطوة بخطوة",
    points: [
      "• تحويل أوامر البيع تلقائياً إلى أوامر تشغيل للمصنع",
      "• توزيع المهام على الماكينات (الطباعة، التكسير، التجميع)",
      "• تحديد مواعيد التسليم وتتبع نسب الإنجاز الفعلي"
    ],
    duration: 6
  },
  {
    num: "6",
    tag: "الخطوة الخامسة",
    title: "إنتاجية العمال ومسير الرواتب",
    subtitle: "حساب دقيق وعادل لمكافآت وحوافز الإنتاج",
    points: [
      "• تسجيل إنتاجية كل عامل بالقطعة أو المتر يومياً",
      "• دمج إنتاجية القطعة مع الراتب الأساسي والخصومات",
      "• إصدار كشوف رواتب مفصلة وتلقائية نهاية كل شهر"
    ],
    duration: 6
  },
  {
    num: "7",
    tag: "الخطوة السادسة",
    title: "الشحن والتسليمات والمصروفات",
    subtitle: "إغلاق حلقة التوريد والتحكم المالي",
    points: [
      "• تتبع بوالص الشحن والسائقين وتأكيد استلام العميل",
      "• تسجيل المصروفات التشغيلية والصيانة والنثريات",
      "• ربط مسحوبات المالك بحسابات الأرباح الصافية"
    ],
    duration: 6
  },
  {
    num: "8",
    tag: "الأمان والسرعة",
    title: "البحث الذكي والنسخ الاحتياطي",
    subtitle: "بياناتك محمية وفي متناول يدك دائماً",
    points: [
      "• بحث شامل فوري في كل بيانات المصنع عبر الاختصار Ctrl + K",
      "• نسخ احتياطي بضغطة زر وتنزيل ملفات JSON آمنة",
      "• بيانات تجريبية متكاملة لتدريب الكوادر الجديدة فوراً"
    ],
    duration: 6
  },
  {
    num: "9",
    tag: "الخاتمة",
    title: "Ultra Pack — نظام متكامل لمصنعك",
    subtitle: "كفاءة إنتاجية أعلى، أخطاء أقل، ووضوح مالي تام",
    points: [
      "• تم إعداد النظام للعمل الفوري بنجاح",
      "• يمكنك مراجعة دليل التشغيل داخل التطبيق في أي وقت",
      "• نتمنى لكم إنتاجاً وفيراً ونجاحاً مستمراً"
    ],
    duration: 6
  }
];

console.log('Generating video slides...');

const segmentFiles = [];

slides.forEach((slide, idx) => {
  const segFile = path.join(tempDir, `seg_${idx}.mp4`);
  segmentFiles.push(segFile);

  const p1 = slide.points[0] || '';
  const p2 = slide.points[1] || '';
  const p3 = slide.points[2] || '';

  const vf = [
    // Background card
    `drawbox=x=80:y=60:w=1120:h=600:color=#121214:t=fill`,
    `drawbox=x=80:y=60:w=1120:h=600:color=#27272a:t=2`,
    // Brand header
    `drawtext=fontfile='${fontPath}':text='ULTRA PACK ERP':fontcolor=#71717a:fontsize=20:x=120:y=95`,
    `drawtext=fontfile='${fontPath}':text='${slide.tag}':fontcolor=#10b981:fontsize=22:x=w-tw-120:y=95`,
    // Divider line
    `drawbox=x=120:y=135:w=1040:h=1:color=#27272a:t=fill`,
    // Title & subtitle
    `drawtext=fontfile='${fontPath}':text='${slide.title}':fontcolor=#ffffff:fontsize=46:x=(w-tw)/2:y=170`,
    `drawtext=fontfile='${fontPath}':text='${slide.subtitle}':fontcolor=#a1a1aa:fontsize=24:x=(w-tw)/2:y=240`,
    // Inner box for points
    `drawbox=x=160:y=300:w=960:h=260:color=#18181b:t=fill`,
    `drawbox=x=160:y=300:w=960:h=260:color=#27272a:t=1`,
    // Bullet points
    `drawtext=fontfile='${fontPath}':text='${p1}':fontcolor=#f4f4f5:fontsize=26:x=w-tw-200:y=340`,
    `drawtext=fontfile='${fontPath}':text='${p2}':fontcolor=#f4f4f5:fontsize=26:x=w-tw-200:y=410`,
    `drawtext=fontfile='${fontPath}':text='${p3}':fontcolor=#f4f4f5:fontsize=26:x=w-tw-200:y=480`,
    // Footer progress
    `drawtext=fontfile='${fontPath}':text='الصفحة ${slide.num} من ${slides.length}':fontcolor=#71717a:fontsize=18:x=(w-tw)/2:y=615`
  ].join(',');

  const cmd = `ffmpeg -y -f lavfi -i color=c=#09090b:s=1280x720:d=${slide.duration} -vf "${vf}" -c:v libx264 -pix_fmt yuv420p "${segFile}"`;
  execSync(cmd, { stdio: 'pipe' });
  console.log(`Generated slide ${idx + 1}/${slides.length}`);
});

// Create concat list
const listFile = path.join(tempDir, 'concat_list.txt');
const listContent = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
fs.writeFileSync(listFile, listContent);

const finalVideo = path.join(outputDir, 'ultrapack_tutorial.mp4');
console.log('Concatenating slides and generating background audio tone...');

// Concatenate and add subtle ambient audio so it plays with audio
const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile.replace(/\\/g, '/')}" -f lavfi -i "sine=frequency=440:beep_factor=0:duration=54" -filter_complex "[1:a]volume=0.01[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -shortest "${finalVideo.replace(/\\/g, '/')}"`;

execSync(concatCmd, { stdio: 'pipe' });
console.log(`Tutorial video successfully created: ${finalVideo}`);

// Cleanup temp files
segmentFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e){} });
try { fs.unlinkSync(listFile); } catch(e){}
try { fs.rmdirSync(tempDir); } catch(e){}
