# Desire.co Chocolate Shop

This is a simple full-stack demonstration for the "Desire" homemade chocolate startup.

## Features
- Frontend with HTML/CSS/JS showcasing three flavours
- Cart, checkout form and Razorpay integration
- Admin page to manage inventory
- Node.js/Express backend storing inventory and orders in JSON files

## Setup
1. Install dependencies:
   ```bash
   cd c:\Users\panka\OneDrive\Desktop\desire
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open http://localhost:3000/index.html in your browser.

## API
- `GET /api/inventory` – returns current inventory
- `POST /api/inventory` – update inventory object
- `GET /api/orders` – list of orders
- `POST /api/orders` – submit a new order

Inventory and orders are stored in `data/inventory.json` and `data/orders.json`.

> **Note:** This demo uses a Razorpay test key. Replace `rzp_test_YourKeyHere` with your own key in `script.js`.
