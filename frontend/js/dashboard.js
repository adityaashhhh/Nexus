// ========== DASHBOARD & PRODUCT CRUD ==========

let currentPage = 1;
let totalPages = 1;
let deleteTargetId = null;
let allProducts = [];

// ===== LOAD PRODUCTS =====

async function loadProducts() {
  const search = document.getElementById('search-input').value.trim();
  const category = document.getElementById('filter-category').value;

  const params = { page: currentPage, limit: 12 };
  if (search) params.search = search;
  if (category) params.category = category;

  try {
    const data = await ProductsAPI.getAll(params);
    allProducts = data.data;
    totalPages = data.pagination.totalPages;

    renderProducts(allProducts);
    updateStats(data);
    updatePagination(data.pagination);
  } catch (error) {
    if (error.message !== 'Unauthorized') {
      showToast('Failed to load products', 'error');
    }
  }
}

// ===== RENDER PRODUCTS =====

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  const emptyState = document.getElementById('empty-state');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!products || products.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  grid.innerHTML = products
    .map(
      (p, i) => `
    <div class="product-card" style="animation-delay: ${i * 0.05}s">
      <div class="product-card-header">
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <span class="product-price">${formatPrice(p.price)}</span>
      </div>
      <p class="product-description">${escapeHtml(p.description)}</p>
      <div class="product-meta">
        <span class="badge badge-category">${capitalize(p.category)}</span>
        <span class="badge ${p.inStock ? 'badge-stock' : 'badge-out'}">${p.inStock ? '● In Stock' : '○ Out of Stock'}</span>
      </div>
      <div class="product-footer">
        <span class="product-author">by ${p.createdBy ? escapeHtml(p.createdBy.name) : 'Unknown'} · ${formatDate(p.createdAt)}</span>
        <div class="product-actions">
          ${
            p.createdBy && (p.createdBy._id === user.id || user.role === 'admin')
              ? `<button class="btn btn-ghost btn-sm" onclick="openEditModal('${p._id}')" title="Edit">✏️</button>`
              : ''
          }
          ${
            user.role === 'admin'
              ? `<button class="btn btn-ghost btn-sm" onclick="openDeleteModal('${p._id}', '${escapeHtml(p.name)}')" title="Delete">🗑️</button>`
              : ''
          }
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== STATS =====

function updateStats(data) {
  document.getElementById('stat-total').textContent = data.pagination.totalItems;
  const inStock = data.data.filter((p) => p.inStock).length;
  document.getElementById('stat-instock').textContent = inStock;
  const categories = new Set(data.data.map((p) => p.category));
  document.getElementById('stat-categories').textContent = categories.size;
  const today = data.data.filter((p) => isToday(p.createdAt)).length;
  document.getElementById('stat-recent').textContent = today;
}

// ===== PAGINATION =====

function updatePagination(pagination) {
  const paginationEl = document.getElementById('pagination');
  if (pagination.totalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }
  paginationEl.classList.remove('hidden');
  document.getElementById('page-info').textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
  document.getElementById('prev-page-btn').disabled = pagination.page <= 1;
  document.getElementById('next-page-btn').disabled = pagination.page >= pagination.totalPages;
}

function changePage(delta) {
  currentPage += delta;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SEARCH =====

const debounceSearch = createDebounce(() => {
  currentPage = 1;
  loadProducts();
}, 400);

// ===== PRODUCT MODAL =====

function openProductModal() {
  document.getElementById('product-id').value = '';
  document.getElementById('product-form').reset();
  document.getElementById('product-instock').checked = true;
  document.getElementById('modal-title').textContent = 'Add Product';
  document.getElementById('product-submit-btn').querySelector('span').textContent = 'Create Product';
  document.getElementById('product-modal').classList.remove('hidden');
}

async function openEditModal(id) {
  try {
    showLoading();
    const data = await ProductsAPI.getOne(id);
    const p = data.data;

    document.getElementById('product-id').value = p._id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-description').value = p.description;
    document.getElementById('product-price').value = p.price;
    document.getElementById('product-category').value = p.category;
    document.getElementById('product-instock').checked = p.inStock;
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('product-submit-btn').querySelector('span').textContent = 'Update Product';
    document.getElementById('product-modal').classList.remove('hidden');
  } catch (error) {
    showToast(error.message || 'Failed to load product', 'error');
  } finally {
    hideLoading();
  }
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('product-submit-btn');
  btn.disabled = true;

  const id = document.getElementById('product-id').value;
  const productData = {
    name: document.getElementById('product-name').value.trim(),
    description: document.getElementById('product-description').value.trim(),
    price: parseFloat(document.getElementById('product-price').value),
    category: document.getElementById('product-category').value,
    inStock: document.getElementById('product-instock').checked,
  };

  try {
    if (id) {
      await ProductsAPI.update(id, productData);
      showToast('Product updated successfully!', 'success');
    } else {
      await ProductsAPI.create(productData);
      showToast('Product created successfully!', 'success');
    }
    closeProductModal();
    loadProducts();
  } catch (error) {
    showToast(error.message || 'Failed to save product', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ===== DELETE =====

function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('delete-product-name').textContent = name;
  document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  deleteTargetId = null;
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    await ProductsAPI.delete(deleteTargetId);
    showToast('Product deleted successfully', 'success');
    closeDeleteModal();
    loadProducts();
  } catch (error) {
    showToast(error.message || 'Failed to delete product', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}
