// ====================================================
// APEX STORE - FULL CLIENT-SIDE APPLICATION LOGIC
// ====================================================

const API_BASE = '/api';

// State
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('apex_cart')) || [];
let activeCategory = 'all';
let appliedPromo = null;

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const categoriesContainer = document.getElementById('categoriesContainer');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

// Cart Drawer Elements
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartTotalItems = document.getElementById('cartTotalItems');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTax = document.getElementById('cartTax');
const cartTotal = document.getElementById('cartTotal');
const promoInput = document.getElementById('promoInput');
const applyPromoBtn = document.getElementById('applyPromoBtn');
const promoNotice = document.getElementById('promoNotice');
const discountRow = document.getElementById('discountRow');
const cartDiscount = document.getElementById('cartDiscount');
const checkoutBtn = document.getElementById('checkoutBtn');

// Modals
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutFinalAmount = document.getElementById('checkoutFinalAmount');

const receiptModal = document.getElementById('receiptModal');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');
const receiptCode = document.getElementById('receiptCode');
const receiptContent = document.getElementById('receiptContent');

const ordersBtn = document.getElementById('ordersBtn');
const ordersModal = document.getElementById('ordersModal');
const closeOrdersBtn = document.getElementById('closeOrdersBtn');
const ordersListContainer = document.getElementById('ordersListContainer');

const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const addProductForm = document.getElementById('addProductForm');
const adminProductsTable = document.getElementById('adminProductsTable');

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  fetchCategories();
  fetchProducts();
  updateCartUI();

  // Search listener with debounce
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchProducts();
    }, 300);
  });

  // Sort listener
  sortSelect.addEventListener('change', () => fetchProducts());

  // Cart Drawer Listeners
  cartBtn.addEventListener('click', openCart);
  closeCartBtn.addEventListener('click', closeCart);
  cartBackdrop.addEventListener('click', closeCart);

  // Promo Listener
  applyPromoBtn.addEventListener('click', handleApplyPromo);

  // Checkout Modal Listeners
  checkoutBtn.addEventListener('click', openCheckout);
  closeCheckoutBtn.addEventListener('click', () => closeModal(checkoutModal));
  checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  closeReceiptBtn.addEventListener('click', () => closeModal(receiptModal));

  // Orders Modal
  ordersBtn.addEventListener('click', openOrdersModal);
  closeOrdersBtn.addEventListener('click', () => closeModal(ordersModal));

  // Admin Modal
  adminBtn.addEventListener('click', openAdminModal);
  closeAdminBtn.addEventListener('click', () => closeModal(adminModal));
  addProductForm.addEventListener('submit', handleAddProductSubmit);
});

// ----------------------------------------------------
// API FETCH FUNCTIONS
// ----------------------------------------------------

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    categories = await res.json();
    renderCategories();
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
}

async function fetchProducts() {
  try {
    const search = searchInput.value.trim();
    const sort = sortSelect.value;
    
    let url = `${API_BASE}/products?category=${activeCategory}&sort=${sort}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    productsGrid.innerHTML = '<div class="loading-spinner">جاري البحث وتحميل المنتجات...</div>';

    const res = await fetch(url);
    products = await res.json();
    renderProducts();
  } catch (err) {
    productsGrid.innerHTML = '<div class="error-msg">فشل الاتصال بالخادم وقاعدة البيانات!</div>';
  }
}

// ----------------------------------------------------
// RENDERING FUNCTIONS
// ----------------------------------------------------

function renderCategories() {
  categoriesContainer.innerHTML = categories.map(cat => `
    <button class="cat-tab ${cat.slug === activeCategory ? 'active' : ''}" data-slug="${cat.slug}">
      ${cat.icon} ${cat.name}
    </button>
  `).join('');

  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCategory = e.currentTarget.dataset.slug;
      renderCategories();
      fetchProducts();
    });
  });
}

function renderProducts() {
  if (products.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-muted);">
        <h3>لا توجد منتجات مطابقة للبحث حالياً 🔍</h3>
        <p>جرب تصفية مختلفة أو البحث عن كلمة أخرى.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = products.map(p => `
    <div class="product-card">
      ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ''}
      <div class="prod-img-wrapper">
        <img src="${p.image}" alt="${p.name}" class="prod-img" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'" />
      </div>
      <div class="card-body">
        <span class="prod-category">${getCategoryName(p.category)}</span>
        <h3 class="prod-title">${p.name}</h3>
        <p class="prod-desc">${p.description}</p>
        <div class="card-footer">
          <div>
            <div class="price-tag">$${p.price.toFixed(2)}</div>
            <div class="stock-tag">${p.stock > 0 ? `المتوفر: ${p.stock}` : '<span style="color:var(--danger)">نفذت الكمية</span>'}</div>
          </div>
          <button class="btn btn-primary add-to-cart-btn" 
                  data-id="${p.id}" 
                  ${p.stock <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            ${p.stock > 0 ? 'إضافة 🛒' : 'غير متوفر'}
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach Add to Cart listeners
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodId = parseInt(e.currentTarget.dataset.id);
      addToCart(prodId);
    });
  });
}

function getCategoryName(slug) {
  const cat = categories.find(c => c.slug === slug);
  return cat ? cat.name : slug;
}

// ----------------------------------------------------
// CART LOGIC & DRAWER
// ----------------------------------------------------

function addToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod || prod.stock <= 0) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.quantity >= prod.stock) {
      showToast('⚠️ تم الوصول للحد الأقصى للكمية المتاحة في المخزون!');
      return;
    }
    existing.quantity++;
  } else {
    cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      image: prod.image,
      stock: prod.stock,
      quantity: 1
    });
  }

  saveCart();
  updateCartUI();
  openCart();
  showToast(`✅ تم إضافة "${prod.name}" إلى السلة!`);
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== productId);
  } else if (item.quantity > item.stock) {
    item.quantity = item.stock;
    showToast('⚠️ لا توجد كمية إضافية بالمخزون!');
  }

  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('apex_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountBadge.textContent = totalCount;
  cartTotalItems.textContent = totalCount;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
        <span style="font-size:3rem; display:block; margin-bottom:10px;">🛍️</span>
        السلة فارغة حالياً.
      </div>
    `;
    checkoutBtn.disabled = true;
  } else {
    checkoutBtn.disabled = false;
    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Calculate Subtotal & Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;

  if (appliedPromo === 'PROMO10') discount = subtotal * 0.10;
  if (appliedPromo === 'APEX20') discount = subtotal * 0.20;

  const tax = (subtotal - discount) * 0.14;
  const grandTotal = subtotal - discount + tax;

  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartTax.textContent = `$${tax.toFixed(2)}`;
  cartTotal.textContent = `$${grandTotal.toFixed(2)}`;

  if (discount > 0) {
    discountRow.style.display = 'flex';
    cartDiscount.textContent = `-$${discount.toFixed(2)}`;
  } else {
    discountRow.style.display = 'none';
  }
}

function handleApplyPromo() {
  const code = promoInput.value.trim().toUpperCase();
  if (code === 'PROMO10' || code === 'APEX20') {
    appliedPromo = code;
    promoNotice.style.color = 'var(--secondary)';
    promoNotice.textContent = `🎉 تم تطبيق كود الخصم (${code}) بنجاح!`;
    updateCartUI();
  } else {
    appliedPromo = null;
    promoNotice.style.color = 'var(--danger)';
    promoNotice.textContent = '❌ كود الخصم غير صحيح (جرب PROMO10)';
    updateCartUI();
  }
}

function openCart() {
  cartDrawer.classList.add('active');
  cartBackdrop.classList.add('active');
}

function closeCart() {
  cartDrawer.classList.remove('active');
  cartBackdrop.classList.remove('active');
}

// ----------------------------------------------------
// CHECKOUT & ORDERS
// ----------------------------------------------------

function openCheckout() {
  if (cart.length === 0) return;
  closeCart();
  checkoutFinalAmount.textContent = cartTotal.textContent;
  openModal(checkoutModal);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const orderData = {
    customerName: document.getElementById('custName').value.trim(),
    email: document.getElementById('custEmail').value.trim(),
    address: document.getElementById('custAddress').value.trim(),
    city: document.getElementById('custCity').value.trim(),
    paymentMethod: document.getElementById('paymentMethod').value,
    items: cart,
    promoCode: appliedPromo
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await res.json();

    if (result.success) {
      closeModal(checkoutModal);
      
      // Render Receipt
      receiptCode.textContent = result.orderCode;
      receiptContent.innerHTML = `
        <div style="text-align: right; background: rgba(15,23,42,0.5); padding: 16px; border-radius:12px; margin: 16px 0;">
          <p><strong>المستلم:</strong> ${orderData.customerName}</p>
          <p><strong>العنوان:</strong> ${orderData.address} - ${orderData.city}</p>
          <p><strong>طريقة الدفع:</strong> ${orderData.paymentMethod}</p>
          <hr style="border:0; border-top:1px solid var(--glass-border); margin:10px 0;">
          <p><strong>المجموع الفرعي:</strong> $${result.subtotal.toFixed(2)}</p>
          <p><strong>الخصم:</strong> -$${result.discount.toFixed(2)}</p>
          <p><strong>الضريبة:</strong> $${result.tax.toFixed(2)}</p>
          <p style="font-size:1.2rem; font-weight:bold; color:var(--secondary);"><strong>الإجمالي المدفوع:</strong> $${result.total.toFixed(2)}</p>
        </div>
      `;
      openModal(receiptModal);

      // Clear Cart & refresh catalog stock from DB
      cart = [];
      appliedPromo = null;
      saveCart();
      updateCartUI();
      fetchProducts();
      showToast('🎉 تم تسجيل طلبك وتحديث المخزون بنجاح!');
    } else {
      alert('خطأ في إتمام الطلب: ' + result.error);
    }
  } catch (err) {
    alert('حدث خطأ في الاتصال بالخادم!');
  }
}

async function openOrdersModal() {
  openModal(ordersModal);
  ordersListContainer.innerHTML = '<div class="loading-spinner">جاري جلب الطلبات من SQLite...</div>';

  try {
    const res = await fetch(`${API_BASE}/orders`);
    const orders = await res.json();

    if (orders.length === 0) {
      ordersListContainer.innerHTML = '<p class="text-center">لا توجد طلبات سابقة حتى الآن.</p>';
      return;
    }

    ordersListContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>كود الطلب</th>
            <th>العميل</th>
            <th>المنتجات المطلوبة</th>
            <th>الإجمالي</th>
            <th>الحالة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><strong class="highlight-code">${o.orderCode}</strong></td>
              <td>${o.customerName}</td>
              <td style="font-size:0.85rem;">${o.itemsSummary || 'منتجات متنوعة'}</td>
              <td style="color:var(--secondary); font-weight:bold;">$${o.total.toFixed(2)}</td>
              <td><span class="badge" style="background:var(--primary); color:#fff;">${o.status}</span></td>
              <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(o.createdAt).toLocaleString('ar-SA')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    ordersListContainer.innerHTML = '<div class="error-msg">تعذر جلب الطلبات!</div>';
  }
}

// ----------------------------------------------------
// ADMIN LOGIC
// ----------------------------------------------------

async function openAdminModal() {
  openModal(adminModal);
  refreshAdminStats();
  refreshAdminProductsTable();
}

async function refreshAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();
    document.getElementById('adminRevenue').textContent = `$${(stats.totalRevenue || 0).toFixed(2)}`;
    document.getElementById('adminOrdersCount').textContent = stats.totalOrders || 0;
    document.getElementById('adminProductsCount').textContent = stats.totalProducts || 0;
  } catch (err) {
    console.error('Error fetching admin stats:', err);
  }
}

async function refreshAdminProductsTable() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    const prods = await res.json();

    adminProductsTable.innerHTML = prods.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <input type="number" value="${p.stock}" 
                 style="width:70px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid var(--glass-border); padding:4px; border-radius:4px;"
                 onchange="updateProductStock(${p.id}, this.value)" />
        </td>
        <td>
          <button class="btn btn-outline" style="padding:4px 10px; font-size:0.8rem; border-color:var(--danger); color:var(--danger);"
                  onclick="deleteProduct(${p.id})">حذف 🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    adminProductsTable.innerHTML = '<tr><td colspan="6">تعذر جلب الجدول!</td></tr>';
  }
}

async function updateProductStock(id, newStock) {
  try {
    await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: parseInt(newStock) })
    });
    showToast('✅ تم تحديث كمية المخزون بقاعدة البيانات!');
    fetchProducts();
    refreshAdminStats();
  } catch (err) {
    alert('فشل التحديث!');
  }
}

async function deleteProduct(id) {
  if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المنتج نهائياً من قاعدة البيانات؟')) return;
  try {
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    showToast('🗑️ تم حذف المنتج بنجاح');
    refreshAdminProductsTable();
    fetchProducts();
    refreshAdminStats();
  } catch (err) {
    alert('فشل الحذف!');
  }
}

async function handleAddProductSubmit(e) {
  e.preventDefault();
  const newProduct = {
    name: document.getElementById('newProdName').value.trim(),
    category: document.getElementById('newProdCategory').value,
    price: parseFloat(document.getElementById('newProdPrice').value),
    stock: parseInt(document.getElementById('newProdStock').value),
    badge: document.getElementById('newProdBadge').value.trim(),
    image: document.getElementById('newProdImage').value.trim(),
    description: document.getElementById('newProdDesc').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });

    if (res.ok) {
      showToast('🎉 تم إضافة المنتج الجديد بنجاح!');
      addProductForm.reset();
      refreshAdminProductsTable();
      fetchProducts();
      refreshAdminStats();
    } else {
      alert('خطأ أثناء إضافة المنتج!');
    }
  } catch (err) {
    alert('حدث خطأ في الاتصال بالخادم!');
  }
}

// ----------------------------------------------------
// UTILITY FUNCTIONS
// ----------------------------------------------------

function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
