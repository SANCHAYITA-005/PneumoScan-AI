const xrayInput = document.getElementById("xrayInput");
const fileName = document.getElementById("fileName");
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const analyzeButton = document.getElementById("analyzeButton");

let selectedImage = null;

xrayInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
        alert("Please select a JPG or PNG image.");
        this.value = "";
        selectedImage = null;
        return;
    }

    selectedImage = file;

    fileName.textContent = "Selected: " + file.name;

    previewImage.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
});

analyzeButton.addEventListener("click", async function () {

    if (!selectedImage) {
        alert("Please upload a chest X-ray image first.");
        return;
    }

    const formData = new FormData();
    formData.append("image", selectedImage);

    analyzeButton.disabled = true;
    analyzeButton.textContent = "Analyzing X-Ray...";

    try {
        sessionStorage.removeItem("pneumoResult");

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Prediction failed.");
        }

        // Save prediction response
        sessionStorage.setItem(
            "pneumoResult",
            JSON.stringify(result)
        );

        // Open separate result page
        window.location.assign("/result");

    } catch (error) {
        alert(error.message);

        analyzeButton.disabled = false;
        analyzeButton.textContent = "Analyze Image →";
    }
});