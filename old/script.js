// Sample data - in a real app, this would come from a backend API
const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
    { id: 2, username: 'dist1', password: 'dist123', role: 'distributor', name: 'Global Distributors' },
    { id: 3, username: 'fran1', password: 'fran123', role: 'franchise', name: 'City Franchise' },
    { id: 4, username: 'fran2', password: 'fran123', role: 'franchise', name: 'Town Franchise' }
];

const clients = [
    { id: 1, name: 'Global Distributors', type: 'distributor' },
    { id: 2, name: 'City Franchise', type: 'franchise' },
    { id: 3, name: 'Town Franchise', type: 'franchise' }
];

let orders = [
    { 
        id: 1, 
        clientId: 1, 
        clientName: 'Global Distributors', 
        clientType: 'distributor',
        transport: 'Road', 
        cost: 1200, 
        status: 'completed', 
        date: '2023-05-15',
        payments: [
            { amount: 600, date: '2023-05-16' },
            { amount: 600, date: '2023-05-20' }
        ]
    },
    { 
        id: 2, 
        clientId: 2, 
        clientName: 'City Franchise', 
        clientType: 'franchise',
        transport: 'Air', 
        cost: 3500, 
        status: 'shipped', 
        date: '2023-05-18',
        payments: [
            { amount: 1500, date: '2023-05-19' }
        ]
    },
    { 
        id: 3, 
        clientId: 3, 
        clientName: 'Town Franchise', 
        clientType: 'franchise',
        transport: 'Sea', 
        cost: 2800, 
        status: 'pending', 
        date: '2023-05-20',
        payments: []
    }
];

// DOM elements
const loginPage = document.getElementById('login-page');
const adminDashboard = document.getElementById('admin-dashboard');
const clientDashboard = document.getElementById('client-dashboard');
const createOrderPage = document.getElementById('create-order-page');
const loginForm = document.getElementById('login-form');
const adminLogoutBtn = document.getElementById('admin-logout');
const clientLogoutBtn = document.getElementById('client-logout');
const createOrderBtn = document.getElementById('create-order-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard');
const orderForm = document.getElementById('order-form');
const clientSelect = document.getElementById('client-select');
const adminOrdersList = document.getElementById('admin-orders');
const clientOrdersList = document.getElementById('client-orders');
const orderModal = document.getElementById('order-modal');
const closeModalBtn = document.querySelector('.close-modal');
const updateOrderForm = document.getElementById('update-order-form');
const modalOrderId = document.getElementById('modal-order-id');
const modalTotalCost = document.getElementById('modal-total-cost');
const modalPaidTotal = document.getElementById('modal-paid-total');
const modalDueAmount = document.getElementById('modal-due-amount');
const orderStatusSelect = document.getElementById('order-status');
const paidAmountInput = document.getElementById('paid-amount');
const tabs = document.querySelectorAll('.tab-btn');

// Current user and app state
let currentUser = null;
let currentTab = 'all';
let currentOrder = null;

// Initialize the application
function init() {
    checkLoggedIn();
    setupEventListeners();
}

// Check if user is logged in from localStorage
function checkLoggedIn() {
    const userData = localStorage.getItem('orderManagementUser') || 
                     sessionStorage.getItem('orderManagementUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        showDashboard();
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout buttons
    adminLogoutBtn.addEventListener('click', logout);
    clientLogoutBtn.addEventListener('click', logout);
    
    // Order creation
    createOrderBtn.addEventListener('click', showCreateOrderForm);
    backToDashboardBtn.addEventListener('click', showDashboard);
    orderForm.addEventListener('submit', handleOrderCreation);
    
    // Order management
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Modal operations
    closeModalBtn.addEventListener('click', closeModal);
    updateOrderForm.addEventListener('submit', updateOrder);
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            closeModal();
        }
    });
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        
        if (rememberMe) {
            localStorage.setItem('orderManagementUser', JSON.stringify(user));
        } else {
            sessionStorage.setItem('orderManagementUser', JSON.stringify(user));
        }
        
        showDashboard();
    } else {
        alert('Invalid username or password');
    }
}

// Show the appropriate dashboard based on user role
function showDashboard() {
    if (!currentUser) return;
    
    // Hide all pages first
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    if (currentUser.role === 'admin') {
        adminDashboard.classList.add('active');
        renderAdminDashboard();
    } else {
        clientDashboard.classList.add('active');
        renderClientDashboard();
    }
}

// Switch between order tabs (All/Distributors/Franchises)
function switchTab(tab) {
    currentTab = tab;
    
    // Update active tab styling
    tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    renderAdminDashboard();
}

// Render admin dashboard with orders
function renderAdminDashboard() {
    adminOrdersList.innerHTML = '';
    
    let filteredOrders = [...orders];
    
    // Filter orders based on current tab
    if (currentTab === 'distributor') {
        filteredOrders = orders.filter(order => order.clientType === 'distributor');
    } else if (currentTab === 'franchise') {
        filteredOrders = orders.filter(order => order.clientType === 'franchise');
    }
    
    if (filteredOrders.length === 0) {
        adminOrdersList.innerHTML = '<p>No orders found.</p>';
        return;
    }
    
    // Group by client type if showing all orders
    if (currentTab === 'all') {
        const distributors = filteredOrders.filter(o => o.clientType === 'distributor');
        const franchises = filteredOrders.filter(o => o.clientType === 'franchise');
        
        if (distributors.length > 0) {
            const heading = document.createElement('h3');
            heading.className = 'client-type-heading';
            heading.textContent = 'Distributors';
            adminOrdersList.appendChild(heading);
            
            distributors.forEach(order => {
                adminOrdersList.appendChild(createOrderCard(order, true));
            });
        }
        
        if (franchises.length > 0) {
            const heading = document.createElement('h3');
            heading.className = 'client-type-heading';
            heading.textContent = 'Franchises';
            adminOrdersList.appendChild(heading);
            
            franchises.forEach(order => {
                adminOrdersList.appendChild(createOrderCard(order, true));
            });
        }
    } else {
        filteredOrders.forEach(order => {
            adminOrdersList.appendChild(createOrderCard(order, true));
        });
    }
}

// Render client dashboard with their orders
function renderClientDashboard() {
    clientOrdersList.innerHTML = '';
    
    const clientOrders = orders.filter(order => order.clientId === currentUser.id);
    
    if (clientOrders.length === 0) {
        clientOrdersList.innerHTML = '<p>No orders found.</p>';
        return;
    }
    
    clientOrders.forEach(order => {
        clientOrdersList.appendChild(createOrderCard(order, false));
    });
}

// Create an order card element
function createOrderCard(order, isAdmin) {
    const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const dueAmount = order.cost - totalPaid;
    const paidPercentage = Math.min(100, (totalPaid / order.cost) * 100);
    const statusClass = `status-${order.status}`;
    
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    
    orderCard.innerHTML = `
        <h3>Order #${order.id}</h3>
        ${isAdmin ? `<p><strong>Client:</strong> ${order.clientName}</p>` : ''}
        <p><strong>Transport:</strong> ${order.transport}</p>
        <p><strong>Total Cost:</strong> $${order.cost.toFixed(2)}</p>
        <p><strong>Date:</strong> ${order.date}</p>
        <p><strong>Status:</strong> <span class="order-status ${statusClass}">${order.status}</span></p>
        
        <div class="payment-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${paidPercentage}%"></div>
            </div>
            <div class="payment-details">
                <span>Paid: $${totalPaid.toFixed(2)}</span>
                <span>Due: $${dueAmount.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    // Only show card if there's still amount due or status isn't completed (for admin)
    if (isAdmin && dueAmount <= 0 && order.status === 'completed') {
        orderCard.style.display = 'none';
    }
    
    // Add update button for admin
    if (isAdmin) {
        const updateBtn = document.createElement('button');
        updateBtn.className = 'btn update-order-btn';
        updateBtn.textContent = 'Update Order';
        updateBtn.dataset.orderId = order.id;
        orderCard.appendChild(updateBtn);
        
        updateBtn.addEventListener('click', () => openOrderModal(order));
    }
    
    return orderCard;
}

// Show the create order form
function showCreateOrderForm() {
    adminDashboard.classList.remove('active');
    createOrderPage.classList.add('active');
    populateClientDropdown();
}

// Populate client dropdown in create order form
function populateClientDropdown() {
    clientSelect.innerHTML = '<option value="">Select a client</option>';
    
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} (${client.type})`;
        clientSelect.appendChild(option);
    });
}

// Handle order creation form submission
function handleOrderCreation(e) {
    e.preventDefault();
    
    const clientId = parseInt(clientSelect.value);
    const transport = document.getElementById('transport-mode').value;
    const cost = parseFloat(document.getElementById('order-cost').value);
    
    const client = clients.find(c => c.id === clientId);
    
    if (!client) {
        alert('Please select a valid client');
        return;
    }
    
    // Create new order
    const newOrder = {
        id: orders.length + 1,
        clientId: client.id,
        clientName: client.name,
        clientType: client.type,
        transport: transport,
        cost: cost,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        payments: []
    };
    
    orders.push(newOrder);
    
    // Reset form
    orderForm.reset();
    
    // Go back to dashboard
    createOrderPage.classList.remove('active');
    showDashboard();
}

// Open modal to update order
function openOrderModal(order) {
    currentOrder = order;
    
    const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const dueAmount = order.cost - totalPaid;
    
    modalOrderId.textContent = order.id;
    modalTotalCost.textContent = order.cost.toFixed(2);
    modalPaidTotal.textContent = totalPaid.toFixed(2);
    modalDueAmount.textContent = dueAmount.toFixed(2);
    orderStatusSelect.value = order.status;
    paidAmountInput.value = '';
    paidAmountInput.max = dueAmount;
    
    orderModal.style.display = 'block';
}

// Close the modal
function closeModal() {
    orderModal.style.display = 'none';
    currentOrder = null;
}

// Update order with new status/payment
function updateOrder(e) {
    e.preventDefault();
    
    const paidAmount = parseFloat(paidAmountInput.value);
    const status = orderStatusSelect.value;
    
    if (isNaN(paidAmount) || paidAmount < 0) {
        alert('Please enter a valid payment amount');
        return;
    }
    
    if (paidAmount > 0) {
        currentOrder.payments.push({
            amount: paidAmount,
            date: new Date().toISOString().split('T')[0]
        });
    }
    
    currentOrder.status = status;
    
    // Close modal and refresh
    closeModal();
    renderAdminDashboard();
}

// Logout the current user
function logout() {
    currentUser = null;
    localStorage.removeItem('orderManagementUser');
    sessionStorage.removeItem('orderManagementUser');
    
    loginPage.classList.add('active');
    adminDashboard.classList.remove('active');
    clientDashboard.classList.remove('active');
    createOrderPage.classList.remove('active');
    
    // Reset login form
    loginForm.reset();
}

// Initialize the application when the script loads
document.addEventListener('DOMContentLoaded', init);
