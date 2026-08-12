const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// تم تغيير الاسم ليتطابق مع إعدادات التجاهل وهوية المتجر
const dbPath = path.join(__dirname, 'ageecom.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      rating REAL DEFAULT 4.5,
      reviewsCount INTEGER DEFAULT 12,
      description TEXT,
      image TEXT,
      badge TEXT
    )
  `);

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderCode TEXT UNIQUE NOT NULL,
      customerName TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Processing',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order Items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id)
    )
  `);

  // Check if categories need seeding
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO categories (slug, name, icon) VALUES (?, ?, ?)");
      stmt.run("all", "جميع المنتجات", "🛍️");
      stmt.run("electronics", "إلكترونيات", "💻");
      stmt.run("audio", "سماعـات وصوتيات", "🎧");
      stmt.run("wearables", "ساعات وذكية", "⌚");
      stmt.run("smarthome", "منزل ذكي", "🏠");
      stmt.finalize();
    }
  });

  // Check if products need seeding
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (row && row.count === 0) {
      const initialProducts = [
        {
          name: "حاسوب محمول فائق الأداء - UltraBook Pro X",
          category: "electronics",
          price: 1299.99,
          stock: 15,
          rating: 4.9,
          reviewsCount: 84,
          description: "حاسوب محمول بشاشة OLED مقاس 15.6 بوصة ومعالج ثماني النواة عالي السرعة، مع 32 جيجابايت ذاكرة عشوائية وتصميم ألومنيوم عصري.",
          image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
          badge: "الأكثر مبيعاً"
        },
        {
          name: "سماعات لاسلكية عازلة للضوضاء - SoundPro Max",
          category: "audio",
          price: 249.50,
          stock: 28,
          rating: 4.8,
          reviewsCount: 156,
          description: "تقنية إلغاء الضوضاء النشطة (ANC) متطورة مع بطارية تدوم حتى 40 ساعة وصوت مجسّم 3D Surround.",
          image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
          badge: "خصم 15%"
        },
        {
          name: "ساعة ذكية رياضية - Apex Fit Watch Ultra",
          category: "wearables",
          price: 189.00,
          stock: 20,
          rating: 4.7,
          reviewsCount: 92,
          description: "مقاومة للماء بعمق 50 متر، شاشة AMOLED، ومستشعرات لقياس دقات القلب، الأكسجين، وتتبع أنشطة التمارين.",
          image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
          badge: "جديد"
        },
        {
          name: "كاميرا احترافية بدقة 4K - CyberShot Pro",
          category: "electronics",
          price: 899.00,
          stock: 8,
          rating: 4.9,
          reviewsCount: 45,
          description: "مستشعر CMOS كامل الإطار، تصوير فيديو 4K على 60 إطار بالثانية مع نظام تركيز تلقائي فائق السرعة.",
          image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
          badge: "مميز"
        },
        {
          name: "مكبر صوت محمول ذكي - SoundCube Ambient",
          category: "audio",
          price: 119.99,
          stock: 35,
          rating: 4.6,
          reviewsCount: 78,
          description: "مكبر صوت Bluetooth مع إضاءة RGB تفاعلية ومساعد صوتي ذكي مدمج وبطارية تدوم 20 ساعة.",
          image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80",
          badge: ""
        },
        {
          name: "مصباح ذكي متعدد الألوان - Aura Smart Lamp",
          category: "smarthome",
          price: 49.99,
          stock: 50,
          rating: 4.5,
          reviewsCount: 63,
          description: "تحكم عبر تطبيق الهاتف والمساعدات الصوتية مع 16 مليون لون متاح.",
          image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
          badge: "شائع"
        },
        {
          name: "لوحة مفاتيح ميكانيكية احترافية - Mechanical RGB Pro",
          category: "electronics",
          price: 139.95,
          stock: 18,
          rating: 4.8,
          reviewsCount: 110,
          description: "مفاتيح ميكانيكية فائقة الاستجابة، إضاءة RGB قابلة للتخصيص وهيكل معدني متين لأداء ممتاز.",
          image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
          badge: ""
        },
        {
          name: "شاحن لاسلكي سريع 3-في-1 - MagCharge Trio",
          category: "smarthome",
          price: 69.50,
          stock: 40,
          rating: 4.7,
          reviewsCount: 89,
          description: "منصة شحن مغناطيسية تتيح شحن الهاتف، الساعة الذكية، والسماعات اللاسلكية في نفس الوقت.",
          image: "https://images.unsplash.com/photo-1622445268141-ef4b16ea5cc3?w=600&auto=format&fit=crop&q=80",
          badge: "خصم 10%"
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO products (name, category, price, stock, rating, reviewsCount, description, image, badge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      initialProducts.forEach(p => {
        stmt.run(p.name, p.category, p.price, p.stock, p.rating, p.reviewsCount, p.description, p.image, p.badge);
      });
      stmt.finalize();
      console.log('✅ SQLite database seeded with initial products and categories.');
    }
  });
});

module.exports = db;