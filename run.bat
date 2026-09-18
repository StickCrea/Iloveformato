@echo off
cd /d "%~dp0"

if not exist venv (
    echo Creando entorno virtual...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -q -r requirements.txt
pip install -q -r requirements-windows.txt

start "" http://127.0.0.1:5000
python app.py
