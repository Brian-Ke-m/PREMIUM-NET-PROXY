// ==========================================
// PREMIUM NET PROXY - WEBSITE JAVASCRIPT
// ==========================================

let selectedPlan = localStorage.getItem("selectedPlan") || "";
let selectedPrice = Number(localStorage.getItem("selectedPrice")) || 0;
let selectedLocation =
    localStorage.getItem("selectedLocation") || "Automatic";


// ==========================================
// PAGE START
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    updateCheckout();
    updateSelectedLocation();
    setupMobileMenu();
    setupNavigation();

});


// ==========================================
// MOBILE MENU
// ==========================================

function setupMobileMenu() {

    const menuButton =
        document.getElementById("mobileMenuBtn");

    const navigation =
        document.getElementById("mainNav");

    if (!menuButton || !navigation) {
        return;
    }

    menuButton.addEventListener("click", () => {

        const isOpen =
            navigation.classList.toggle("active");

        menuButton.setAttribute(
            "aria-expanded",
            isOpen ? "true" : "false"
        );

    });

    navigation.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navigation.classList.remove("active");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

        });

    });

}


// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function(event) {

            const targetId =
                this.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target =
                document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });

}


// ==========================================
// CHOOSE PLAN
// ==========================================

function choosePlan(plan, price) {

    selectedPlan = plan;
    selectedPrice = Number(price);

    localStorage.setItem(
        "selectedPlan",
        selectedPlan
    );

    localStorage.setItem(
        "selectedPrice",
        String(selectedPrice)
    );

    updateCheckout();

    showMessage(
        `${selectedPlan} plan selected. Continue below to payment.`
    );

    const paymentSection =
        document.getElementById("payment");

    if (paymentSection) {

        paymentSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// ==========================================
// SELECT LOCATION
// ==========================================

function selectLocation(location) {

    selectedLocation = location;

    localStorage.setItem(
        "selectedLocation",
        selectedLocation
    );

    updateSelectedLocation();
    updateCheckout();

    showMessage(
        `${selectedLocation} selected as your proxy location.`
    );

}


// ==========================================
// UPDATE SELECTED LOCATION
// ==========================================

function updateSelectedLocation() {

    const locationElement =
        document.getElementById("selectedLocation");

    if (locationElement) {

        locationElement.textContent =
            selectedLocation;

    }

}


// ==========================================
// UPDATE CHECKOUT
// ==========================================

function updateCheckout() {

    const planElement =
        document.getElementById("selectedPlan");

    const locationElement =
        document.getElementById("checkoutLocation");

    const priceElement =
        document.getElementById("selectedPrice");

    if (planElement) {

        planElement.textContent =
            selectedPlan || "Please select a plan";

    }

    if (locationElement) {

        locationElement.textContent =
            selectedLocation;

    }

    if (priceElement) {

        priceElement.textContent =
            selectedPrice > 0
                ? `$${selectedPrice.toFixed(2)}`
                : "$0.00";

    }

}


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message) {

    const messageElement =
        document.getElementById("paymentMessage");

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;

    messageElement.classList.add("show");

}


// ==========================================
// PAYPAL PAYMENT
// ==========================================

async function handlePayPalPayment(event) {

    if (event) {
        event.preventDefault();
    }

    if (!selectedPlan || selectedPrice <= 0) {

        showMessage(
            "Please select a plan before paying."
        );

        document
            .getElementById("plans")
            ?.scrollIntoView({
                behavior: "smooth"
            });

        return;
    }

    showMessage(
        "Connecting to PayPal..."
    );

    try {

        const response = await fetch(
            "/api/paypal/create-order",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    plan: selectedPlan,
                    price: selectedPrice,
                    location: selectedLocation
                })
            }
        );

        const responseText =
            await response.text();

        let data;

        try {

            data = JSON.parse(responseText);

        } catch (jsonError) {

            console.error(
                "Invalid server response:",
                responseText
            );

            throw new Error(
                "Server returned an invalid response."
            );

        }

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to create PayPal order."
            );

        }

        if (!data.approvalUrl) {

            throw new Error(
                "PayPal did not provide a checkout URL."
            );

        }

        showMessage(
            "Redirecting to PayPal..."
        );

        window.location.href =
            data.approvalUrl;

    } catch (error) {

        console.error(
            "PayPal payment error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to connect to PayPal."
        );

    }

}


// ==========================================
// PAYPAL RETURN
// ==========================================

async function handlePayPalReturn() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const orderId =
        params.get("token");

    if (!orderId) {
        return;
    }

    showMessage(
        "Completing PayPal payment..."
    );

    try {

        const response = await fetch(
            "/api/paypal/capture-order",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    orderId: orderId
                })
            }
        );

        const responseText =
            await response.text();

        let data;

        try {

            data = JSON.parse(responseText);

        } catch (error) {

            throw new Error(
                "Invalid payment response."
            );

        }

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Unable to complete payment."
            );

        }

        showMessage(
            `Payment status: ${data.status}`
        );

    } catch (error) {

        console.error(
            "PayPal capture error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to complete PayPal payment."
        );

    }

}


// ==========================================
// M-PESA PAYMENT
// ==========================================

async function handleMpesaPayment(event) {

    if (event) {
        event.preventDefault();
    }

    if (!selectedPlan || selectedPrice <= 0) {

        showMessage(
            "Please select a plan before paying."
        );

        return;
    }

    const phoneInput =
        document.getElementById("phone");

    if (!phoneInput) {
        return;
    }

    const phone =
        phoneInput.value.trim();

    if (!phone) {

        showMessage(
            "Please enter your M-Pesa phone number."
        );

        phoneInput.focus();

        return;
    }

    const cleanPhone =
        phone.replace(/[\s-]/g, "");

    const phonePattern =
        /^(?:2547\d{8}|07\d{8}|\+2547\d{8})$/;

    if (!phonePattern.test(cleanPhone)) {

        showMessage(
            "Please enter a valid Kenyan M-Pesa phone number."
        );

        phoneInput.focus();

        return;
    }

    showMessage(
        "M-Pesa connection is being prepared. The payment API still needs to be connected."
    );

}


// ==========================================
// CHECK PAYPAL RETURN ON PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const params =
        new URLSearchParams(
            window.location.search
        );

    if (params.has("token")) {

        handlePayPalReturn();

    }

});


// ==========================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ==========================================

window.choosePlan =
    choosePlan;

window.selectLocation =
    selectLocation;

window.handlePayPalPayment =
    handlePayPalPayment;

window.handleMpesaPayment =
    handleMpesaPayment;
