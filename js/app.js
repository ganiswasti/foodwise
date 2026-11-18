
import { db, authReady , auth } from "./firebase.js";
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

// ========================================
// FOODWISE - FIREBASE JAVASCRIPT
// ========================================

let foodItems = [];
let currentUser = null;

// ========================================
// CONNECT AND LOAD FOOD ITEMS
// ========================================

async function initializeFoodWise() {

    try {
        await authReady;

currentUser = auth.currentUser;

// Only registered users can access the dashboard
if (!currentUser || currentUser.isAnonymous) {
    window.location.replace("./login.html");
    return;
}

        // Migrate existing browser items safely
        const migrationKey = "foodwiseMigrated_" + currentUser.uid;
        const oldItems = JSON.parse(
            localStorage.getItem("foodItems")
        ) || [];

        if (!localStorage.getItem(migrationKey)) {

            for (let i = 0; i < oldItems.length; i++) {

                const oldItem = oldItems[i];

                await setDoc(
                    doc(db, "foodItems",
                    currentUser.uid + "_legacy_" + i),
                    {
                        name: oldItem.name,
                        category: oldItem.category,
                        quantity: oldItem.quantity,
                        purchaseDate: oldItem.purchaseDate,
                        expiryDate: oldItem.expiryDate,
                        ownerId: currentUser.uid
                    }
                );
            }

            localStorage.setItem(migrationKey, "true");
        }

        await loadItems();

    } catch (error) {
        console.error("Firebase connection error:", error);
        alert("Could not connect to Firebase. Please check your internet connection and Firebase settings.");
    }
}

// ========================================
// LOAD ITEMS FROM FIRESTORE
// ========================================

async function loadItems() {

    const q = query(
        collection(db, "foodItems"),
        where("ownerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    foodItems = snapshot.docs.map(function(document) {
        return {
            ...document.data(),
            firestoreId: document.id
        };
    });

    displayItems();
}

// ========================================
// DISPLAY TODAY'S DATE
// ========================================

const dateElement = document.getElementById("currentDate");

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

// ========================================
// CALCULATE FOOD ITEM STATUS
// ========================================

function getStatus(expiryDate) {

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

// ========================================
// UPDATE DASHBOARD
// ========================================

function updateDashboard() {

    let total = foodItems.length;
    let expiring = 0;
    let expired = 0;
    let fresh = 0;

    foodItems.forEach(function(item) {

        const status = getStatus(item.expiryDate);

        if (status === "Expiring Soon" ||
            status === "Expires Today") {
            expiring++;
        }
        else if (status === "Expired") {
            expired++;
        }
        else {
            fresh++;
        }
    });

    document.getElementById("totalItems").textContent = total;
    document.getElementById("expiringItems").textContent = expiring;
    document.getElementById("expiredItems").textContent = expired;
    document.getElementById("freshItems").textContent = fresh;
}

// ========================================
// DISPLAY EXPIRY ALERTS
// ========================================

function displayExpiryAlerts() {

    const alertContainer = document.getElementById("expiryAlerts");
    const alertCount = document.getElementById("expiryAlertCount");

    alertContainer.innerHTML = "";

    const alertItems = foodItems.filter(function(item) {

        const status = getStatus(item.expiryDate);

        return status === "Expiring Soon" ||
               status === "Expires Today" ||
               status === "Expired";
    });

    alertCount.textContent = alertItems.length +
        (alertItems.length === 1 ? " alert" : " alerts");

    if (alertItems.length === 0) {

        const message = document.createElement("p");

        message.textContent = foodItems.length === 0
            ? "No food items added yet. Add food to start tracking expiry dates!"
            : "Great! No expiry alerts at the moment.";

        alertContainer.appendChild(message);
        return;
    }

    alertItems.forEach(function(item) {

        const status = getStatus(item.expiryDate);

        const alertCard = document.createElement("div");
        alertCard.className = "alert-card";

        const itemDetails = document.createElement("div");

        const itemName = document.createElement("strong");
        itemName.textContent = item.name;

        const itemInfo = document.createElement("p");

        itemInfo.textContent =
            item.category + " | Quantity: " + item.quantity +
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

        alertContainer.appendChild(alertCard);
    });
}

// ========================================
// DISPLAY FOOD INVENTORY
// ========================================

function displayItems() {

    const table = document.querySelector("#inventory tbody");

    table.innerHTML = "";

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
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", function() {
            deleteItem(item.firestoreId);
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        table.appendChild(row);
    });

    document.getElementById("inventoryCount").textContent =
        foodItems.length +
        (foodItems.length === 1 ? " item" : " items");

    updateDashboard();
    displayExpiryAlerts();
}

// ========================================
// ADD NEW FOOD ITEM
// ========================================

document.getElementById("foodForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        const name = document.getElementById("foodName").value.trim();
        const category = document.getElementById("category").value;
        const quantity = document.getElementById("quantity").value.trim();
        const purchaseDate = document.getElementById("purchaseDate").value;
        const expiryDate = document.getElementById("expiryDate").value;

        if (!name || !category || !quantity ||
            !purchaseDate || !expiryDate) {

            alert("Please fill all the fields.");
            return;
        }

        if (expiryDate < purchaseDate) {

            alert("Expiry date cannot be before purchase date.");
            return;
        }

        const newItem = {
            name: name,
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

            document.getElementById("foodForm").reset();

            alert("Food item saved successfully!");

        } catch (error) {

            console.error("Error adding food:", error);
            alert("Could not save food item. Please try again.");
        }
    });

// ========================================
// DELETE FOOD ITEM
// ========================================

async function deleteItem(documentId) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this food item?"
    );

    if (!confirmDelete) return;

    try {

        await deleteDoc(doc(db, "foodItems", documentId));

        foodItems = foodItems.filter(function(item) {
            return item.firestoreId !== documentId;
        });

        displayItems();

    } catch (error) {

        console.error("Error deleting food:", error);
        alert("Could not delete food item. Please try again.");
    }
}

// ========================================
// START FOODWISE
// ========================================

initializeFoodWise();
const notificationButton = document.getElementById(
    "enableNotificationsBtn"
);

if (notificationButton) {
    notificationButton.addEventListener("click", function() {
        alert("FoodWise notification button is connected!");
        enableNotifications();
    });
}


function fillScannedProduct() {
    const scannedProductData =
        sessionStorage.getItem("scannedFoodProduct");

    if (!scannedProductData) {
        return;
    }

    try {
        const scannedProduct = JSON.parse(scannedProductData);

        document.getElementById("foodName").value =
            scannedProduct.name || "";

        document.getElementById("foodBrand").value =
            scannedProduct.brand || "";

        document.getElementById("quantity").value =
            scannedProduct.quantity || "";
        
// Automatically fill the OCR-detected expiry date
const scannedExpiryDate =
    sessionStorage.getItem("scannedExpiryDate");

if (scannedExpiryDate) {
    document.getElementById("expiryDate").value =
        scannedExpiryDate;

    sessionStorage.removeItem("scannedExpiryDate");

    console.log("Expiry date filled using OCR!");
}

        // Automatically set today's purchase date
document.getElementById("purchaseDate").value =
    new Date().toISOString().split("T")[0];

        sessionStorage.removeItem("scannedFoodProduct");

        console.log("Scanned product filled successfully! 🎉");

    } catch (error) {
        console.error("Auto-fill error:", error);
    }
}

// Fill the form after Firebase initialization
initializeFoodWise().then(function() {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
        fillScannedProduct();
    }
});
