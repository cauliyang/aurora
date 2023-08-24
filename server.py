from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        response = jsonify({"error": "No file part"})
        response.headers["Content-Type"] = "application/json"
        return response

    file = request.files["file"]
    if file.filename == "":
        response = jsonify({"error": "No selected file"})
        response.headers["Content-Type"] = "application/json"
        return response

    if file:
        data = file.read()
        response = jsonify({"jsonfile": data.decode("utf-8")})
        response.headers["Content-Type"] = "application/json"
        return response


if __name__ == "__main__":
    app.run(debug=True)
