const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Get Categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. Get Products (Filter, Search, Sort)
app.get('/api/products', (req, res) => {
  const { category, search, sort, maxPrice } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (maxPrice) {
    sql += ' AND price <= ?';
    params.push(parseFloat(maxPrice));
  }

  if (sort === 'price-low') {
    sql += ' ORDER BY price ASC';
  } else if (sort === 'price-high') {
    sql += ' ORDER BY price DESC';
  } else if (sort === 'rating') {
    sql += ' ORDER BY rating DESC';
  } else {
    sql += ' ORDER BY id DESC';
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. Get Single Product
app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(row);
  });
});

// 4. Create Product (Admin Endpoint)
app.post('/api/products', (req, res) => {
  const { name, category, price, stock, description, image, badge } = req.body;
  if (!name || !category || !price || stock === undefined) {
    return res.status(400).json({ error: 'الرجاء تزويد جميع البيانات المطلوبة للمنتج' });
  }

  const sql = `
    INSERT INTO products (name, category, price, stock, description, image, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const defaultImg = image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';

  db.run(sql, [name, category, parseFloat(price), parseInt(stock), description || '', defaultImg, badge || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'تم إضافة المنتج بنجاح' });
  });
});

// 5. Update Product Stock / Price (Admin)
app.put('/api/products/:id', (req, res) => {
  const { price, stock, name, category, badge } = req.body;
  const sql = `
    UPDATE products 
    SET price = COALESCE(?, price),
        stock = COALESCE(?, stock),
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        badge = COALESCE(?, badge)
    WHERE id = ?
  `;

  db.run(sql, [price, stock, name, category, badge, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'تم تحديث البيانات بنجاح' });
  });
});

// 6. Delete Product (Admin)
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'تم حذف المنتج بنجاح' });
  });
});

// 7. Checkout Process & Order Creation
app.post('/api/orders', (req, res) => {
  const { customerName, email, address, city, paymentMethod, items, promoCode } = req.body;

  if (!customerName || !email || !address || !items || !items.length) {
    return res.status(400).json({ error: 'بيانات طلب الشراء غير مكتملة' });
  }

  // Calculate totals backend-side to ensure security
  let subtotal = 0;
  items.forEach(item => {
    subtotal += item.price * item.quantity;
  });

  let discount = 0;
  if (promoCode === 'PROMO10') discount = subtotal * 0.10;
  if (promoCode === 'APEX20') discount = subtotal * 0.20;

  const tax = (subtotal - discount) * 0.14; // 14% VAT
  const total = subtotal - discount + tax;
  const orderCode = 'APX-' + Math.floor(100000 + Math.random() * 900000);

  // Insert Order
  const sqlOrder = `
    INSERT INTO orders (orderCode, customerName, email, address, city, paymentMethod, subtotal, discount, tax, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing')
  `;

  db.run(sqlOrder, [orderCode, customerName, email, address, city || 'الرياض', paymentMethod || 'Card', subtotal, discount, tax, total], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = this.lastID;

    // Insert Order Items and Update Product Stocks
    const stmtItem = db.prepare(`
      INSERT INTO order_items (orderId, productId, productName, quantity, unitPrice)
      VALUES (?, ?, ?, ?, ?)
    `);

    const stmtStock = db.prepare(`
      UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
    `);

    items.forEach(item => {
      stmtItem.run(orderId, item.id, item.name, item.quantity, item.price);
      stmtStock.run(item.quantity, item.id);
    });

    stmtItem.finalize();
    stmtStock.finalize();

    res.status(201).json({
      success: true,
      orderCode,
      orderId,
      subtotal,
      discount,
      tax,
      total,
      message: 'تم إتمام الطلب بنجاح وتحديث المخزون!'
    });
  });
});

// 8. Get Order History
app.get('/api/orders', (req, res) => {
  const sql = `
    SELECT o.*, GROUP_CONCAT(i.productName || ' (x' || i.quantity || ')', ', ') as itemsSummary
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.orderId
    GROUP BY o.id
    ORDER BY o.id DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 9. Admin Stats API
app.get('/api/stats', (req, res) => {
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM products) as totalProducts,
      (SELECT COUNT(*) FROM orders) as totalOrders,
      (SELECT COALESCE(SUM(total), 0) FROM orders) as totalRevenue,
      (SELECT COALESCE(SUM(stock), 0) FROM products) as totalStock
  `, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Serve frontend for all unmatched GET routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Apex Store Server is running live on http://localhost:${PORT}`);
});
