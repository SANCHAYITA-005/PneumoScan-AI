const processing = document.getElementById("processing");
const resultSection = document.getElementById("result");
const errorScreen = document.getElementById("errorScreen");

const processText = document.getElementById("processText");
const progressBar = document.getElementById("progressBar");

const stages = [
    "Preparing chest X-ray...",
    "Processing image...",
    "AI model is analyzing the image...",
    "Generating prediction report..."
];

let progress = 0;
let stage = 0;

const timer = setInterval(() => {
    progress = Math.min(progress + 2, 90);

    progressBar.style.width = progress + "%";

    const newStage = Math.min(
        Math.floor(progress / 23),
        stages.length - 1
    );

    if (newStage !== stage) {
        stage = newStage;
        processText.textContent = stages[stage];
    }
}, 100);

function showError(message) {
    clearInterval(timer);
    processing.hidden = true;
    resultSection.hidden = true;
    errorScreen.hidden = false;

    document.getElementById("errorMessage").textContent = message;
}

async function loadResult() {
    try {
        const storedData = sessionStorage.getItem("pneumoResult");

        if (!storedData) {
            throw new Error(
                "No prediction data found. Please upload an X-ray again."
            );
        }

        const data = JSON.parse(storedData);

        // Support common prediction key names
        const prediction = String(
            data.prediction ??
            data.class ??
            data.result ??
            ""
        ).trim().toUpperCase();

        if (!["NORMAL", "PNEUMONIA"].includes(prediction)) {
            throw new Error(
                "Invalid prediction received from the server."
            );
        }

        // Confidence should be the predicted class confidence
        let confidence = Number(
            data.confidence ??
            data.confidence_score ??
            data.probability
        );

        if (!Number.isFinite(confidence)) {
            throw new Error("Confidence score is missing from the server.");
        }

        // Accept either 0-1 or 0-100 format
        if (confidence >= 0 && confidence <= 1) {
            confidence = confidence * 100;
        }

        confidence = Math.max(0, Math.min(100, confidence));

        await new Promise(resolve => setTimeout(resolve, 1800));

        // Show uploaded image
        const image = document.getElementById("patientImage");

        if (data.image) {
            image.src = data.image;
            image.style.display = "block";
        } else {
            image.style.display = "none";
        }

        // Prediction
        document.getElementById("prediction").textContent = prediction;

        document.getElementById("description").textContent =
            prediction === "PNEUMONIA"
                ? "The model classified this X-ray as pneumonia-associated. Please seek professional medical interpretation."
                : "The model classified this X-ray as normal. This does not rule out disease.";

        document.getElementById("statusIcon").textContent =
            prediction === "NORMAL" ? "✓" : "✦";

        document.getElementById("confidenceValue").textContent =
            confidence.toFixed(2) + "%";

        document.getElementById("confidenceBar").style.width =
            confidence + "%";

        // Complete processing
        progress = 100;
        progressBar.style.width = "100%";
        processText.textContent = "Analysis complete!";

        await new Promise(resolve => setTimeout(resolve, 500));

        clearInterval(timer);

        processing.hidden = true;
        resultSection.hidden = false;

    } catch (error) {
        showError(error.message);
    }
}

loadResult();