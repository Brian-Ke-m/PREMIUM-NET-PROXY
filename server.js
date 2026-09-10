require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================
// WEBSITE
// ================================

app.use(express.static(path.join(__dirname, "Html")));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "Html", "index.html")
    );
});

// ================================
// HEALTH CHECK
// ================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message:
            "PREMIUM NET PROXY server is running",
        paypal:
            process.env.PAYPAL_ENVIRONMENT ||
            "sandbox"
    });
});

// ================================
// PAYPAL CREATE ORDER
// ================================

app.post(
    "/api/paypal/create-order",
    async (req, res) => {

        console.log(
            "\n========== PAYPAL REQUEST =========="
        );

        console.log(
            "Request:",
            req.body
        );

        try {

            const plan =
                req.body.plan;

            const price =
                Number(req.body.price);

            const location =
                req.body.location ||
                "Automatic";

            if (!plan) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please select a plan."
                });
            }

            if (
                !Number.isFinite(price) ||
                price <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment amount."
                });
            }

            const clientId =
                process.env.PAYPAL_CLIENT_ID;

            const clientSecret =
                process.env.PAYPAL_CLIENT_SECRET;

            if (
                !clientId ||
                !clientSecret
            ) {
                return res.status(500).json({
                    success: false,
                    message:
                        "PayPal credentials are missing."
                });
            }

            const basicAuth =
                Buffer
                    .from(
                        clientId +
                        ":" +
                        clientSecret
                    )
                    .toString("base64");

            // ================================
            // PAYPAL AUTHENTICATION
            // ================================

            console.log(
                "Authenticating with PayPal..."
            );

            const tokenResponse =
                await fetch(
                    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                "Basic " +
                                basicAuth,

                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            "grant_type=client_credentials"
                    }
                );

            const tokenText =
                await tokenResponse.text();

            console.log(
                "PayPal authentication status:",
                tokenResponse.status
            );

            if (!tokenResponse.ok) {

                console.log(
                    "PayPal authentication failed:"
                );

                console.log(
                    tokenText
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "PayPal authentication failed.",
                    details:
                        tokenText
                });
            }

            const tokenData =
                JSON.parse(tokenText);

            // ================================
            // PAYPAL ORDER
            // ================================

            const orderBody = {

                intent:
                    "CAPTURE",

                purchase_units: [
                    {
                        description:
                            "PREMIUM NET PROXY - " +
                            plan +
                            " Plan - " +
                            location,

                        amount: {
                            currency_code:
                                "USD",

                            value:
                                price.toFixed(2)
                        }
                    }
                ],

                application_context: {

                    brand_name:
                        "PREMIUM NET PROXY",

                    user_action:
                        "PAY_NOW",

                    return_url:
                        "http://localhost:3000/?paypal=success",

                    cancel_url:
                        "http://localhost:3000/?paypal=cancel"
                }
            };

            console.log(
                "Creating PayPal order..."
            );

            const orderResponse =
                await fetch(
                    "https://api-m.sandbox.paypal.com/v2/checkout/orders",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                "Bearer " +
                                tokenData.access_token,

                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                orderBody
                            )
                    }
                );

            const orderText =
                await orderResponse.text();

            console.log(
                "PayPal order status:",
                orderResponse.status
            );

            if (!orderResponse.ok) {

                console.log(
                    "PayPal order creation failed:"
                );

                console.log(
                    orderText
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to create PayPal order.",
                    details:
                        orderText
                });
            }

            const order =
                JSON.parse(orderText);

            const approvalLink =
                order.links?.find(
                    link =>
                        link.rel ===
                        "approve"
                );

            console.log(
                "\n========== PAYPAL SUCCESS =========="
            );

            console.log(
                "Plan:",
                plan
            );

            console.log(
                "Price:",
                price
            );

            console.log(
                "Location:",
                location
            );

            console.log(
                "Order ID:",
                order.id
            );

            console.log(
                "Status:",
                order.status
            );

            console.log(
                "Approval URL:",
                approvalLink?.href
            );

            console.log(
                "===================================="
            );

            return res.json({

                success:
                    true,

                orderId:
                    order.id,

                status:
                    order.status,

                approvalUrl:
                    approvalLink?.href ||
                    null
            });

        } catch (error) {

            console.log(
                "\n========== SERVER ERROR =========="
            );

            console.log(
                "Error:",
                error.message
            );

            console.log(
                "=================================="
            );

            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to create PayPal order.",

                details:
                    error.message
            });
        }
    }
);

// ================================
// PAYPAL CAPTURE ORDER
// ================================

app.post(
    "/api/paypal/capture-order",
    async (req, res) => {

        try {

            const orderId =
                req.body.orderId;

            if (!orderId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Order ID is required."
                });
            }

            const clientId =
                process.env.PAYPAL_CLIENT_ID;

            const clientSecret =
                process.env.PAYPAL_CLIENT_SECRET;

            if (
                !clientId ||
                !clientSecret
            ) {

                return res.status(500).json({
                    success: false,
                    message:
                        "PayPal credentials are missing."
                });
            }

            const basicAuth =
                Buffer
                    .from(
                        clientId +
                        ":" +
                        clientSecret
                    )
                    .toString("base64");

            // ================================
            // AUTHENTICATE WITH PAYPAL
            // ================================

            const tokenResponse =
                await fetch(
                    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                "Basic " +
                                basicAuth,

                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            "grant_type=client_credentials"
                    }
                );

            const tokenData =
                await tokenResponse.json();

            if (!tokenResponse.ok) {

                return res.status(500).json({
                    success: false,
                    message:
                        "PayPal authentication failed."
                });
            }

            // ================================
            // CAPTURE PAYMENT
            // ================================

            const captureResponse =
                await fetch(

                    "https://api-m.sandbox.paypal.com/v2/checkout/orders/" +
                    encodeURIComponent(
                        orderId
                    ) +
                    "/capture",

                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                "Bearer " +
                                tokenData.access_token,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            const captureText =
                await captureResponse.text();

            if (!captureResponse.ok) {

                console.log(
                    "PayPal capture failed:"
                );

                console.log(
                    captureText
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to capture PayPal order.",
                    details:
                        captureText
                });
            }

            const captureData =
                JSON.parse(
                    captureText
                );

            console.log(
                "\n========== PAYPAL CAPTURE =========="
            );

            console.log(
                "Order ID:",
                captureData.id
            );

            console.log(
                "Status:",
                captureData.status
            );

            console.log(
                "===================================="
            );

            return res.json({

                success:
                    true,

                orderId:
                    captureData.id,

                status:
                    captureData.status,

                details:
                    captureData
            });

        } catch (error) {

            console.log(
                "Capture error:",
                error.message
            );

            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to capture PayPal payment.",

                details:
                    error.message
            });
        }
    }
);
// ================================
// SITEMAP
// ================================

app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://premium-net-proxy.onrender.com/</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>`);
});

// ================================
// ROBOTS.TXT
// ================================

app.get("/robots.txt", (req, res) => {
    res.type("text/plain");

    res.send(`User-agent: *
Allow: /

Sitemap: https://premium-net-proxy.onrender.com/sitemap.xml`);
});
// ================================
// START SERVER
// ================================

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "       PREMIUM NET PROXY SERVER"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "Server: http://localhost:" +
            PORT
        );

        console.log(
            "Health: http://localhost:" +
            PORT +
            "/api/health"
        );

        console.log(
            "PayPal: " +
            (
                process.env.PAYPAL_ENVIRONMENT ||
                "sandbox"
            )
        );

        console.log(
            "Status: ONLINE"
        );

        console.log(
            "=========================================="
        );

        console.log("");
    }
);
