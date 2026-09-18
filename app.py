import io
import os
import uuid

from flask import Flask, jsonify, render_template, request, send_file

from converters import excel_to_pdf, pdf_to_excel, pdf_to_word, word_to_pdf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB

CONVERSIONS = {
    "pdf-a-excel": {
        "label": "PDF a Excel",
        "accept": ".pdf",
        "output_ext": ".xlsx",
        "runner": pdf_to_excel.convert,
    },
    "excel-a-pdf": {
        "label": "Excel a PDF",
        "accept": ".xlsx,.xls",
        "output_ext": ".pdf",
        "runner": excel_to_pdf.convert,
    },
    "pdf-a-word": {
        "label": "PDF a Word",
        "accept": ".pdf",
        "output_ext": ".docx",
        "runner": pdf_to_word.convert,
    },
    "word-a-pdf": {
        "label": "Word a PDF",
        "accept": ".docx,.doc",
        "output_ext": ".pdf",
        "runner": word_to_pdf.convert,
    },
}


@app.route("/")
def index():
    return render_template("index.html", conversions=CONVERSIONS)


@app.route("/convertir/<mode>", methods=["POST"])
def convertir(mode):
    conversion = CONVERSIONS.get(mode)
    if conversion is None:
        return jsonify({"error": "Tipo de conversion no valido."}), 400

    uploaded_file = request.files.get("archivo")
    if uploaded_file is None or uploaded_file.filename == "":
        return jsonify({"error": "No se recibio ningun archivo."}), 400

    original_name = uploaded_file.filename
    name_root, ext = os.path.splitext(original_name)
    allowed_exts = conversion["accept"].split(",")
    if ext.lower() not in allowed_exts:
        return jsonify({"error": f"Formato no valido. Se espera: {conversion['accept']}"}), 400

    job_id = uuid.uuid4().hex
    input_path = os.path.join(UPLOAD_DIR, f"{job_id}{ext.lower()}")
    output_path = os.path.join(OUTPUT_DIR, f"{job_id}{conversion['output_ext']}")
    uploaded_file.save(input_path)

    try:
        conversion["runner"](input_path, output_path)
        if not os.path.exists(output_path):
            return jsonify({"error": "La conversion no genero un archivo de salida."}), 500
        with open(output_path, "rb") as f:
            file_bytes = f.read()
    except Exception as exc:
        return jsonify({"error": f"No se pudo convertir el archivo: {exc}"}), 500
    finally:
        for path in (input_path, output_path):
            try:
                os.remove(path)
            except OSError:
                pass

    download_name = f"{name_root}{conversion['output_ext']}"

    return send_file(
        io.BytesIO(file_bytes),
        as_attachment=True,
        download_name=download_name,
    )


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
