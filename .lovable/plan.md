

# خطة تطوير CyberGuard AI ليصبح أقوى

## الوضع الحالي

المشروع حالياً يحتوي على:
- ~60 أداة أمنية (فحص، هجوم، دفاع)
- وضع اختبار شامل مستقل (5 جولات، 120 ثانية)
- بث نتائج لحظي (Streaming)
- خاصية التعافي الذاتي (Self-Healing)
- بوت تيليجرام

---

## التحسينات المقترحة

### 1. ذاكرة ذكية بين الجلسات (Persistent Memory)

حالياً الوكيل يبدأ من الصفر في كل محادثة. التحسين يتضمن:
- حفظ نتائج الفحوصات السابقة لكل هدف في جدول `scan_results`
- عند فحص هدف سبق فحصه، يبدأ من حيث انتهى ويقارن النتائج
- أداة جديدة `recall_target` يستخدمها الوكيل لاسترجاع بيانات سابقة

### 2. تقارير احترافية قابلة للتصدير

- توليد تقرير HTML/Markdown منسق بعد كل اختبار شامل
- يشمل: ملخص تنفيذي، نقاط الضعف مرتبة بالخطورة، توصيات
- زر "تصدير التقرير" يظهر بعد انتهاء الاختبار الشامل

### 3. نظام تقييم أمني (Security Score)

- حساب درجة أمان من 0-100 لكل هدف
- تقسيم الدرجة: SSL (20)، Headers (20)، DNS (15)، ثغرات (25)، بريد (10)، WAF (10)
- عرض بصري بألوان (أحمر/أصفر/أخضر) مع رسم بياني

### 4. وضع المراقبة المستمرة (Monitoring Mode)

- مراقبة هدف بشكل دوري (كل ساعة/يوم)
- تنبيه عبر تيليجرام عند اكتشاف تغيير أو ثغرة جديدة
- جدول `monitored_targets` لحفظ الأهداف المراقبة

### 5. تحسين واجهة المستخدم

- **شريط تقدم مرئي** أثناء الاختبار الشامل (الجولة الحالية، الوقت المتبقي، الأدوات المنفذة)
- **عرض النتائج في جداول** بدل النصوص العادية
- **وضع مظلم/فاتح** محسّن
- **لوحة إحصائيات** تعرض عدد الفحوصات، الأهداف، الثغرات المكتشفة

### 6. أدوات جديدة متقدمة

- **Screenshot Tool**: التقاط صورة لموقع عبر API خارجي
- **CVE Search**: البحث عن ثغرات معروفة لتقنية معينة
- **DNS Zone Transfer Test**: اختبار نقل المنطقة
- **Cloud Metadata Check**: فحص تسرب بيانات السحابة
- **Security.txt Check**: فحص ملف security.txt

---

## التفاصيل التقنية

### جدول scan_results (ذاكرة الفحوصات)

```text
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  result TEXT NOT NULL,
  security_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### جدول monitored_targets (المراقبة)

```text
CREATE TABLE monitored_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  interval_hours INTEGER DEFAULT 24,
  last_check TIMESTAMPTZ,
  last_score INTEGER,
  telegram_chat_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### تعديلات cyber-chat/index.ts

- إضافة أدوات: `recall_target`, `save_scan_result`, `generate_report`, `set_monitor`
- إضافة حساب Security Score بعد الاختبار الشامل
- تحسين System Prompt لتوجيه الوكيل لاستخدام الذاكرة

### تعديلات الواجهة

- مكون `ProgressBar.tsx` جديد لعرض تقدم الاختبار الشامل
- مكون `SecurityScore.tsx` لعرض الدرجة بشكل بصري
- مكون `ReportExport.tsx` لتصدير التقارير
- تحديث `ChatMessage.tsx` لعرض الجداول والدرجات

### Edge Function جديدة: monitor-check

- تعمل عبر Cron job أو استدعاء خارجي
- تفحص الأهداف المراقبة وترسل تنبيهات تيليجرام

---

## أولوية التنفيذ

1. نظام التقييم الأمني + شريط التقدم (تأثير بصري فوري)
2. التقارير القابلة للتصدير (قيمة عملية عالية)
3. الذاكرة الذكية (تحسين الأداء)
4. الأدوات الجديدة (توسيع القدرات)
5. نظام المراقبة (ميزة متقدمة)

