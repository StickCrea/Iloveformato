from pdf2docx import Converter


def convert(input_path: str, output_path: str) -> None:
    cv = Converter(input_path)
    try:
        cv.convert(output_path)
    finally:
        cv.close()
