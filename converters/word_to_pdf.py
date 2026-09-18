import os
import shutil
import subprocess

try:
    from docx2pdf import convert as _docx2pdf_convert
except ImportError:
    _docx2pdf_convert = None


def _convert_with_libreoffice(input_path: str, output_path: str) -> None:
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise RuntimeError(
            "No se encontro Microsoft Word ni LibreOffice para convertir el documento."
        )

    output_dir = os.path.dirname(output_path) or "."
    subprocess.run(
        [
            soffice,
            "--headless",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            output_dir,
            input_path,
        ],
        check=True,
        timeout=120,
    )

    generated_name = os.path.splitext(os.path.basename(input_path))[0] + ".pdf"
    generated_path = os.path.join(output_dir, generated_name)
    if generated_path != output_path and os.path.exists(generated_path):
        os.replace(generated_path, output_path)


def convert(input_path: str, output_path: str) -> None:
    if _docx2pdf_convert is not None:
        _docx2pdf_convert(input_path, output_path)
    else:
        _convert_with_libreoffice(input_path, output_path)
