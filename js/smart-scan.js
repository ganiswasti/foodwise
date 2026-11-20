
/* ==========================================
   FOODWISE - AI SMART SCAN
   Camera-only Packaged Food + Fresh Produce
========================================== */

let produceModel = null;

let packagedPhoto = null;
let producePhoto = null;

let packagedStream = null;
let produceStream = null;

const $ = (id) => document.getElementById(id);


/* ==========================================
   DATE HELPERS
========================================== */

function todayDate() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
    const date = new Date(`${dateString}T12:00:00`);

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* ==========================================
   DISPLAY HELPERS
========================================== */

function showMessage(elementId, message) {
    const element = $(elementId);

    if (element) {
        element.textContent = message;
    }
}

function showResults(elementId, message) {
    const element = $(elementId);

    if (element) {
        element.textContent = message;
        element.style.display = "block";
    }
}


/* ==========================================
   CAMERA HELPERS
========================================== */

async function startCamera(videoId, type) {

    const video = $(videoId);

    if (!video) {
        throw new Error("Camera preview element not found.");
    }

    stopCamera(type);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            "Camera access is unavailable. Use HTTPS or localhost and a supported browser."
        );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    });

    video.srcObject = stream;

    await video.play();

    if (type === "packaged") {
        packagedStream = stream;
    } else {
        produceStream = stream;
    }

    video.style.display = "block";

    return stream;
}


function stopCamera(type) {

    let stream;
    let videoId;

    if (type === "packaged") {
        stream = packagedStream;
        videoId = "packagedCamera";
        packagedStream = null;
    } else {
        stream = produceStream;
        videoId = "produceCamera";
        produceStream = null;
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const video = $(videoId);

    if (video) {
        video.pause();
        video.srcObject = null;
        video.style.display = "none";
    }
}


function setCameraButtons(type, cameraOpen) {

    const prefix = type === "packaged" ? "Packaged" : "Produce";

    const openButton = $(`open${prefix}CameraBtn`);
    const captureButton = $(`capture${prefix}PhotoBtn`);
    const stopButton = $(`stop${prefix}CameraBtn`);

    if (openButton) {
        openButton.disabled = cameraOpen;
    }

    if (captureButton) {
        captureButton.disabled = !cameraOpen;
    }

    if (stopButton) {
        stopButton.disabled = !cameraOpen;
    }
}


/* ==========================================
   OPEN PACKAGED FOOD CAMERA
========================================== */

async function openPackagedCamera() {

    try {
        showMessage(
            "packagedStatus",
            "Opening your camera... Please allow camera access."
        );

        $("packagedPreview").style.display = "none";

        await startCamera("packagedCamera", "packaged");

        packagedPhoto = null;

        $("analysePackagedBtn").disabled = true;

        setCameraButtons("packaged", true);

        showMessage(
            "packagedStatus",
            "Camera is ready! Position the package clearly and capture a photo."
        );

    } catch (error) {

        console.error("Packaged camera error:", error);

        showMessage(
            "packagedStatus",
            error.name === "NotAllowedError"
                ? "Camera permission was denied. Allow camera access in your browser settings."
                : "Could not open the camera. Check that your camera is connected and try again."
        );

        setCameraButtons("packaged", false);
    }
}


/* ==========================================
   OPEN FRESH PRODUCE CAMERA
========================================== */

async function openProduceCamera() {

    try {
        showMessage(
            "produceStatus",
            "Opening your camera... Please allow camera access."
        );

        $("producePreview").style.display = "none";

        await startCamera("produceCamera", "produce");

        producePhoto = null;

        $("analyseProduceBtn").disabled = true;

        setCameraButtons("produce", true);

        showMessage(
            "produceStatus",
            "Camera is ready! Place one fruit or vegetable in view and capture a photo."
        );

    } catch (error) {

        console.error("Produce camera error:", error);

        showMessage(
            "produceStatus",
            error.name === "NotAllowedError"
                ? "Camera permission was denied. Allow camera access in your browser settings."
                : "Could not open the camera. Check that your camera is connected and try again."
        );

        setCameraButtons("produce", false);
    }
}


/* ==========================================
   CAPTURE PHOTO FROM CAMERA
========================================== */

function capturePhoto(type) {

    const isPackaged = type === "packaged";

    const video = $(isPackaged ? "packagedCamera" : "produceCamera");
    const canvas = $(isPackaged ? "packagedCanvas" : "produceCanvas");
    const preview = $(isPackaged ? "packagedPreview" : "producePreview");

    if (!video || !canvas || !preview || !video.videoWidth) {

        showMessage(
            isPackaged ? "packagedStatus" : "produceStatus",
            "Camera is not ready yet. Please wait and try again."
        );

        return;
    }

    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(async (blob) => {

        if (!blob) {
            showMessage(
                isPackaged ? "packagedStatus" : "produceStatus",
                "Could not capture the photo. Please try again."
            );
            return;
        }

        const photoFile = new File(
            [blob],
            `${type}-food-photo.jpg`,
            { type: "image/jpeg" }
        );

        const imageUrl = URL.createObjectURL(blob);

        preview.onload = () => {
            URL.revokeObjectURL(imageUrl);
        };

        preview.src = imageUrl;
        preview.style.display = "block";

        if (isPackaged) {

            packagedPhoto = photoFile;

            stopCamera("packaged");

            $("analysePackagedBtn").disabled = false;

            $("retakePackagedPhotoBtn").hidden = false;

            showMessage(
                "packagedStatus",
                "Photo captured! Ready to analyse your packaged food."
            );

            setCameraButtons("packaged", false);

        } else {

            producePhoto = photoFile;

            stopCamera("produce");

            $("analyseProduceBtn").disabled = false;

            $("retakeProducePhotoBtn").hidden = false;

            showMessage(
                "produceStatus",
                "Photo captured! Ready to identify your fresh produce."
            );

            setCameraButtons("produce", false);
        }

    }, "image/jpeg", 0.92);
}


/* ==========================================
   RETAKE PHOTO
========================================== */

function retakePackagedPhoto() {

    packagedPhoto = null;

    $("packagedPreview").style.display = "none";
    $("analysePackagedBtn").disabled = true;
    $("retakePackagedPhotoBtn").hidden = true;

    openPackagedCamera();
}


function retakeProducePhoto() {

    producePhoto = null;

    $("producePreview").style.display = "none";
    $("analyseProduceBtn").disabled = true;
    $("retakeProducePhotoBtn").hidden = true;

    openProduceCamera();
}


/* ==========================================
   PACKAGED FOOD - BARCODE RECOGNITION
========================================== */

async function readBarcodeFromPhoto(file) {

    if (typeof Html5Qrcode === "undefined") {
        return null;
    }

    let scanner = null;

    try {

        scanner = new Html5Qrcode("smartBarcodeReader");

        const barcode = await scanner.scanFile(file, true);

        return barcode || null;

    } catch (error) {

        console.log("No barcode detected in this photo:", error);

        return null;

    } finally {

        if (scanner) {

            try {
                await scanner.clear();
            } catch (error) {
                console.log("Barcode scanner cleanup:", error);
            }
        }
    }
}


/* ==========================================
   PACKAGED FOOD - PRODUCT LOOKUP
========================================== */

async function findProduct(barcode) {

    const response = await fetch(
        `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json`
    );

    if (!response.ok) {
        throw new Error("Product database unavailable.");
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
        return null;
    }

    const product = data.product;

    return {
        name: product.product_name || "",
        brand: product.brands || "",
        quantity: product.quantity || "",
        category: guessCategory(
            `${product.categories || ""} ${product.product_name || ""}`
        ),
        barcode: barcode
    };
}


/* ==========================================
   PACKAGED FOOD - EXPIRY DATE OCR
========================================== */

async function readDatesFromPhoto(file) {

    if (typeof Tesseract === "undefined") {
        throw new Error("Text-reading library did not load.");
    }

    const result = await Tesseract.recognize(
        file,
        "eng",
        {
            logger: (message) => {

                if (message.status === "recognizing text") {

                    showMessage(
                        "packagedStatus",
                        `Reading package text: ${Math.round(message.progress * 100)}%`
                    );
                }
            }
        }
    );

    return result.data.text || "";
}


function extractExpiryCandidates(text) {

    const lines = text.split(/\r?\n/);

    const candidates = [];

    const datePattern =
        /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b|\b(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/g;

    lines.forEach((line, index) => {

        const upperLine = line.toUpperCase();

        const expiryLabel =
            /EXP|EXPIRY|EXPIRES|BEST BEFORE|USE BY|SELL BY/.test(upperLine);

        const manufacturingLabel =
            /MFG|MANUFACTURED|PKD|PACKED ON|MANUFACTURING/.test(upperLine);

        // Also check the previous line if the date label
        // and date have been printed on separate lines.
        const previousLine = (lines[index - 1] || "").toUpperCase();

        const previousHasExpiryLabel =
            /EXP|EXPIRY|EXPIRES|BEST BEFORE|USE BY|SELL BY/.test(previousLine);

        const previousHasManufacturingLabel =
            /MFG|MANUFACTURED|PKD|PACKED ON|MANUFACTURING/.test(previousLine);

        if (
            manufacturingLabel ||
            (!expiryLabel && !previousHasExpiryLabel) ||
            previousHasManufacturingLabel
        ) {
            return;
        }

        const pattern = new RegExp(datePattern.source, "g");

        let match;

        while ((match = pattern.exec(line)) !== null) {

            let year;
            let month;
            let day;

            if (match[4]) {

                year = Number(match[4]);
                month = Number(match[5]);
                day = Number(match[6]);

            } else {

                day = Number(match[1]);
                month = Number(match[2]);
                year = Number(match[3]);

                if (year < 100) {
                    year += 2000;
                }
            }

            if (year < 2000 || year > 2100) continue;
            if (month < 1 || month > 12) continue;
            if (day < 1 || day > 31) continue;

            const date = new Date(year, month - 1, day);

            if (
                date.getFullYear() !== year ||
                date.getMonth() !== month - 1 ||
                date.getDate() !== day
            ) {
                continue;
            }

            const formatted =
                `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            if (!candidates.includes(formatted)) {
                candidates.push(formatted);
            }
        }
    });

    return candidates;
}


/* ==========================================
   PACKAGED FOOD - ANALYSE PHOTO
========================================== */

async function analysePackagedPhoto() {

    if (!packagedPhoto) {
        alert("Please capture a package photo first.");
        return;
    }

    const button = $("analysePackagedBtn");

    if (button) button.disabled = true;

    showMessage(
        "packagedStatus",
        "Analysing your food package..."
    );

    let product = null;
    let barcode = null;
    let expiryCandidates = [];

    try {

        // STEP 1: Barcode recognition
        showMessage(
            "packagedStatus",
            "Looking for the barcode..."
        );

        barcode = await readBarcodeFromPhoto(packagedPhoto);

        if (barcode) {

            showMessage(
                "packagedStatus",
                "Barcode found! Looking up product details..."
            );

            try {
                product = await findProduct(barcode);
            } catch (error) {
                console.error("Product lookup error:", error);
            }
        }

        // STEP 2: Read printed expiry text
        showMessage(
            "packagedStatus",
            "Reading expiry information from your photo..."
        );

        const extractedText = await readDatesFromPhoto(packagedPhoto);

        expiryCandidates = extractExpiryCandidates(extractedText);

        window.foodWisePackagedResult = {
            product,
            barcode,
            expiryCandidates,
            extractedText
        };

        displayPackagedResult(
            product,
            barcode,
            expiryCandidates
        );

    } catch (error) {

        console.error("Packaged food analysis error:", error);

        showMessage(
            "packagedStatus",
            "Could not analyse this photo. Please try a clearer photo."
        );

    } finally {

        if (button) button.disabled = false;
    }
}


/* ==========================================
   DISPLAY PACKAGED FOOD RESULTS
========================================== */

function displayPackagedResult(product, barcode, dates) {

    const resultBox = $("packagedResults");

    if (!resultBox) return;

    resultBox.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Scan Results";

    resultBox.appendChild(heading);

    const barcodeText = document.createElement("p");

    barcodeText.textContent = barcode
        ? `Barcode detected: ${barcode}`
        : "Barcode not detected. The barcode may be on another side of the package.";

    resultBox.appendChild(barcodeText);

    const nameInput = $("packagedFoodName");
    const brandInput = $("packagedBrand");
    const quantityInput = $("packagedQuantity");
    const expiryInput = $("packagedExpiry");

    if (product) {

        if (nameInput) nameInput.value = product.name;
        if (brandInput) brandInput.value = product.brand;
        if (quantityInput) quantityInput.value = product.quantity;
    }

    if (dates.length > 0 && expiryInput) {
        expiryInput.value = dates[0];
    }

    const productText = document.createElement("p");

    productText.textContent = product
        ? `Product found: ${product.name || "Name unavailable"} | Brand: ${product.brand || "Not listed"}`
        : "Product details were not found. Enter the food name manually.";

    resultBox.appendChild(productText);

    if (dates.length > 0) {

        const dateLabel = document.createElement("label");
        dateLabel.textContent = "Possible expiry date — please verify:";

        const dateSelect = document.createElement("select");
        dateSelect.id = "packagedDateChoice";

        dates.forEach(date => {

            const option = document.createElement("option");

            option.value = date;
            option.textContent = date;

            dateSelect.appendChild(option);
        });

        dateSelect.addEventListener("change", () => {

            if (expiryInput) {
                expiryInput.value = dateSelect.value;
            }
        });

        resultBox.appendChild(dateLabel);
        resultBox.appendChild(dateSelect);

    } else {

        const warning = document.createElement("p");

        warning.textContent =
            "No clearly labelled expiry date was detected. Check the package manually or capture another photo of the expiry-date side.";

        resultBox.appendChild(warning);
    }

    const note = document.createElement("p");

    note.textContent =
        "Please verify the product details and printed expiry date before saving.";

    resultBox.appendChild(note);

    resultBox.style.display = "block";

    showMessage(
        "packagedStatus",
        "Analysis complete! Please check and confirm the results."
    );
}


/* ==========================================
   FRESH PRODUCE - LOAD AI MODEL
========================================== */

async function loadProduceModel() {

    if (produceModel) {
        return produceModel;
    }

    if (typeof mobilenet === "undefined") {
        throw new Error("AI image recognition model did not load.");
    }

    showMessage(
        "produceStatus",
        "Loading the AI food recognition model..."
    );

    produceModel = await mobilenet.load();

    return produceModel;
}


/* ==========================================
   FRESH PRODUCE - IDENTIFY FOOD
========================================== */

function mapProduceName(label) {

    const value = label.toLowerCase();

    const foodMap = [

        { words: ["banana"], name: "Banana", category: "Fruits" },
        { words: ["apple"], name: "Apple", category: "Fruits" },
        { words: ["orange"], name: "Orange", category: "Fruits" },
        { words: ["lemon"], name: "Lemon", category: "Fruits" },
        { words: ["pomegranate"], name: "Pomegranate", category: "Fruits" },
        { words: ["pineapple"], name: "Pineapple", category: "Fruits" },
        { words: ["strawberry"], name: "Strawberry", category: "Fruits" },
        { words: ["fig"], name: "Fig", category: "Fruits" },
        { words: ["mango"], name: "Mango", category: "Fruits" },
        { words: ["grape"], name: "Grapes", category: "Fruits" },

        { words: ["cucumber"], name: "Cucumber", category: "Vegetables" },
        { words: ["broccoli"], name: "Broccoli", category: "Vegetables" },
        { words: ["cauliflower"], name: "Cauliflower", category: "Vegetables" },
        { words: ["bell pepper", "pepper"], name: "Capsicum", category: "Vegetables" },
        { words: ["mushroom"], name: "Mushroom", category: "Vegetables" },
        { words: ["corn"], name: "Sweet Corn", category: "Vegetables" },
        { words: ["zucchini"], name: "Zucchini", category: "Vegetables" },
        { words: ["artichoke"], name: "Artichoke", category: "Vegetables" },
        { words: ["tomato"], name: "Tomato", category: "Vegetables" },
        { words: ["potato"], name: "Potato", category: "Vegetables" },
        { words: ["onion"], name: "Onion", category: "Vegetables" },
        { words: ["carrot"], name: "Carrot", category: "Vegetables" }

    ];

    for (const item of foodMap) {

        if (item.words.some(word => value.includes(word))) {

            return {
                name: item.name,
                category: item.category
            };
        }
    }

    return {
        name: label,
        category: "Other"
    };
}


/* ==========================================
   FRESH PRODUCE - ANALYSE PHOTO
========================================== */

async function analyseProducePhoto() {

    if (!producePhoto) {
        alert("Please capture a fruit or vegetable photo first.");
        return;
    }

    const button = $("analyseProduceBtn");

    if (button) button.disabled = true;

    try {

        const model = await loadProduceModel();

        const preview = $("producePreview");

        if (!preview || !preview.complete || !preview.naturalWidth) {
            throw new Error("Please capture the photo again.");
        }

        showMessage(
            "produceStatus",
            "AI is identifying your fruit or vegetable..."
        );

        const predictions = await model.classify(preview);

        if (!predictions || predictions.length === 0) {
            throw new Error("No food identification result found.");
        }

        const bestPrediction = predictions[0];

        const mappedFood = mapProduceName(bestPrediction.className);

        const nameInput = $("produceFoodName");
        const categoryInput = $("produceCategory");

        if (nameInput) {
            nameInput.value = mappedFood.name;
        }

        if (categoryInput) {
            categoryInput.value = mappedFood.category;
        }

        window.foodWiseProduceResult = {
            name: mappedFood.name,
            category: mappedFood.category,
            modelSuggestion: bestPrediction.className,
            confidence: bestPrediction.probability
        };

        displayProduceResult(bestPrediction, mappedFood);

        showMessage(
            "produceStatus",
            "Identification complete! Please confirm the suggested result."
        );

    } catch (error) {

        console.error("Produce recognition error:", error);

        showMessage(
            "produceStatus",
            "Could not identify this item. Please enter its name manually."
        );

    } finally {

        if (button) button.disabled = false;
    }
}


/* ==========================================
   FRESH PRODUCE - STORAGE SUGGESTIONS
========================================== */

const produceStorageGuide = {

    banana: {
        days: 4,
        storage: "Keep unripe bananas at room temperature. Refrigerate ripe bananas if you want to slow further ripening."
    },

    apple: {
        days: 21,
        storage: "Store apples in the refrigerator, preferably in the crisper drawer."
    },

    orange: {
        days: 14,
        storage: "Store oranges in a cool place or in the refrigerator."
    },

    lemon: {
        days: 21,
        storage: "Refrigerate lemons in a suitable container to help retain moisture."
    },

    tomato: {
        days: 5,
        storage: "Keep unripe tomatoes at room temperature. Refrigerate fully ripe tomatoes if needed."
    },

    potato: {
        days: 21,
        storage: "Keep potatoes in a cool, dark and well-ventilated place. Avoid direct sunlight."
    },

    onion: {
        days: 21,
        storage: "Store whole onions in a dry, cool and well-ventilated place."
    },

    cucumber: {
        days: 5,
        storage: "Refrigerate cucumbers and keep them dry."
    },

    carrot: {
        days: 14,
        storage: "Remove leafy tops and refrigerate carrots in a suitable container."
    },

    broccoli: {
        days: 5,
        storage: "Refrigerate broccoli and use it while the florets remain firm."
    },

    cauliflower: {
        days: 5,
        storage: "Refrigerate cauliflower in a breathable bag or suitable container."
    },

    capsicum: {
        days: 7,
        storage: "Store capsicum in the refrigerator's crisper drawer."
    },

    mango: {
        days: 5,
        storage: "Allow unripe mangoes to ripen at room temperature. Refrigerate ripe mangoes."
    },

    grapes: {
        days: 7,
        storage: "Refrigerate grapes unwashed and wash them just before eating."
    }

};


function getStorageSuggestion(foodName) {

    const name = foodName.toLowerCase();

    for (const [food, guide] of Object.entries(produceStorageGuide)) {

        if (name.includes(food)) {
            return guide;
        }
    }

    return {
        days: 3,
        storage: "Use general produce storage guidance. Check reliable storage advice for this specific item."
    };
}


/* ==========================================
   DISPLAY FRESH PRODUCE RESULTS
========================================== */

function displayProduceResult(prediction, mappedFood) {

    const resultBox = $("produceResults");

    if (!resultBox) return;

    const guide = getStorageSuggestion(mappedFood.name);

    resultBox.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "AI Identification Result";

    const nameText = document.createElement("p");
    nameText.textContent = `Suggested food: ${mappedFood.name}`;

    const confidenceText = document.createElement("p");
    confidenceText.textContent =
        `Model confidence: ${Math.round(prediction.probability * 100)}%`;

    const storageText = document.createElement("p");
    storageText.textContent = `Storage suggestion: ${guide.storage}`;

    const shelfText = document.createElement("p");
    shelfText.textContent =
        `Suggested storage period: approximately ${guide.days} days from purchase.`;

    const conditionText = document.createElement("p");
    conditionText.textContent =
        "Please select the visible condition yourself. The AI model identifies the food but cannot reliably determine freshness or internal spoilage.";

    resultBox.append(
        heading,
        nameText,
        confidenceText,
        storageText,
        shelfText,
        conditionText
    );

    resultBox.style.display = "block";

    const storageField = $("produceStorage");
    const shelfField = $("produceShelfLife");

    if (storageField) {
        storageField.value = guide.storage;
    }

    if (shelfField) {
        shelfField.value = guide.days;
    }
}


/* ==========================================
   FOOD CATEGORY GUESS
========================================== */

function guessCategory(text) {

    const value = text.toLowerCase();

    if (/fruit|apple|banana|mango|orange|grape|berry/.test(value)) {
        return "Fruits";
    }

    if (/vegetable|tomato|potato|onion|carrot|cucumber/.test(value)) {
        return "Vegetables";
    }

    if (/milk|cheese|butter|yogurt|curd|paneer/.test(value)) {
        return "Dairy";
    }

    if (/rice|wheat|flour|oat|grain|cereal/.test(value)) {
        return "Grains";
    }

    if (/chicken|meat|fish|beef|pork/.test(value)) {
        return "Meat";
    }

    return "Other";
}


/* ==========================================
   OPEN EXISTING FOOD FORM
========================================== */

function openFoodForm() {

    const link = document.querySelector(
        '.nav-link[data-section="add-food"]'
    );

    if (link) {
        link.click();
    } else {

        const button = document.querySelector(
            '[data-go="add-food"]'
        );

        if (button) button.click();
    }
}


function fillFoodForm(details) {

    if ($("foodName")) {
        $("foodName").value = details.name || "";
    }

    if ($("foodBrand")) {
        $("foodBrand").value = details.brand || "";
    }

    if ($("category")) {
        $("category").value = details.category || "Other";
    }

    if ($("quantity")) {
        $("quantity").value = details.quantity || "1 item";
    }

    if ($("purchaseDate")) {
        $("purchaseDate").value = todayDate();
    }

    if ($("expiryDate")) {
        $("expiryDate").value = details.expiryDate || "";
    }

    openFoodForm();
}


/* ==========================================
   ADD PACKAGED FOOD TO INVENTORY FORM
========================================== */

function addPackagedFoodToForm() {

    const name = $("packagedFoodName")?.value.trim();
    const brand = $("packagedBrand")?.value.trim();
    const quantity = $("packagedQuantity")?.value.trim();
    const expiryDate = $("packagedExpiry")?.value;

    if (!name) {
        alert("Please enter the food name.");
        return;
    }

    if (!expiryDate) {
        alert("Please confirm or enter the expiry date before continuing.");
        return;
    }

    fillFoodForm({
        name,
        brand,
        quantity,
        expiryDate,
        category: guessCategory(name)
    });
}


/* ==========================================
   ADD FRESH PRODUCE TO INVENTORY FORM
========================================== */

function addProduceToForm() {

    const name = $("produceFoodName")?.value.trim();
    const category = $("produceCategory")?.value;
    const condition = $("produceCondition")?.value;

    if (!name) {
        alert("Please enter or confirm the food name.");
        return;
    }

    if (!condition) {
        alert("Please select the visible condition of the produce.");
        return;
    }

    const guide = getStorageSuggestion(name);

    const expiryDate = addDays(todayDate(), guide.days);

    alert(
        "This is an estimated storage date, not a guaranteed expiry date. Please check the food regularly."
    );

    fillFoodForm({
        name,
        category: category || "Other",
        quantity: "1 item",
        expiryDate
    });
}


/* ==========================================
   SWITCH SCANNER MODES
========================================== */

function switchScannerMode(mode) {

    const packagedPanel = $("smartPackagedPanel");
    const producePanel = $("smartProducePanel");

    const packagedButton = $("packagedModeBtn");
    const produceButton = $("produceModeBtn");

    if (mode === "packaged") {

        packagedPanel.style.display = "block";
        producePanel.style.display = "none";

        packagedButton.classList.add("active");
        produceButton.classList.remove("active");

        stopCamera("produce");

    } else {

        packagedPanel.style.display = "none";
        producePanel.style.display = "block";

        produceButton.classList.add("active");
        packagedButton.classList.remove("active");

        stopCamera("packaged");
    }
}


/* ==========================================
   EVENT LISTENERS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Packaged food camera
    $("openPackagedCameraBtn")?.addEventListener(
        "click",
        openPackagedCamera
    );

    $("capturePackagedPhotoBtn")?.addEventListener(
        "click",
        () => capturePhoto("packaged")
    );

    $("retakePackagedPhotoBtn")?.addEventListener(
        "click",
        retakePackagedPhoto
    );

    $("stopPackagedCameraBtn")?.addEventListener(
        "click",
        () => {
            stopCamera("packaged");
            setCameraButtons("packaged", false);

            showMessage(
                "packagedStatus",
                "Camera stopped."
            );
        }
    );

    $("analysePackagedBtn")?.addEventListener(
        "click",
        analysePackagedPhoto
    );

    $("addPackagedFoodBtn")?.addEventListener(
        "click",
        addPackagedFoodToForm
    );


    // Fresh produce camera
    $("openProduceCameraBtn")?.addEventListener(
        "click",
        openProduceCamera
    );

    $("captureProducePhotoBtn")?.addEventListener(
        "click",
        () => capturePhoto("produce")
    );

    $("retakeProducePhotoBtn")?.addEventListener(
        "click",
        retakeProducePhoto
    );

    $("stopProduceCameraBtn")?.addEventListener(
        "click",
        () => {
            stopCamera("produce");
            setCameraButtons("produce", false);

            showMessage(
                "produceStatus",
                "Camera stopped."
            );
        }
    );

    $("analyseProduceBtn")?.addEventListener(
        "click",
        analyseProducePhoto
    );

    $("addProduceFoodBtn")?.addEventListener(
        "click",
        addProduceToForm
    );


    // Scanner mode buttons
    $("packagedModeBtn")?.addEventListener(
        "click",
        () => switchScannerMode("packaged")
    );

    $("produceModeBtn")?.addEventListener(
        "click",
        () => switchScannerMode("produce")
    );


    // Stop cameras if the user leaves the scanner section.
    document.querySelectorAll(".nav-link, .bottom-nav-link").forEach(link => {

        link.addEventListener("click", () => {

            if (link.dataset.section !== "scanner") {

                stopCamera("packaged");
                stopCamera("produce");
            }
        });
    });

    // Stop cameras if the user switches to another section
    // using a quick-action button.
    document.querySelectorAll("[data-go]").forEach(button => {

        button.addEventListener("click", () => {

            if (button.dataset.go !== "scanner") {

                stopCamera("packaged");
                stopCamera("produce");
            }
        });
    });

    console.log("FoodWise AI Smart Scan loaded! 🌱");
});
