/* ================================================
   DAILY DABBA — script.js
   ================================================ */

// ── CONFIG ──────────────────────────────────────
const KITCHEN_LAT  = 28.501254;
const KITCHEN_LNG  = 77.184578;
const MAX_DIST_M   = 500;

// 🔧 REPLACE THIS with your Google Apps Script Web App URL
// After deploying your Apps Script, paste the URL below:
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxHi8mrEtlmw6QAgiZdEb1MIQ_wf4JGBz4PbPSPzmbpSldILw0md_khKL18ksjbOXNT/exec";

// ── ON LOAD ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
  initNavScroll();
  initDeliveryToggle();
});

// ── NAVBAR SCROLL ────────────────────────────────
function initNavScroll() {
  const nav = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });
}

// ── LOAD MENU FROM JSON ──────────────────────────
async function loadMenu() {
  const grid = document.getElementById("menu-grid");
  try {
    const res  = await fetch("products.json");
    if (!res.ok) throw new Error("Could not load products.json");
    const items = await res.json();
    grid.innerHTML = "";
    items.forEach((item, i) => {
      const card = buildCard(item, i);
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color:#E8651A;font-weight:700;grid-column:1/-1;text-align:center;">
      ⚠️ Could not load today's menu. Please refresh.<br/>
      <small style="color:#7A5C46;">${err.message}</small>
    </p>`;
  }
}

function buildCard(item, index) {
  const card = document.createElement("div");
  card.className = "menu-card";
  card.style.animationDelay = `${index * 0.1}s`;

  // tag colour
  let tagHTML = "";
  if (item.tag) {
    const cls = item.tag === "Bestseller" ? "green"
              : item.tag === "New"        ? "new-tag"
              : "";
    tagHTML = `<div class="card-tag ${cls}">${item.tag}</div>`;
  }

  card.innerHTML = `
    ${tagHTML}
    <img class="card-img" src="${item.image}" alt="${item.name}"
         onerror="this.src='https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=300&fit=crop'"/>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-ingredients"><strong>Ingredients:</strong> ${item.ingredients}</div>
      <div class="card-footer">
        <div class="card-price">₹${item.price} <span>/meal</span></div>
        ${item.recipeLink ? `<a href="${item.recipeLink}" target="_blank" class="card-recipe">📖 Recipe</a>` : ""}
      </div>
    </div>`;
  return card;
}

// ── DELIVERY TYPE TOGGLE ─────────────────────────
function initDeliveryToggle() {
  document.querySelectorAll('input[name="delivery"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const addrGroup = document.getElementById("address-group");
      addrGroup.style.display = radio.value === "Home Delivery" ? "block" : "none";
      if (radio.value === "Home Delivery") {
        document.getElementById("f-address").setAttribute("required", "true");
      } else {
        document.getElementById("f-address").removeAttribute("required");
      }
    });
  });
}

// ── LOCATION CHECK ───────────────────────────────
function checkLocation() {
  const btn    = document.getElementById("loc-btn");
  const msg    = document.getElementById("loc-msg");
  const banner = document.getElementById("delivery-banner");

  if (!navigator.geolocation) {
    msg.textContent = "Geolocation not supported by your browser.";
    return;
  }

  btn.disabled    = true;
  btn.textContent = "Detecting…";
  msg.textContent = "Getting your location…";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: uLat, longitude: uLng } = pos.coords;
      const dist = haversine(KITCHEN_LAT, KITCHEN_LNG, uLat, uLng);
      const distM = Math.round(dist);

      // Store for form submission
      document.getElementById("h-lat").value  = uLat.toFixed(6);
      document.getElementById("h-lng").value  = uLng.toFixed(6);
      document.getElementById("h-dist").value = distM;

      banner.classList.remove("hidden", "available", "unavailable");

      if (dist <= MAX_DIST_M) {
        banner.classList.add("available");
        banner.textContent = `✅ Delivery Available! You're ${distM}m from our kitchen.`;
        msg.textContent    = `${distM} metres from kitchen — within delivery zone.`;
      } else {
        banner.classList.add("unavailable");
        banner.textContent = `😔 Sorry, Delivery Not Available. You're ${distM}m away (limit: ${MAX_DIST_M}m). Use Self Pickup!`;
        msg.textContent    = `${distM} metres from kitchen — outside delivery zone.`;
        // Auto-select Self Pickup
        const pickup = document.querySelector('input[name="delivery"][value="Self Pickup"]');
        if (pickup) { pickup.checked = true; pickup.dispatchEvent(new Event("change")); }
      }

      btn.textContent = "Re-check";
      btn.disabled    = false;
    },
    (err) => {
      msg.textContent = "Location access denied. Please allow location permission.";
      btn.textContent = "Try Again";
      btn.disabled    = false;
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// Haversine formula — returns distance in METRES
function haversine(lat1, lon1, lat2, lon2) {
  const R   = 6371000; // Earth radius in metres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a   = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg) { return deg * (Math.PI / 180); }

// ── ORDER FORM SUBMIT ────────────────────────────
async function submitOrder(e) {
  e.preventDefault();

  const name      = document.getElementById("f-name").value.trim();
  const mobile    = document.getElementById("f-mobile").value.trim();
  const delivType = document.querySelector('input[name="delivery"]:checked')?.value || "";
  const address   = document.getElementById("f-address").value.trim();
  const orderDet  = document.getElementById("f-order").value.trim();
  const special   = document.getElementById("f-special").value.trim();
  const lat       = document.getElementById("h-lat").value;
  const lng       = document.getElementById("h-lng").value;
  const dist      = document.getElementById("h-dist").value;

  // Basic validation
  if (!name || !mobile || !delivType || !orderDet) {
    showFormMsg("Please fill all required fields.", "error");
    return;
  }
  if (delivType === "Home Delivery" && !address) {
    showFormMsg("Please enter your delivery address.", "error");
    return;
  }
  if (!/^[6-9][0-9]{9}$/.test(mobile)) {
    showFormMsg("Please enter a valid 10-digit mobile number.", "error");
    return;
  }

  const btn = document.getElementById("submit-btn");
  const txt = document.getElementById("submit-text");
  btn.disabled  = true;
  txt.textContent = "⏳ Placing order…";

  const payload = {
    timestamp:    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    name,
    mobile,
    deliveryType: delivType,
    address:      address || "Self Pickup",
    latitude:     lat || "Not shared",
    longitude:    lng || "Not shared",
    distanceFromKitchen: dist ? `${dist} m` : "Not checked",
    orderDetails: orderDet,
    specialInstructions: special || "—"
  };

  try {
    // Google Apps Script accepts form-encoded POST
    const body = new URLSearchParams(payload);
    await fetch(SHEET_URL, { method: "POST", body, mode: "no-cors" });

    showFormMsg("🎉 Order placed successfully! We'll contact you shortly.", "success");
    document.getElementById("order-form").reset();
    document.getElementById("address-group").style.display = "block";
    document.getElementById("delivery-banner").classList.add("hidden");
    ["h-lat","h-lng","h-dist"].forEach(id => document.getElementById(id).value = "");
  } catch (err) {
    showFormMsg("❌ Could not submit order. Please WhatsApp or call us directly.", "error");
  } finally {
    btn.disabled    = false;
    txt.textContent = "🚀 Place My Order";
  }
}

function showFormMsg(text, type) {
  const el = document.getElementById("form-msg");
  el.textContent = text;
  el.className   = `form-msg ${type}`;
  el.classList.remove("hidden");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => el.classList.add("hidden"), 7000);
}
