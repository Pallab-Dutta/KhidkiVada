document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://160f-49-37-35-218.ngrok-free.app';
    const appContainer = document.getElementById('app-container');
    const desktopNav = document.getElementById('desktop-nav');
    const bottomNav = document.getElementById('bottom-nav');
    
    // --- STATE MANAGEMENT ---
    let appState = {
        isLoggedIn: false,
        currentPage: 'login',
        clients: [], 
        orders: [], // To store orders for the dashboard
        currentOrder: {}
    };

    // --- ROUTING & PAGE LOADING ---
    const loadPage = async (page) => {
        // Simple protection against trying to access pages when not logged in
        if (!appState.isLoggedIn && page !== 'login') {
            loadPage('login');
            return;
        }

        try {
            const response = await fetch(`${page}.html`);
            if (!response.ok) throw new Error(`Could not load page '${page}'.`);
            const html = await response.text();
            appContainer.innerHTML = html;
            appState.currentPage = page;
            initPage();
        } catch (error) {
            console.error('Routing Error:', error);
            appContainer.innerHTML = `<p class="error-message">Error loading page.</p>`;
        }
    };

    const initPage = () => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === appState.currentPage);
        });

        switch (appState.currentPage) {
            case 'login':
                setupLoginPage();
                break;
            case 'dashboard':
                setupDashboardPage();
                break;
            case 'order_form':
                setupOrderFormPage();
                break;
        }
    };

    // --- PAGE SETUP FUNCTIONS ---

    const setupLoginPage = () => {
        const loginForm = document.getElementById('login-form');
        const errorEl = document.getElementById('login-error');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Login failed');
                }
                appState.isLoggedIn = true;
                updateNavVisibility();
                loadPage('dashboard');
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            }
        });
    };

    const handleLogout = () => {
        appState.isLoggedIn = false;
        appState.orders = [];
        appState.clients = [];
        updateNavVisibility();
        loadPage('login');
    };

    const updateNavVisibility = () => {
        const showNav = appState.isLoggedIn;
        desktopNav.style.display = showNav ? 'flex' : 'none';
        bottomNav.style.display = showNav ? 'flex' : 'none';
    };

    const setupDashboardPage = async () => {
        const ordersListContainer = document.getElementById('dashboard-orders-list');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            //if (!response.ok) throw new Error('Failed to fetch orders');
            //appState.orders = await response.json();
            //renderOrders(appState.orders);
            // Attach a single event listener to the container
            //setupDashboardEventListeners(); 
        } catch (error) {
            console.error("Dashboard Error:", error);
            ordersListContainer.innerHTML = `<p class="error-message">Could not load orders.</p>`;
        }
    };

    // --- NEW: RENDERORDERS FUNCTION ---
    // This function now creates a collapsed card with a hidden details section.
    const renderOrders = (orders) => {
        const container = document.getElementById('dashboard-orders-list');
        if (!container) return;
        if (orders.length === 0) {
            container.innerHTML = '<p>No orders found. Create one!</p>';
            return;
        }
        container.innerHTML = orders.map((order, index) => `
            <div class="order-card status-${order.status}" data-order-id="${order.id}">
                <div class="card-summary">
                    <div class="summary-info">
                        <h3>${order.client.Name}</h3>
                        <p class="due">Due: ₹${order.totals.due.toFixed(2)}</p>
                    </div>
                    <div class="summary-status">
                         <span class="status-badge">${order.status.replace('_', ' ')}</span>
                         <span class="expand-icon">&#x25BC;</span>
                    </div>
                </div>
                <div class="card-details">
                    <p><strong>Order ID:</strong> #${order.id}</p>
                    <p><strong>Date:</strong> ${order.date}</p>
                    <p><strong>Client Type:</strong> ${order.client.type}</p>
                    <p><strong>Items:</strong> ${order.items_summary}</p>
                    <div class="totals-grid">
                        <span>Total: ₹${order.totals.grandTotal.toFixed(2)}</span>
                        <span>Paid: ₹${order.totals.paid.toFixed(2)}</span>
                    </div>
                    <div class="card-footer">
                        ${!order.complete ? `
                            <button class="btn btn-secondary update-payment-btn" data-order-id="${order.id}">Update Payment</button>
                            <button class="btn download-invoice-btn" data-order-index="${index}">Download Invoice</button>
                        ` : `
                            <p class="success-message">Payment Complete</p>
                            <button class="btn download-invoice-btn" data-order-index="${index}">Download Invoice</button>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    };

    // --- NEW: DASHBOARD EVENT LISTENER SETUP ---
    // This uses event delegation for efficiency. One listener handles all card clicks.
    const setupDashboardEventListeners = () => {
        const container = document.getElementById('dashboard-orders-list');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const card = e.target.closest('.order-card');
            if (!card) return; // Exit if the click was not inside a card

            // Case 1: Click is on the "Update Payment" button
            if (e.target.matches('.update-payment-btn')) {
                openUpdateModal(e.target.dataset.orderId);
                return; // Stop further actions
            }
            
            // Case 2: Click is on the "Download Invoice" button
            if (e.target.matches('.download-invoice-btn')) {
                const orderIndex = e.target.dataset.orderIndex;
                generateInvoicePDF(appState.orders[orderIndex]);
                return; // Stop further actions
            }

            // Case 3: Click is anywhere else on the card - toggle expansion
            card.classList.toggle('expanded');
        });
    };
    
    // Invoice Generation Function using jsPDF
    function generateInvoicePDF(order) {
	    console.log(JSON.stringify(order));
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Static company data (you can move this to a config file)
            const companyInfo = {
                firmName: "VAZE BANDHU FOOD PRODUCTS",
                address: "421, Kangwai Tal. Dapoli, Dist. Ratnagiri.",
                phoneNumbers: ["9405960012", "9420133021"],
                subjectTo: "Dapoli Jurisdiction",
                gstn: "27ABWPV2404N1ZV",
                fssaiLicNo: "11521025000371",
                manufacturerOf: "Khidki vada Masala",
                hsnCode: "20049000",
                bankName: "Union Bank of India, Dapoli Branch",
                accountNo: "611301010050094",
                ifscCode: "UBIN0561134",
                footerText: "For Vaze Bandhu Food Products"
            };

	    // Helper function to convert amount to words
	    function amountToWords(num) {
		    const a = [
			'', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
			'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
			'Seventeen', 'Eighteen', 'Nineteen'
		    ];
		    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

		    const numToWords = (n) => {
			if (n < 20) return a[n];
			if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
			if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
			if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
			if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
			return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
		    };

		    const [rupees, paise] = num.toFixed(2).split('.').map(Number);
		    let words = rupees === 0 ? 'Zero' : numToWords(rupees);
		    words += ' Rupees';
		    if (paise > 0) {
			words += ' and ' + numToWords(paise) + ' Paise';
		    }
		    return words + ' Only';
		}


            // Helper function to format date
            function formatDate(dateString) {
                const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
                return new Date(dateString).toLocaleDateString('en-IN', options).replace(/\//g, '-');
            }

            // Helper function to convert number to words
            function numberToWords(num) {
                // You would implement this function or use a library
                // For now, we'll just return a placeholder
		console.log(amountToWords(num));
                return amountToWords(num);
            }

	    const pageWidth = doc.internal.pageSize.getWidth();
            // --- Header Section ---
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(companyInfo.firmName, 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(companyInfo.address, 105, 26, { align: 'center' });
            doc.text(`Phone: ${companyInfo.phoneNumbers.join(', ')}`, 105, 30, { align: 'center' });
            doc.text(`Subject to: ${companyInfo.subjectTo}`, 105, 34, { align: 'center' });

            // --- Company & Invoice Details ---
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('TAX INVOICE', 20, 45);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`GSTN: ${companyInfo.gstn}`, 20, 50);
            doc.text(`FSSAI Lic. no.: ${companyInfo.fssaiLicNo}`, 20, 54);
            doc.text(`Manufacturer of: ${companyInfo.manufacturerOf}`, 20, 58);

            // Invoice specific details on the right
            doc.text(`Invoice No.: ${order.id || 'N/A'}`, pageWidth-20, 50, { align: 'right' });
            doc.text(`Date: ${formatDate(order.date)}`, pageWidth-20, 54, { align: 'right' });
            doc.text(`Batch No.: ${order.batchNo || 'N/A'}`, pageWidth-20, 58, { align: 'right' });
            doc.text(`HSN Code: ${companyInfo.hsnCode}`, pageWidth-20, 62, { align: 'right' });

            // --- Customer Details ---
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`Name: ${order.client.Name || '____________________'}`, 20, 70);
            doc.text(`Address: ${order.client.Location || '____________________'}`, 20, 74);

            // --- Items Table ---
            const tableData = [
                ['Sr. No.', 'Description', 'Quantity', 'Rate', 'Amount Rs.']
            ];

            // Add items from the order
            order.items.forEach((item, index) => {
                tableData.push([
                    (index + 1).toString(),
                    item.name,
                    item.quantity.toString(),
                    item.price.toFixed(2),
                    item.total.toFixed(2)
                ]);
            });

	    const totalTableWidth = 15 + 50 + 20 + 20 + 25; // Sum of columnWidths = 130
	    const tableLeftMargin = (pageWidth - totalTableWidth) / 2;
            // Draw the table using autoTable plugin
            doc.autoTable({
                startY: 80,
                head: [tableData[0]],
                body: tableData.slice(1),
		tableWidth: 'auto',
                headStyles: {
                    fillColor: [128, 128, 128],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fillColor: [245, 245, 220],
                    textColor: [0, 0, 0],
                    halign: 'center'
                },
		margin: { left: tableLeftMargin },
                styles: {
                    cellPadding: 2,
                    fontSize: 8,
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 25 }
                }
            });

            // Get the final Y position after the table
            const finalY = doc.lastAutoTable.finalY + 10;

            // --- Tax Breakdown ---
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`CGST: 6%`, pageWidth-20, finalY, {align: 'right'});
            doc.text(`SGST: 6%`, pageWidth-20, finalY + 5, {align: 'right'});

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total: INR ${order.totals.grandTotal.toFixed(2)} only`, pageWidth-20, finalY + 10, {align: 'right'});

            // --- Amount in Words ---
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Amount (in words): ${numberToWords(order.totals.grandTotal)}`, 20, finalY + 20);

            // --- Bank Details ---
            doc.text(companyInfo.bankName, 20, finalY + 30);
            doc.text(`Current A/c No. : ${companyInfo.accountNo}`, 20, finalY + 35);
            doc.text(`IFSC : ${companyInfo.ifscCode}`, 20, finalY + 40);
            doc.text(`Credit Period : ___________ days only`, 20, finalY + 50);

            // --- Signature Line ---
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(companyInfo.footerText, pageWidth-20, 270, { align: 'right' });
            doc.line(pageWidth-75, 272, pageWidth-20, 272);

            // Save the PDF with a dynamic filename
            const fileName = `Invoice_${order.id || 'new'}_${formatDate(order.date)}.pdf`;
            doc.save(fileName);
        }


    // --- UPDATE MODAL LOGIC ---
    const openUpdateModal = (orderId) => {
        const order = appState.orders.find(o => o.id == orderId);
        const modal = document.getElementById('update-modal');
        if (!order || !modal) return;

        document.getElementById('update-order-id').value = orderId;
        document.getElementById('modal-order-id').textContent = `#${orderId}`;
        document.getElementById('modal-total-amount').textContent = `₹${order.totals.grandTotal.toFixed(2)}`;
        document.getElementById('modal-due-amount').textContent = `₹${order.totals.due.toFixed(2)}`;
        document.getElementById('newly-paid-amount').value = '';
        modal.style.display = 'flex';
    };

    const closeUpdateModal = () => {
        const modal = document.getElementById('update-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    const setupModalListeners = () => {
        // **FIX**: Check if elements exist before adding listeners
        const closeModalBtn = document.querySelector('.modal-close-btn');
        const updateForm = document.getElementById('update-payment-form');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeUpdateModal);
        }

        if (updateForm) {
            updateForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const orderId = document.getElementById('update-order-id').value;
                const newly_paid = document.getElementById('newly-paid-amount').value;
                const confirmBtn = document.getElementById('confirm-update-btn');

                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Saving...';

                try {
                    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newly_paid: parseFloat(newly_paid) })
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Update failed');
                    }
                    alert('Payment updated successfully!');
                    closeUpdateModal();
                    //initPage();
		    //setupDashboardPage(); // Refresh the dashboard
		    const orderResponse = await fetch(`${API_BASE_URL}/api/orders`);
    		    if (!orderResponse.ok) throw new Error('Failed to refresh orders list.');
    		    appState.orders = await orderResponse.json();
    		    renderOrders(appState.orders);
                } catch (error) {
                    alert(`Error: ${error.message}`);
                } finally {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Save Payment';
                }
            });
        }
    };


    const setupOrderFormPage = () => {
        const form = document.getElementById('create-order-form');
        // ... all existing setupOrderFormPage logic ...
        const clientTypeSelect = document.getElementById('client-type');
        const clientNameSelect = document.getElementById('client-name');
        const clientAddressInput = document.getElementById('client-address');
        const nextToStep2Btn = document.getElementById('next-to-step-2');
        const nextToStep3Btn = document.getElementById('next-to-step-3');
        const backToStep1Btn = document.getElementById('back-to-step-1');
        const backToStep2Btn = document.getElementById('back-to-step-2');
        const orderDateInput = document.getElementById('order-date');
        
        const items = [
            { name: '15 kg', price: 1575.00 },
            { name: '1 kg', price: 115.00 },
            { name: '100 gm box', price: 12.00 },
            { name: '100 gm packet', price: 10.00 }
        ];

        orderDateInput.valueAsDate = new Date();

        const navigateToStep = (step) => {
            document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
            document.getElementById(`form-step-${step}`).classList.add('active');
        };

        clientTypeSelect.addEventListener('change', async () => {
            const type = clientTypeSelect.value;
            clientNameSelect.innerHTML = '<option value="">-- Loading --</option>';
            clientAddressInput.value = '';
            if (!type) {
                clientNameSelect.innerHTML = '<option value="">-- Select Type First --</option>';
                clientNameSelect.disabled = true;
                nextToStep2Btn.disabled = true;
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/clients?type=${type}`);
                appState.clients = await response.json();
                clientNameSelect.innerHTML = '<option value="">-- Select Client --</option>';
                appState.clients.forEach(c => {
                    clientNameSelect.innerHTML += `<option value="${c.Name}">${c.Name}</option>`;
                });
                clientNameSelect.disabled = false;
            } catch (error) {
                console.error("Failed to load clients:", error);
                clientNameSelect.innerHTML = '<option value="">-- Error Loading --</option>';
            }
        });

	clientNameSelect?.addEventListener('change', () => {
            const selectedClient = appState.clients.find(c => c.Name === clientNameSelect.value);
            if (selectedClient) {
                clientAddressInput.value = selectedClient.Location || '';
                // Store the full client object, which contains the prices
		console.log(selectedClient);
                appState.currentOrder.client = selectedClient;
                appState.currentOrder.client.type = clientTypeSelect.value;
                nextToStep2Btn.disabled = false;
            } else {
                clientAddressInput.value = '';
                nextToStep2Btn.disabled = true;
            }
        });

	const populateItemsTable = () => {
            const client = appState.currentOrder.client;
	    console.log(client);
            const itemsTableBody = document.querySelector('#items-table tbody');
            if (!client || !itemsTableBody) return;

            itemsTableBody.innerHTML = '';
            const itemNames = ['15 kg', '1 kg', '100 gm box', '100 gm packet'];

            itemNames.forEach(itemName => {
                // Get the price directly from the client object
                const price = parseFloat(client[itemName] || 0);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Item">${itemName}</td>
                    <td data-label="Price (₹)"><input type="number" class="item-price" value="${price.toFixed(2)}" step="0.01"></td>
                    <td data-label="Quantity"><input type="number" class="item-quantity" data-name="${itemName}" value="0" min="0"></td>
                    <td data-label="Total (₹)" class="item-total">₹0.00</td>
                `;
                itemsTableBody.appendChild(row);
            });
        };

	document.getElementById('items-table')?.addEventListener('input', e => {
            if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
                const row = e.target.closest('tr');
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                const quantity = parseInt(row.querySelector('.item-quantity').value) || 0;
                row.querySelector('.item-total').textContent = `₹${(price * quantity).toFixed(2)}`;
            }
        });

        nextToStep2Btn?.addEventListener('click', () => {
            populateItemsTable();
            navigateToStep(2);
        });
        
        backToStep1Btn.addEventListener('click', () => navigateToStep(1));
        backToStep2Btn.addEventListener('click', () => navigateToStep(2));

	document.getElementById('next-to-step-3')?.addEventListener('click', () => {
            appState.currentOrder.date = orderDateInput.value;
            appState.currentOrder.items = [];
            document.querySelectorAll('#items-table tbody tr').forEach(row => {
                const quantityInput = row.querySelector('.item-quantity');
                const quantity = parseInt(quantityInput.value) || 0;
                if (quantity > 0) {
                    appState.currentOrder.items.push({
                        name: quantityInput.dataset.name,
                        price: parseFloat(row.querySelector('.item-price').value) || 0,
                        quantity: quantity,
                        total: (parseFloat(row.querySelector('.item-price').value) || 0) * quantity
                    });
                }
            });
            renderReviewDetails();
            navigateToStep(3);
        });

        const renderReviewDetails = () => {
            const reviewContainer = document.getElementById('review-details');
            let subtotal = appState.currentOrder.items.reduce((acc, item) => acc + item.total, 0);
            const cgst = subtotal * 0.06;
            const sgst = subtotal * 0.06;
            const grandTotal = subtotal + cgst + sgst;

            appState.currentOrder.totals = { subtotal, cgst, sgst, grandTotal };
            
            reviewContainer.innerHTML = `
                <p><strong>Client:</strong> ${appState.currentOrder.client.Name}</p>
                <p><strong>Date:</strong> ${appState.currentOrder.date}</p>
                <h4>Items:</h4>
                <ul>
                    ${appState.currentOrder.items.map(i => `<li>${i.name} (x${i.quantity}) - ₹${i.total.toFixed(2)}</li>`).join('')}
                </ul>
                <hr>
                <p><strong>Subtotal:</strong> ₹${subtotal.toFixed(2)}</p>
                <p><strong>CGST (6%):</strong> ₹${cgst.toFixed(2)}</p>
                <p><strong>SGST (6%):</strong> ₹${sgst.toFixed(2)}</p>
                <h4><strong>Total:</strong> ₹${grandTotal.toFixed(2)}</h4>
            `;
        };

	
        document.getElementById('create-order-form')?.addEventListener('submit', async (e) => {
             e.preventDefault();
             const confirmBtn = document.getElementById('confirm-order-btn');
             appState.currentOrder.paid = parseFloat(document.getElementById('paid-amount').value) || 0;
             confirmBtn.disabled = true; confirmBtn.textContent = 'Saving...';
	     console.log(appState.currentOrder);
             try {
                 const response = await fetch(`${API_BASE_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appState.currentOrder) });
                 if (!response.ok) throw new Error('Failed to save order');
		     console.log(appState.currentOrder);
		     //generateInvoicePDF(appState.currentOrder);
                     alert('Order created successfully!');
                     appState.currentOrder = {}; loadPage('dashboard');
                 } catch (error) {
                     console.error("Order submission error:", error);
                     alert('An error occurred. Could not save order.');
                     confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm Order';
                 }

        });

	// Invoice Generation Function using jsPDF
	function generateInvoicePDF(orderId) {
	    const order = appState.orders.find(o => o.id == orderId);
	    const { jsPDF } = window.jspdf;
	    const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	    });

	    // Static company data (you can move this to a config file)
	    const companyInfo = {
		firmName: "VAZE BANDHU FOOD PRODUCTS",
		address: "421, Kangwai Tal. Dapoli, Dist. Ratnagiri.",
		phoneNumbers: ["9405960012", "9420133021"],
		subjectTo: "Dapoli Jurisdiction",
		gstn: "27ABWPV2404N1ZV",
		fssaiLicNo: "11521025000371",
		manufacturerOf: "Khidki vada Masala",
		hsnCode: "20049000",
		bankName: "Union Bank of India, Dapoli Branch",
		accountNo: "611301010050094",
		ifscCode: "UBIN0561134",
		footerText: "For Vaze Bandhu Food Products"
	    };

	    // Helper function to format date
	    function formatDate(dateString) {
		const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
		return new Date(dateString).toLocaleDateString('en-IN', options).replace(/\//g, '-');
	    }

	    // Helper function to convert number to words
	    function numberToWords(num) {
		// You would implement this function or use a library
		// For now, we'll just return a placeholder
		return "Rupees " + num.toFixed(2) + " Only";
	    }

	    // --- Header Section ---
	    doc.setFontSize(18);
	    doc.setFont('helvetica', 'bold');
	    doc.text(companyInfo.firmName, 105, 20, { align: 'center' });

	    doc.setFontSize(10);
	    doc.setFont('helvetica', 'normal');
	    doc.text(companyInfo.address, 105, 26, { align: 'center' });
	    doc.text(`Phone: ${companyInfo.phoneNumbers.join(', ')}`, 105, 30, { align: 'center' });
	    doc.text(`Subject to: ${companyInfo.subjectTo}`, 105, 34, { align: 'center' });

	    // --- Company & Invoice Details ---
	    doc.setFontSize(10);
	    doc.setFont('helvetica', 'bold');
	    doc.text('TAX INVOICE', 20, 45);

	    doc.setFontSize(9);
	    doc.setFont('helvetica', 'normal');
	    doc.text(`GSTN: ${companyInfo.gstn}`, 20, 50);
	    doc.text(`FSSAI Lic. no.: ${companyInfo.fssaiLicNo}`, 20, 54);
	    doc.text(`Manufacturer of: ${companyInfo.manufacturerOf}`, 20, 58);

	    // Invoice specific details on the right
	    doc.text(`Invoice No.: ${order.id || 'N/A'}`, 100, 50);
	    doc.text(`Date: ${formatDate(order.date)}`, 100, 54);
	    doc.text(`Batch No.: ${order.batchNo || 'N/A'}`, 100, 58);
	    doc.text(`HSN Code: ${companyInfo.hsnCode}`, 100, 62);

	    // --- Customer Details ---
	    doc.setFontSize(9);
	    doc.setFont('helvetica', 'bold');
	    doc.text(`M/s: ${order.client.Name || '____________________'}`, 20, 70);
	    doc.text(`Address: ${order.client.Location || '____________________'}`, 20, 74);

	    // --- Items Table ---
	    const tableData = [
		['Sr. No.', 'Description', 'Quantity', 'Rate', 'Amount Rs.', 'Ps.']
	    ];

	    // Add items from the order
	    order.items.forEach((item, index) => {
		tableData.push([
		    (index + 1).toString(),
		    item.name,
		    item.quantity.toString(),
		    item.price.toFixed(2),
		    item.total.toFixed(2),
		    "00"
		]);
	    });

	    // Draw the table using autoTable plugin
	    doc.autoTable({
		startY: 80,
		head: [tableData[0]],
		body: tableData.slice(1),
		headStyles: {
		    fillColor: [128, 128, 128],
		    textColor: [255, 255, 255],
		    fontStyle: 'bold',
		    halign: 'center'
		},
		bodyStyles: {
		    fillColor: [245, 245, 220],
		    textColor: [0, 0, 0],
		    halign: 'center'
		},
		margin: { left: 20 },
		styles: {
		    cellPadding: 2,
		    fontSize: 8,
		    valign: 'middle'
		},
		columnStyles: {
		    0: { cellWidth: 15 },
		    1: { cellWidth: 50 },
		    2: { cellWidth: 20 },
		    3: { cellWidth: 20 },
		    4: { cellWidth: 25 },
		    5: { cellWidth: 15 }
		}
	    });

	    // Get the final Y position after the table
	    const finalY = doc.lastAutoTable.finalY + 10;

	    // --- Tax Breakdown ---
	    doc.setFontSize(9);
	    doc.setFont('helvetica', 'normal');
	    doc.text(`CGST: 6%`, 110, finalY);
	    doc.text(`SGST: 6%`, 110, finalY + 5);

	    doc.setFontSize(10);
	    doc.setFont('helvetica', 'bold');
	    doc.text(`Total: ₹${order.totals.grandTotal.toFixed(2)}`, 110, finalY + 10);

	    // --- Amount in Words ---
	    doc.setFontSize(9);
	    doc.setFont('helvetica', 'normal');
	    doc.text(`Amount (in words) Rs.: ${numberToWords(order.totals.grandTotal)}`, 20, finalY + 20);

	    // --- Bank Details ---
	    doc.text(companyInfo.bankName, 20, finalY + 30);
	    doc.text(`Current A/c No. : ${companyInfo.accountNo}`, 20, finalY + 35);
	    doc.text(`IFSC : ${companyInfo.ifscCode}`, 20, finalY + 40);
	    doc.text(`Credit Period : ${order.creditPeriod || '0'} days only`, 20, finalY + 45);

	    // --- Signature Line ---
	    doc.setFontSize(10);
	    doc.setFont('helvetica', 'bold');
	    doc.text(companyInfo.footerText, 180, 280, { align: 'right' });
	    doc.line(120, 282, 180, 282);

	    // Save the PDF with a dynamic filename
	    const fileName = `Invoice_${order.id || 'new'}_${formatDate(order.date)}.pdf`;
	    doc.save(fileName);
	}
    };

    // --- GLOBAL EVENT LISTENERS & APP START ---
    document.body.addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            e.preventDefault();
            if (navLink.id === 'mobile-logout-link' || navLink.id === 'logout-btn') {
                 handleLogout();
            } else if (navLink.dataset.page) {
                loadPage(navLink.dataset.page);
            }
        }
    });
    
    // Initial Load
    setupModalListeners();
    updateNavVisibility();
    loadPage('login');
});
