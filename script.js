// simple cart stored in localStorage
const cart = JSON.parse(localStorage.getItem('cart') || '[]');
let inventoryCache = {}; // hold last fetched inventory for filtering

// fetch inventory from server when needed
async function fetchInventory() {
    const resp = await fetch('/api/inventory');
    const data = resp.ok ? await resp.json() : {};
    inventoryCache = data;
    return data;
}

function renderProducts(filter = '') {
    const container = document.getElementById('products');
    if (!container) return;
    container.innerHTML = '<h2>Our Flavours</h2>';
    if (filter) {
        filter = filter.toLowerCase();
    }
    Object.keys(inventoryCache).forEach(sku => {
        const item = inventoryCache[sku];
        if (filter && !item.name.toLowerCase().includes(filter)) return;
        const div = document.createElement('div');
        div.className = 'product';
        div.setAttribute('data-sku', sku);
        div.setAttribute('data-price', item.price);
        div.setAttribute('data-stock', item.stock);
        div.innerHTML = `
            ${item.img ? `<img src="${item.img}" alt="${item.name}">` : ''}
            <h3>${item.name}</h3>
            <p>₹${item.price}</p>
            <p>Stock: ${item.stock}</p>
            <button class="add-to-cart">Add to cart</button>
        `;
        if (item.stock === 0) div.querySelector('button').disabled = true;
        container.appendChild(div);
        // trigger animation
        requestAnimationFrame(() => div.classList.add('visible'));
    });
}

function updateCartDisplay() {
    const ul = document.querySelector('#cart ul');
    if (!ul) return;
    ul.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} x${item.qty} - ₹${item.price * item.qty}
            <button class="decr" data-sku="${item.sku}">-</button>
            <button class="incr" data-sku="${item.sku}">+</button>
            <button class="remove" data-sku="${item.sku}">×</button>
        `;
        ul.appendChild(li);
        // animate entry
        requestAnimationFrame(() => li.classList.add('visible'));
        total += item.price * item.qty;
    });
    document.getElementById('total').textContent = total;
    localStorage.setItem('cart', JSON.stringify(cart));
}

// handle clicks anywhere on page for dynamic elements
document.addEventListener('click', e => {
    if (e.target.matches('.add-to-cart')) {
        const prod = e.target.closest('.product');
        const sku = prod.getAttribute('data-sku');
        const name = prod.querySelector('h3').textContent;
        const price = parseInt(prod.getAttribute('data-price'), 10);
        const stock = parseInt(prod.getAttribute('data-stock')||'0',10);
        if (stock <= 0) {
            alert('Sorry, this item is out of stock');
            return;
        }
        let existing = cart.find(i => i.sku === sku);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({sku, name, price, qty: 1});
        }
        updateCartDisplay();
    }
    if (e.target.matches('#clear-cart')) {
        if (confirm('Empty your cart?')) {
            cart.length = 0;
            updateCartDisplay();
        }
    }
    if (e.target.matches('button.decr')) {
        const sku = e.target.getAttribute('data-sku');
        const item = cart.find(i=>i.sku===sku);
        if (item) {
            item.qty = Math.max(1, item.qty - 1);
            updateCartDisplay();
        }
    }
    if (e.target.matches('button.incr')) {
        const sku = e.target.getAttribute('data-sku');
        const item = cart.find(i=>i.sku===sku);
        if (item) {
            item.qty += 1;
            updateCartDisplay();
            // highlight changed item
            const li = document.querySelector(`#cart li button.incr[data-sku="${sku}"]`).closest('li');
            li && li.classList.add('highlight');
            setTimeout(()=>li && li.classList.remove('highlight'), 500);
        }
    }
    if (e.target.matches('button.remove')) {
        const sku = e.target.getAttribute('data-sku');
        const idx = cart.findIndex(i=>i.sku===sku);
        if (idx > -1) {
            cart.splice(idx,1);
            updateCartDisplay();
        }
    }
});

// filter products when search box changes
const searchInput = document.getElementById('search');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        renderProducts(searchInput.value);
    });
}

updateCartDisplay();

// when index.html loads, retrieve products from backend and render
(async function populateProducts(){
    const inv = await fetchInventory();
    renderProducts();
})();

// when order.html loads
if (document.getElementById('order-form')) {
    const orderItemsDiv = document.getElementById('order-items');
    const orderTotalSpan = document.getElementById('order-total');
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    let total = 0;
    currentCart.forEach(item => {
        const p = document.createElement('p');
        p.textContent = `${item.name} x${item.qty} - ₹${item.price * item.qty}`;
        orderItemsDiv.appendChild(p);
        total += item.price * item.qty;
    });
    orderTotalSpan.textContent = total;
    
    document.getElementById('pay-button').addEventListener('click', async () => {
        const form = document.getElementById('order-form');
        if (!form.checkValidity()) {
            alert('Please fill all required fields');
            return;
        }
        // prepare razorpay options
        const options = {
            key: 'rzp_test_YourKeyHere', // replace with your Razorpay key
            amount: total * 100, // paise
            currency: 'INR',
            name: 'Desire.co chocolates',
            description: 'Order payment',
            handler: async function (response){
                // after successful payment register order and adjust inventory
                const order = {
                    customer: {
                        name: form.name.value,
                        email: form.email.value,
                        phone: form.phone.value,
                        address: form.address.value,
                        city: form.city.value,
                        state: form.state.value,
                        zip: form.zip.value,
                    },
                    items: currentCart,
                    total,
                    payment_id: response.razorpay_payment_id
                };
                await fetch('/api/orders', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(order)
                });
                // update inventory stocks
                const inv = await fetchInventory();
                currentCart.forEach(it => {
                    if (inv[it.sku]) inv[it.sku].stock = Math.max(0, inv[it.sku].stock - it.qty);
                });
                await fetch('/api/inventory', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(inv)
                });

                alert('Payment successful. Razorpay ID: ' + response.razorpay_payment_id);
                localStorage.removeItem('cart');
                window.location.href = 'index.html';
            },
            prefill: {
                name: form.name.value,
                email: form.email.value,
                contact: form.phone.value,
            },
            notes: {
                address: form.address.value
            },
            theme: {
                color: '#660000'
            }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    });
}

// when order.html loads
if (document.getElementById('order-form')) {
    const orderItemsDiv = document.getElementById('order-items');
    const orderTotalSpan = document.getElementById('order-total');
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    let total = 0;
    currentCart.forEach(item => {
        const p = document.createElement('p');
        p.textContent = `${item.name} x${item.qty} - ₹${item.price * item.qty}`;
        orderItemsDiv.appendChild(p);
        total += item.price * item.qty;
    });
    orderTotalSpan.textContent = total;
    
    document.getElementById('pay-button').addEventListener('click', async () => {
        const form = document.getElementById('order-form');
        if (!form.checkValidity()) {
            alert('Please fill all required fields');
            return;
        }
        // prepare razorpay options
        const options = {
            key: 'rzp_test_YourKeyHere', // replace with your Razorpay key
            amount: total * 100, // paise
            currency: 'INR',
            name: 'Desire.co chocolates',
            description: 'Order payment',
            handler: async function (response){
                // after successful payment register order and adjust inventory
                const order = {
                    customer: {
                        name: form.name.value,
                        email: form.email.value,
                        phone: form.phone.value,
                        address: form.address.value,
                        city: form.city.value,
                        state: form.state.value,
                        zip: form.zip.value,
                    },
                    items: currentCart,
                    total,
                    payment_id: response.razorpay_payment_id
                };
                await fetch('/api/orders', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(order)
                });
                // update inventory stocks
                const inv = await fetchInventory();
                currentCart.forEach(it => {
                    if (inv[it.sku]) inv[it.sku].stock = Math.max(0, inv[it.sku].stock - it.qty);
                });
                await fetch('/api/inventory', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(inv)
                });

                alert('Payment successful. Razorpay ID: ' + response.razorpay_payment_id);
                localStorage.removeItem('cart');
                window.location.href = 'index.html';
            },
            prefill: {
                name: form.name.value,
                email: form.email.value,
                contact: form.phone.value,
            },
            notes: {
                address: form.address.value
            },
            theme: {
                color: '#660000'
            }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    });
}
