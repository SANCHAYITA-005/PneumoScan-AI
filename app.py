from flask import Flask, render_template, request, jsonify, send_from_directory, url_for
from werkzeug.utils import secure_filename
import os
import uuid
import requests

app = Flask(__name__)

# ---------------- CONFIGURATION ----------------

UPLOAD_FOLDER = "Uploads"

COLAB_API_URL = "https://voter-sage-contort.ngrok-free.dev/predict"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ---------------- FILE VALIDATION ----------------

def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in {"jpg", "jpeg", "png"}
    )


# ---------------- HOME PAGE ----------------

@app.route("/")
def home():
    return render_template("index.html")


# ---------------- RESULT PAGE ----------------

@app.route("/result")
def result_page():
    return render_template("result.html")


# ---------------- DISPLAY UPLOADED IMAGE ----------------

@app.route("/uploaded/<filename>")
def uploaded_image(filename):
    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename
    )


# ---------------- UPLOAD AND AI PREDICTION ----------------

@app.route("/upload", methods=["POST"])
def upload_image():

    if "image" not in request.files:
        return jsonify({"error": "No image selected"}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No image selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": "Only JPG and PNG images are allowed"
        }), 400

    filename = secure_filename(file.filename)

    unique_filename = str(uuid.uuid4()) + "_" + filename

    save_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        unique_filename
    )

    file.save(save_path)

    try:

        # Send image to Google Colab AI model

        with open(save_path, "rb") as image_file:

            response = requests.post(
                COLAB_API_URL,
                files={
                    "image": (
                        filename,
                        image_file,
                        file.mimetype or "application/octet-stream"
                    )
                },
                timeout=(10, 120)
            )

        # Get AI prediction

        try:
            result = response.json()
        except ValueError:
            return jsonify({
                "error": "AI server returned an invalid response."
            }), 502

        if response.status_code != 200:
            return jsonify({
                "error": result.get(
                    "error",
                    "AI prediction failed"
                )
            }), 500

        # Validate prediction

        prediction = str(
            result.get("prediction", "")
        ).upper()

        if prediction not in ["NORMAL", "PNEUMONIA"]:
            return jsonify({
                "error": "Invalid prediction received from AI model."
            }), 502

        if "confidence" not in result:
            return jsonify({
                "error": "Confidence score missing from AI response."
            }), 502

        # Send uploaded image URL to frontend

        result["prediction"] = prediction

        result["image"] = url_for(
            "uploaded_image",
            filename=unique_filename
        )

        return jsonify(result)

    except requests.exceptions.Timeout:

        return jsonify({
            "error": "AI server response timed out. Please try again."
        }), 504

    except requests.exceptions.RequestException:

        return jsonify({
            "error": "AI server se connection nahi ho paaya. Colab check karo."
        }), 503


# ---------------- FILE SIZE ERROR ----------------

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({
        "error": "Image size must be below 10 MB"
    }), 413


# ---------------- RUN FLASK ----------------

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )