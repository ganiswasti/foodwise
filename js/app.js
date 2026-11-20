
import { db, authReady, auth } from "./firebase.js";
import { enableNotifications } from "./notifications.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/* ========================================
   FOODWISE - MAIN APPLICATION
======================================== */

let foodItems = [];
let currentUser = null;
let isInitialized = false;


/* ========================================
   HELPER FUNCTIONS
======================================== */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }
}


/* ========================================
   NOTIFICATION BELL STYLES
======================================== */

function addNotificationStyles() {
    if (getElement("foodwiseNotificationStyles")) return;

    const style = document.createElement("style");
    style.id = "foodwiseNotificationStyles";

    style.textContent = `
        .foodwise-header-actions {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .foodwise-notification-wrapper {
            position: relative;
            z-index: 100;
        }

        .foodwise-bell-button {
            position: relative;
            width: 46px;
            height: 46px;
            border: 1px solid #DCE5D5;
            border-radius: 50%;
            background: #E7EDDF;
            color: #607B58;
            font-size: 21px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.25s ease;
            box-shadow: 0 3px 10px rgba(96,123,88,0.08);
        }

        .foodwise-bell-button:hover {
            background: #DCE7D4;
            transform: translateY(-2px);
        }

        .foodwise-bell-count {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 20px;
            height: 20px;
            padding: 0 5px;
            border-radius: 20px;
            background: #BD7F8D;
            color: white;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #FFF9F0;
        }

        .foodwise-notification-panel {
            position: absolute;
            top: 58px;
            right: 0;
            width: 320px;
            max-width: calc(100vw - 35px);
            max-height: 390px;
            overflow-y: auto;
            background: #FFF9F0;
            border: 1px solid #E7E9DF;
            border-radius: 18px;
            padding: 17px;
            box-shadow: 0 12px 35px rgba(69,87,68,0.16);
            z-index: 999;
        }

        .foodwise-notification-panel[hidden] {
            display: none !important;
        }

        .foodwise-notification-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }

        .foodwise-notification-heading h3 {
            color: #455744;
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            margin: 0;
        }

        .foodwise-notification-subtitle {
            color: #899383;
            font-size: 12px;
            margin: 0 0 14px;
        }

        .foodwise-notification-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 11px;
            text-align: left;
            padding: 12px;
            margin-bottom: 9px;
            border: 1px solid #E7E9DF;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: 0.2s ease;
        }

        .foodwise-notification-item:hover {
            background: #F5F7F0;
            border-color: #BDCCB2;
        }

        .foodwise-notification-icon {
            width: 37px;
            height: 37px;
            flex-shrink: 0;
            border-radius: 50%;
            background: #F5DDE1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }

        .foodwise-notification-item.expired
        .foodwise-notification-icon {
            background: #F8E7D7;
        }

        .foodwise-notification-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }

        .foodwise-notification-details strong {
            color: #455744;
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .foodwise-notification-details small {
            color: #899383;
            font-size: 11px;
        }

        .foodwise-empty-notifications {
            text-align: center;
            padding: 22px 10px;
            color: #899383;
            font-size: 13px;
        }

        .foodwise-empty-notifications span {
            display: block;
            font-size: 30px;
            margin-bottom: 8px;
        }

        .foodwise-view-alerts {
            width: 100%;
            padding: 11px;
            margin-top: 7px;
            border: none;
            border-radius: 10px;
            background: #E7EDDF;
            color: #607B58;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
        }

        .foodwise-view-alerts:hover {
            background: #DCE7D4;
        }

        @media (max-width: 600px) {
            .foodwise-header-actions {
                gap: 8px;
            }

            .foodwise-notification-panel {
                right: -5px;
            }

            .foodwise-bell-button {
                width: 40px;
                height: 40px;
            }
        }
    `;

    document.head.appendChild(style);
}


/* ========================================
   CREATE NOTIFICATION BELL
======================================== */

function createNotificationBell() {
    const dashboard = getElement("dashboard");
    const header = dashboard?.querySelector(".top-header");
    const dateElement = getElement("currentDate");

    if (!header || !dateElement) return;

    if (getElement("foodwiseNotificationWrapper")) return;

    addNotificationStyles();

    const actions = document.createElement("div");
    actions.className = "foodwise-header-actions";

    const wrapper = document.createElement("div");
    wrapper.className = "foodwise-notification-wrapper";
    wrapper.id = "foodwiseNotificationWrapper";

    const bell = document.createElement("button");
    bell.type = "button";
    bell.className = "foodwise-bell-button";
    bell.id = "foodwiseNotificationBell";
    bell.setAttribute("aria-label", "Open expiry notifications");
    bell.setAttribute("aria-expanded", "false");
    bell.setAttribute("aria-controls", "foodwiseNotificationPanel");
    bell.innerHTML = "🔔";

    const count = document.createElement("span");
    count.className = "foodwise-bell-count";
    count.id = "foodwiseNotificationCount";
    count.hidden = true;

    bell.appendChild(count);

    const panel = document.createElement("div");
    panel.className = "foodwise-notification-panel";
    panel.id = "foodwiseNotificationPanel";
    panel.hidden = true;

    const heading = document.createElement("div");
    heading.className = "foodwise-notification-heading";

    const title = document.createElement("h3");
    title.textContent = "Your little reminders 🌷";

    heading.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "foodwise-notification-subtitle";
    subtitle.textContent = "Let's keep your food fresh!";

    const list = document.createElement("div");
    list.id = "foodwiseNotificationList";

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "foodwise-view-alerts";
    viewButton.textContent = "View all expiry alerts →";

    panel.appendChild(heading);
    panel.appendChild(subtitle);
    panel.appendChild(list);
    panel.appendChild(viewButton);

    wrapper.appendChild(bell);
    wrapper.appendChild(panel);

    // Keep the existing date display.
    actions.appendChild(dateElement);
    actions.appendChild(wrapper);

    header.appendChild(actions);

    bell.addEventListener("click", function(event) {
        event.stopPropagation();

        const isOpening = panel.hidden;

        panel.hidden = !isOpening;
        bell.setAttribute("aria-expanded", String(isOpening));
    });

    panel.addEventListener("click", function(event) {
        event.stopPropagation();
    });

    document.addEventListener("click", function(event) {
        if (!wrapper.contains(event.target)) {
            panel.hidden = true;
            bell.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            panel.hidden = true;
            bell.setAttribute("aria-expanded", "false");
        }
    });

    viewButton.addEventListener("click", function() {
        panel.hidden = true;
        bell.setAttribute("aria-expanded", "false");

        const expiryLink = document.querySelector(
            '.nav-link[data-section="expiry"]'
        );

        if (expiryLink) {
            expiryLink.click();
        }
    });
}


/* ========================================
   UPDATE NOTIFICATION BELL
======================================== */

function updateNotificationBell() {
    const countElement = getElement("foodwiseNotificationCount");
    const listElement = getElement("foodwiseNotificationList");

    if (!countElement || !listElement) return;

    const alertItems = foodItems.filter(function(item) {
        const status = getStatus(item.expiryDate);

        return (
            status === "Expiring Soon" ||
            status === "Expires Today" ||
            status === "Expired"
        );
    });

    countElement.textContent =
        alertItems.length > 9 ? "9+" : alertItems.length;

    countElement.hidden = alertItems.length === 0;

    listElement.innerHTML = "";

    if (alertItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "foodwise-empty-notifications";

        const emoji = document.createElement("span");
        emoji.textContent = "🌷";

        const message = document.createElement("p");
        message.textContent = "You're all caught up! No expiry reminders right now.";

        empty.appendChild(emoji);
        empty.appendChild(message);
        listElement.appendChild(empty);

        return;
    }

    alertItems.forEach(function(item) {
        const status = getStatus(item.expiryDate);

        const notification = document.createElement("button");
        notification.type = "button";

        notification.className =
            "foodwise-notification-item" +
            (status === "Expired" ? " expired" : "");

        const icon = document.createElement("span");
        icon.className = "foodwise-notification-icon";
        icon.textContent = status === "Expired" ? "⚠️" : "🥛";

        const details = document.createElement("span");
        details.className = "foodwise-notification-details";

        const name = document.createElement("strong");
        name.textContent = item.name || "Food item";

        const date = document.createElement("small");

        const formattedDate = item.expiryDate
            ? new Date(item.expiryDate + "T00:00:00").toLocaleDateString(
                "en-IN",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            )
            : "Date unavailable";

        date.textContent = status + " • " + formattedDate;

        details.appendChild(name);
        details.appendChild(date);

        notification.appendChild(icon);
        notification.appendChild(details);

        notification.addEventListener("click", function() {
            const expiryLink = document.querySelector(
                '.nav-link[data-section="expiry"]'
            );

            if (expiryLink) {
                expiryLink.click();
            }

            const panel = getElement("foodwiseNotificationPanel");
            const bell = getElement("foodwiseNotificationBell");

            if (panel) panel.hidden = true;

            if (bell) {
                bell.setAttribute("aria-expanded", "false");
            }
        });

        listElement.appendChild(notification);
    });
}


/* ========================================
   DISPLAY TODAY'S DATE
======================================== */

function displayCurrentDate() {
    const dateElement = getElement("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }
}


/* ========================================
   INITIALIZE FOODWISE
======================================== */

async function initializeFoodWise() {
    if (isInitialized) return;

    try {
        await authReady;

        currentUser = auth.currentUser;

        if (!currentUser || currentUser.isAnonymous) {
            window.location.replace("./login.html");
            return;
        }

        isInitialized = true;

        displayCurrentDate();
        createNotificationBell();

        await migrateOldItems();
        await loadItems();

        fillScannedProduct();

        console.log("FoodWise initialized successfully! 💚");

    } catch (error) {
        console.error("FoodWise initialization error:", error);

        isInitialized = false;

        alert(
            "Could not connect to FoodWise. Please check your internet connection and Firebase settings."
        );
    }
}


/* ========================================
   MIGRATE OLD LOCAL STORAGE ITEMS
======================================== */

async function migrateOldItems() {
    const migrationKey = "foodwiseMigrated_" + currentUser.uid;

    let oldItems = [];

    try {
        oldItems = JSON.parse(
            localStorage.getItem("foodItems")
        ) || [];
    } catch (error) {
        console.error("Could not read old food items:", error);
    }

    if (localStorage.getItem(migrationKey)) {
        return;
    }

    for (let i = 0; i < oldItems.length; i++) {
        const oldItem = oldItems[i];

        await setDoc(
            doc(
                db,
                "foodItems",
                currentUser.uid + "_legacy_" + i
            ),
            {
                name: oldItem.name || "",
                brand: oldItem.brand || "",
                category: oldItem.category || "",
                quantity: oldItem.quantity || "",
                purchaseDate: oldItem.purchaseDate || "",
                expiryDate: oldItem.expiryDate || "",
                ownerId: currentUser.uid
            }
        );
    }

    localStorage.setItem(migrationKey, "true");
}


/* ========================================
   LOAD FOOD ITEMS FROM FIRESTORE
======================================== */

async function loadItems() {
    const foodQuery = query(
        collection(db, "foodItems"),
        where("ownerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(foodQuery);

    foodItems = snapshot.docs.map(function(document) {
        return {
            ...document.data(),
            firestoreId: document.id
        };
    });

    displayItems();
}


/* ========================================
   CALCULATE FOOD ITEM STATUS
======================================== */

function getStatus(expiryDate) {
    if (!expiryDate) return "Unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate + "T00:00:00");

    const difference = Math.round(
        (expiry - today) / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) return "Expired";
    if (difference === 0) return "Expires Today";
    if (difference <= 5) return "Expiring Soon";

    return "Fresh";
}


/* ========================================
   UPDATE DASHBOARD STATISTICS
======================================== */

function updateDashboard() {
    let total = foodItems.length;
    let expiring = 0;
    let expired = 0;
    let fresh = 0;

    foodItems.forEach(function(item) {
        const status = getStatus(item.expiryDate);

        if (
            status === "Expiring Soon" ||
            status === "Expires Today"
        ) {
            expiring++;
        } else if (status === "Expired") {
            expired++;
        } else {
            fresh++;
        }
    });

    setText("totalItems", total);
    setText("expiringItems", expiring);
    setText("expiredItems", expired);
    setText("freshItems", fresh);
}


/* ========================================
   CREATE EXPIRY ALERT CARD
======================================== */

function createAlertCard(item) {
    const status = getStatus(item.expiryDate);

    const alertCard = document.createElement("div");
    alertCard.className = "alert-card";

    const itemDetails = document.createElement("div");

    const itemName = document.createElement("strong");
    itemName.textContent = item.name;

    const itemInfo = document.createElement("p");

    itemInfo.textContent =
        (item.category || "Food") +
        " | Quantity: " + item.quantity +
        " | Expiry Date: " + item.expiryDate;

    const statusLabel = document.createElement("span");

    statusLabel.className = status === "Expired"
        ? "status expired"
        : "status expiring";

    statusLabel.textContent = status;

    itemDetails.appendChild(itemName);
    itemDetails.appendChild(itemInfo);

    alertCard.appendChild(itemDetails);
    alertCard.appendChild(statusLabel);

    return alertCard;
}


/* ========================================
   DISPLAY EXPIRY ALERTS
======================================== */

function displayExpiryAlerts() {
    const alertItems = foodItems.filter(function(item) {
        const status = getStatus(item.expiryDate);

        return (
            status === "Expiring Soon" ||
            status === "Expires Today" ||
            status === "Expired"
        );
    });

    const alertCountText =
        alertItems.length +
        (alertItems.length === 1 ? " alert" : " alerts");

    setText("expiryAlertCount", alertCountText);

    const containers = [
        getElement("expiryAlerts"),
        getElement("dashboardExpiryAlerts")
    ].filter(Boolean);

    containers.forEach(function(container) {
        container.innerHTML = "";

        if (alertItems.length === 0) {
            const message = document.createElement("p");

            message.textContent = foodItems.length === 0
                ? "No food items added yet. Add food to start tracking expiry dates!"
                : "Great! No expiry alerts at the moment.";

            container.appendChild(message);
            return;
        }

        alertItems.forEach(function(item) {
            container.appendChild(createAlertCard(item));
        });
    });
}


/* ========================================
   DISPLAY FOOD INVENTORY
======================================== */

function displayItems() {
    const tableBody = document.querySelector("#inventory tbody");

    if (tableBody) {
        tableBody.innerHTML = "";

        foodItems.forEach(function(item) {
            const row = document.createElement("tr");

            const values = [
                item.name,
                item.category,
                item.quantity,
                item.expiryDate,
                getStatus(item.expiryDate)
            ];

            values.forEach(function(value) {
                const cell = document.createElement("td");
                cell.textContent = value || "-";
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-button";
            deleteButton.type = "button";

            deleteButton.addEventListener("click", function() {
                deleteItem(item.firestoreId);
            });

            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    setText(
        "inventoryCount",
        foodItems.length +
        (foodItems.length === 1 ? " item" : " items")
    );

    updateDashboard();
    displayExpiryAlerts();
    updateNotificationBell();
}


/* ========================================
   ADD NEW FOOD ITEM
======================================== */

const foodForm = getElement("foodForm");

if (foodForm) {
    foodForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!currentUser) {
            alert("Please log in before adding food items.");
            return;
        }

        const name = getElement("foodName").value.trim();

        const brandField = getElement("foodBrand");
        const brand = brandField ? brandField.value.trim() : "";

        const category = getElement("category").value;
        const quantity = getElement("quantity").value.trim();
        const purchaseDate = getElement("purchaseDate").value;
        const expiryDate = getElement("expiryDate").value;

        if (
            !name ||
            !category ||
            !quantity ||
            !purchaseDate ||
            !expiryDate
        ) {
            alert("Please fill all the fields.");
            return;
        }

        if (expiryDate < purchaseDate) {
            alert("Expiry date cannot be before purchase date.");
            return;
        }

        const newItem = {
            name: name,
            brand: brand,
            category: category,
            quantity: quantity,
            purchaseDate: purchaseDate,
            expiryDate: expiryDate,
            ownerId: currentUser.uid
        };

        try {
            const documentReference = await addDoc(
                collection(db, "foodItems"),
                newItem
            );

            foodItems.push({
                ...newItem,
                firestoreId: documentReference.id
            });

            displayItems();

            foodForm.reset();

            alert("Food item saved successfully! 🎉");

        } catch (error) {
            console.error("Error adding food:", error);

            alert(
                "Could not save food item. Please try again."
            );
        }
    });
}


/* ========================================
   DELETE FOOD ITEM
======================================== */

async function deleteItem(documentId) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this food item?"
    );

    if (!confirmDelete) return;

    try {
        await deleteDoc(
            doc(db, "foodItems", documentId)
        );

        foodItems = foodItems.filter(function(item) {
            return item.firestoreId !== documentId;
        });

        displayItems();

        console.log("Food item deleted successfully.");

    } catch (error) {
        console.error("Error deleting food:", error);

        alert(
            "Could not delete food item. Please try again."
        );
    }
}


/* ========================================
   FILL SCANNED PRODUCT DETAILS
======================================== */

function fillScannedProduct() {
    const scannedProductData =
        sessionStorage.getItem("scannedFoodProduct");

    const scannedExpiryDate =
        sessionStorage.getItem("scannedExpiryDate");

    if (scannedProductData) {
        try {
            const scannedProduct = JSON.parse(
                scannedProductData
            );

            const nameField = getElement("foodName");
            const brandField = getElement("foodBrand");
            const quantityField = getElement("quantity");
            const purchaseDateField = getElement("purchaseDate");

            if (nameField) {
                nameField.value = scannedProduct.name || "";
            }

            if (brandField) {
                brandField.value = scannedProduct.brand || "";
            }

            if (quantityField) {
                quantityField.value = scannedProduct.quantity || "";
            }

            if (purchaseDateField) {
                purchaseDateField.value =
                    new Date().toISOString().split("T")[0];
            }

            sessionStorage.removeItem("scannedFoodProduct");

            console.log("Scanned product details filled! 🎉");

        } catch (error) {
            console.error("Scanned product error:", error);
        }
    }

    if (scannedExpiryDate) {
        const expiryField = getElement("expiryDate");

        if (expiryField) {
            expiryField.value = scannedExpiryDate;
        }

        sessionStorage.removeItem("scannedExpiryDate");

        console.log("OCR expiry date filled! 🎉");
    }
}


/* ========================================
   DESKTOP NOTIFICATIONS
======================================== */

const notificationButton = getElement(
    "enableNotificationsBtn"
);

if (notificationButton) {
    notificationButton.addEventListener("click", function() {
        enableNotifications();
    });
}


/* ========================================
   START FOODWISE - ONLY ONCE
======================================== */

createNotificationBell();
initializeFoodWise();
