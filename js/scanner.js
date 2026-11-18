
/* ========================================
   FOODWISE - BARCODE SCANNER
======================================== */

let html5QrCode = null;
let isScanning = false;

const startButton = document.getElementById("startScanBtn");
const stopButton = document.getElementById("stopScanBtn");
const manualButton = document.getElementById("manualScanBtn");
const barcodeInput = document.getElementById("manualBarcode");
const scanStatus = document.getElementById("scanStatus");

function showStatus(message) {
    if (scanStatus) scanStatus.textContent = message;
}


// ========================================
// BARCODE PRODUCT SEARCH
// ========================================

async function searchProduct(barcode) {
    barcode = barcode.trim();

    if (!/^\d{8,14}$/.test(barcode)) {
        showStatus("Please enter a valid barcode number.");
        return;
    }

    showStatus("Searching product database... 🔍");

    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json`
        );

        if (!response.ok) {
            showStatus("Could not find this product.");
            return;
        }

        const data = await response.json();

        if (!data.product) {
            showStatus("Product not found in the database.");
            return;
        }

        const product = data.product;

        const productDetails = {
            name: product.product_name || "",
            brand: product.brands || "",
            quantity: product.quantity || "",
            barcode: barcode
        };

        if (!productDetails.name) {
            showStatus("Product name is missing from the database.");
            return;
        }

        sessionStorage.setItem(
            "scannedFoodProduct",
            JSON.stringify(productDetails)
        );

        showStatus("Product found! Opening dashboard... 🎉");

        setTimeout(() => {
            window.location.href = "./index.html#add-food";
        }, 1200);

    } catch (error) {
        console.error("Product search error:", error);
        showStatus("Could not connect to the product database.");
    }
}


// ========================================
// START BARCODE SCANNER
// ========================================

async function startScanner() {
    if (isScanning) return;

    if (typeof Html5Qrcode === "undefined") {
        showStatus("Scanner library could not load.");
        return;
    }

    try {
        showStatus("Opening camera... 📷");

        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
            showStatus("No camera found.");
            return;
        }

        html5QrCode = new Html5Qrcode("reader");

        await html5QrCode.start(
            cameras[0].id,
            {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E
                ]
            },
            async (decodedText) => {
                showStatus("Barcode detected!");

                await stopScanner();
                await searchProduct(decodedText);
            },
            () => {}
        );

        isScanning = true;
        showStatus("Camera active! Point it at a food barcode.");

    } catch (error) {
        console.error("Barcode camera error:", error);
        showStatus("Could not start camera. Check camera permissions.");
    }
}


// ========================================
// STOP BARCODE SCANNER
// ========================================

async function stopScanner() {
    if (html5QrCode && isScanning) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (error) {
            console.error("Scanner stop error:", error);
        }

        isScanning = false;
    }
}


// BARCODE BUTTON EVENTS

if (manualButton) {
    manualButton.addEventListener("click", () => {
        searchProduct(barcodeInput.value);
    });
}

if (startButton) {
    startButton.addEventListener("click", startScanner);
}

if (stopButton) {
    stopButton.addEventListener("click", stopScanner);
}


/* ========================================
   FOODWISE - EXPIRY DATE OCR
======================================== */

let ocrCameraStream = null;

const ocrVideo = document.getElementById("ocrVideo");
const ocrCanvas = document.getElementById("ocrCanvas");
const ocrStatus = document.getElementById("ocrStatus");
const ocrResult = document.getElementById("ocrResult");

const openOcrCamera = document.getElementById("startOcrCamera");
const captureOcrImage = document.getElementById("captureOcrImage");
const stopOcrCamera = document.getElementById("stopOcrCamera");


// ========================================
// OPEN OCR CAMERA
// ========================================

async function startOcrCamera() {
    try {
        ocrStatus.textContent = "Opening camera... 📷";

        if (ocrCameraStream) {
            stopOcrCameraFunction();
        }

        ocrCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" }
            },
            audio: false
        });

        ocrVideo.srcObject = ocrCameraStream;

        await new Promise(resolve => {
            if (ocrVideo.readyState >= 1) {
                resolve();
            } else {
                ocrVideo.addEventListener("loadedmetadata", resolve, {
                    once: true
                });
            }
        });

        await ocrVideo.play();

        ocrStatus.textContent =
            "Camera ready! Position the printed dates clearly.";

    } catch (error) {
        console.error("OCR camera error:", error);
        ocrStatus.textContent =
            "Could not open camera. Allow camera permission and try again.";
    }
}


// ========================================
// STOP OCR CAMERA
// ========================================

function stopOcrCameraFunction() {
    if (ocrCameraStream) {
        ocrCameraStream.getTracks().forEach(track => track.stop());
        ocrCameraStream = null;
    }

    if (ocrVideo) {
        ocrVideo.srcObject = null;
    }

    ocrStatus.textContent = "Camera stopped.";
}


// ========================================
// DATE VALIDATION
// ========================================

function isValidDate(day, month, year) {
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}


function formatDate(day, month, year) {
    return (
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
}


// ========================================
// FIND EXPIRY DATES
// ========================================

function findExpiryDate(text) {
    const detectedDates = [];

    // DD/MM/YY or DD/MM/YYYY
    const datePattern =
        /\b(0?[1-9]|[12]\d|3[01])\s*[/.\-\s]\s*(0?[1-9]|1[0-2])\s*[/.\-\s]\s*(\d{2}|\d{4})\b/g;

    let match;

    while ((match = datePattern.exec(text)) !== null) {
        const day = Number(match[1]);
        const month = Number(match[2]);
        const yearText = match[3];

        // Convert 27 into 2027, 28 into 2028, etc.
        // Do not change or guess the digits read by OCR.
        const year = yearText.length === 2
            ? 2000 + Number(yearText)
            : Number(yearText);

        if (isValidDate(day, month, year)) {
            const formattedDate = formatDate(day, month, year);

            if (!detectedDates.includes(formattedDate)) {
                detectedDates.push(formattedDate);
            }
        }
    }

    // YYYY-MM-DD
    const isoPattern =
        /\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g;

    while ((match = isoPattern.exec(text)) !== null) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        if (isValidDate(day, month, year)) {
            const formattedDate = formatDate(day, month, year);

            if (!detectedDates.includes(formattedDate)) {
                detectedDates.push(formattedDate);
            }
        }
    }

    return detectedDates;
}


// ========================================
// ENHANCE IMAGE QUALITY
// ========================================

function enhanceImage(sourceCanvas) {
    const processedCanvas = document.createElement("canvas");

    const scale = 3;

    processedCanvas.width = sourceCanvas.width * scale;
    processedCanvas.height = sourceCanvas.height * scale;

    const context = processedCanvas.getContext("2d");

    context.imageSmoothingEnabled = false;

    context.drawImage(
        sourceCanvas,
        0,
        0,
        processedCanvas.width,
        processedCanvas.height
    );

    const imageData = context.getImageData(
        0,
        0,
        processedCanvas.width,
        processedCanvas.height
    );

    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
        const gray =
            0.299 * pixels[i] +
            0.587 * pixels[i + 1] +
            0.114 * pixels[i + 2];

        const enhanced = Math.max(
            0,
            Math.min(255, (gray - 128) * 1.5 + 128)
        );

        pixels[i] = enhanced;
        pixels[i + 1] = enhanced;
        pixels[i + 2] = enhanced;
    }

    context.putImageData(imageData, 0, 0);

    return processedCanvas;
}


// ========================================
// DISPLAY DETECTED DATES
// ========================================

function displayDetectedDates(dates) {
    ocrResult.innerHTML = "";
    ocrResult.style.display = "block";

    const heading = document.createElement("h3");
    heading.textContent = "🎉 Dates detected!";

    const description = document.createElement("p");
    description.textContent =
        "Select the actual expiry date printed on your package.";

    const select = document.createElement("select");

    select.id = "detectedExpirySelect";
    select.style.width = "100%";
    select.style.padding = "12px";
    select.style.marginTop = "12px";
    select.style.borderRadius = "10px";

    dates.forEach((date, index) => {
        const option = document.createElement("option");

        option.value = date;
        option.textContent =
            `Date ${index + 1}: ${date.split("-").reverse().join("/")}`;

        select.appendChild(option);
    });

    const confirmButton = document.createElement("button");

    confirmButton.type = "button";
    confirmButton.textContent = "✓ Confirm Expiry Date";

    confirmButton.style.display = "block";
    confirmButton.style.width = "100%";
    confirmButton.style.padding = "12px";
    confirmButton.style.marginTop = "12px";
    confirmButton.style.borderRadius = "10px";
    confirmButton.style.border = "none";
    confirmButton.style.cursor = "pointer";
    confirmButton.style.background = "#607B58";
    confirmButton.style.color = "white";
    confirmButton.style.fontWeight = "bold";

    confirmButton.addEventListener("click", () => {
        const selectedDate = select.value;

        sessionStorage.setItem("scannedExpiryDate", selectedDate);

        ocrStatus.textContent = "Expiry date confirmed successfully! 🎉";

        const confirmation = document.createElement("p");

        confirmation.textContent =
            "Confirmed expiry date: " +
            selectedDate.split("-").reverse().join("/");

        ocrResult.appendChild(confirmation);

        console.log("Confirmed expiry date:", selectedDate);
    });

    ocrResult.appendChild(heading);
    ocrResult.appendChild(description);
    ocrResult.appendChild(select);
    ocrResult.appendChild(confirmButton);
}


// ========================================
// CAPTURE AND READ EXPIRY DATE
// ========================================

async function captureAndReadExpiry() {
    if (!ocrCameraStream) {
        ocrStatus.textContent = "Please open the camera first!";
        return;
    }

    try {
        ocrStatus.textContent = "Capturing image... 📸";

        await ocrVideo.play();

        if (!ocrVideo.videoWidth || !ocrVideo.videoHeight) {
            ocrStatus.textContent =
                "Camera is not ready. Please try again.";
            return;
        }

        // Capture camera image
        ocrCanvas.width = ocrVideo.videoWidth;
        ocrCanvas.height = ocrVideo.videoHeight;

        const context = ocrCanvas.getContext("2d");

        context.drawImage(
            ocrVideo,
            0,
            0,
            ocrCanvas.width,
            ocrCanvas.height
        );

        // Enlarge and enhance image
        ocrStatus.textContent = "Improving image quality... 🔍";

        const processedCanvas = enhanceImage(ocrCanvas);

        if (typeof Tesseract === "undefined") {
            ocrStatus.textContent =
                "OCR library failed to load. Refresh the page.";
            return;
        }

        // First OCR attempt
        ocrStatus.textContent = "Reading enlarged image... Please wait!";

        const enhancedResult = await Tesseract.recognize(
            processedCanvas,
            "eng",
            {
                logger: message => {
                    if (message.status === "recognizing text") {
                        ocrStatus.textContent =
                            "Reading text: " +
                            Math.round(message.progress * 100) + "%";
                    }
                }
            }
        );

        let extractedText = enhancedResult.data.text;

        console.log("Enhanced OCR extracted text:", extractedText);

        let detectedDates = findExpiryDate(extractedText);

        // Second OCR attempt if needed
        if (detectedDates.length === 0) {
            ocrStatus.textContent =
                "Trying another image-reading method...";

            const originalResult = await Tesseract.recognize(
                ocrCanvas,
                "eng"
            );

            const originalText = originalResult.data.text;

            console.log("Original OCR extracted text:", originalText);

            extractedText += "\n" + originalText;

            detectedDates = findExpiryDate(extractedText);
        }

        // Display results
        if (detectedDates.length === 0) {
            ocrStatus.textContent =
                "No expiry date detected. Try a clearer image.";

            ocrResult.style.display = "block";
            ocrResult.textContent = "Text detected: " + extractedText;

            return;
        }

        displayDetectedDates(detectedDates);

        ocrStatus.textContent =
            detectedDates.length +
            " date(s) detected! Please select the expiry date.";

    } catch (error) {
        console.error("OCR error:", error);

        ocrStatus.textContent =
            "Something went wrong while reading the image.";
    }
}


// ========================================
// OCR BUTTON EVENTS
// ========================================

if (openOcrCamera) {
    openOcrCamera.addEventListener("click", startOcrCamera);
}

if (captureOcrImage) {
    captureOcrImage.addEventListener("click", captureAndReadExpiry);
}

if (stopOcrCamera) {
    stopOcrCamera.addEventListener("click", stopOcrCameraFunction);
}


console.log("FoodWise barcode and OCR scanner loaded successfully! 💚");
