const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// 1. التأكد من وجود المجلدات المطلوبة عند تشغيل السيرفر
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ تم إنشاء مجلد uploads بنجاح');
}

// 2. إعداد التخزين (Multer Storage)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // تنظيف اسم الملف وإضافة تايم-ستامب لمنع التكرار
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(cleanName));
    }
});

// إعداد ملتر لاستقبال مصفوفة من الصور (بحد أقصى 20 صورة في المرة)
const upload = multer({ storage });

// الإعدادات الوسيطة
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. قاعدة البيانات (JSON)
const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));

// --- المسارات (Routes) ---

/**
 * تعديل مسار الرفع ليدعم اختيار صور متعددة
 * images: هو اسم الحقل (name) في الـ HTML
 */
app.post('/upload', upload.array('images', 20), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('لم يتم اختيار أي صور للرفع!');
        }

        const data = fs.readFileSync(dbPath);
        const products = JSON.parse(data);

        // معالجة كل ملف تم رفعه وإضافته لقاعدة البيانات
        req.files.forEach(file => {
            const newProduct = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), // معرف فريد نصي
                category: req.body.category || 'غير مصنف',
                image: '/uploads/' + file.filename,
                uploadDate: new Date().toISOString()
            };
            products.push(newProduct);
        });

        fs.writeFileSync(dbPath, JSON.stringify(products, null, 2));
        
        // العودة للوحة التحكم بعد النجاح
        res.redirect('/dashboard.html');
    } catch (error) {
        console.error("خطأ أثناء الرفع المتعدد:", error);
        res.status(500).send("حدث خطأ في السيرفر أثناء معالجة الصور.");
    }
});

// جلب المنتجات
app.get('/api/products', (req, res) => {
    try {
        const data = fs.readFileSync(dbPath);
        res.json(JSON.parse(data));
    } catch (e) {
        res.json([]);
    }
});

// حذف منتج
app.delete('/api/products/:id', (req, res) => {
    try {
        let products = JSON.parse(fs.readFileSync(dbPath));
        const product = products.find(p => String(p.id) === String(req.params.id));
        
        if (product) {
            const imagePath = path.join(__dirname, 'public', product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            products = products.filter(p => String(p.id) !== String(req.params.id));
            fs.writeFileSync(dbPath, JSON.stringify(products, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "فشل الحذف" });
    }
});

app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 سيرفر جودي المطور يعمل الآن!`);
    console.log(`🔗 لوحة التحكم: http://localhost:${PORT}/dashboard.html`);
    console.log(`📸 خاصية الرفع المتعدد: مفعلة (حتى 20 صورة)`);
    console.log(`-------------------------------------------`);
});