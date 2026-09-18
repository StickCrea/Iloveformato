(function () {
  const ICONS = {
    "pdf-a-excel": [["PDF", "chip-pdf"], ["XLS", "chip-xls"]],
    "excel-a-pdf": [["XLS", "chip-xls"], ["PDF", "chip-pdf"]],
    "pdf-a-word": [["PDF", "chip-pdf"], ["DOC", "chip-doc"]],
    "word-a-pdf": [["DOC", "chip-doc"], ["PDF", "chip-pdf"]],
  };

  document.querySelectorAll(".card-icon").forEach((el) => {
    const mode = el.dataset.icon;
    const pair = ICONS[mode];
    if (!pair) return;
    const [from, to] = pair;
    el.innerHTML =
      `<span class="chip ${from[1]}">${from[0]}</span>` +
      `<span aria-hidden="true">&rarr;</span>` +
      `<span class="chip ${to[1]}">${to[0]}</span>`;
  });

  const overlay = document.getElementById("overlay");
  const panelTitle = document.getElementById("panel-title");
  const panelClose = document.getElementById("panel-close");
  const dropStage = document.getElementById("drop-stage");
  const dropzone = document.getElementById("dropzone");
  const dropzoneAccept = document.getElementById("dropzone-accept");
  const fileInput = document.getElementById("file-input");
  const fileStage = document.getElementById("file-stage");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  const fileRemove = document.getElementById("file-remove");
  const convertBtn = document.getElementById("convert-btn");
  const progressStage = document.getElementById("progress-stage");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");
  const resultStage = document.getElementById("result-stage");
  const downloadLink = document.getElementById("download-link");
  const resetBtn = document.getElementById("reset-btn");
  const errorStage = document.getElementById("error-stage");
  const errorMessage = document.getElementById("error-message");
  const errorRetry = document.getElementById("error-retry");

  const stages = [dropStage, fileStage, progressStage, resultStage, errorStage];
  let currentMode = null;
  let currentFile = null;
  let currentObjectUrl = null;

  function showStage(stage) {
    stages.forEach((s) => (s.hidden = s !== stage));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function openPanel(card) {
    currentMode = card.dataset.mode;
    panelTitle.textContent = card.dataset.label;
    dropzoneAccept.textContent = `Formatos admitidos: ${card.dataset.accept}`;
    fileInput.accept = card.dataset.accept;
    currentFile = null;
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    fileInput.value = "";
    showStage(dropStage);
    overlay.hidden = false;
  }

  function closePanel() {
    overlay.hidden = true;
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function selectFile(file) {
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    showStage(fileStage);
  }

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => openPanel(card));
  });

  panelClose.addEventListener("click", closePanel);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePanel();
  });

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) selectFile(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (file) selectFile(file);
  });

  fileRemove.addEventListener("click", () => {
    currentFile = null;
    fileInput.value = "";
    showStage(dropStage);
  });

  function startConversion() {
    if (!currentFile || !currentMode) return;
    showStage(progressStage);
    progressFill.style.width = "0%";
    progressLabel.textContent = "Subiendo archivo...";

    const formData = new FormData();
    formData.append("archivo", currentFile);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/convertir/${currentMode}`);
    xhr.responseType = "blob";

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      progressFill.style.width = `${percent}%`;
      if (percent >= 100) progressLabel.textContent = "Procesando archivo...";
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const disposition = xhr.getResponseHeader("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^";]+)"?/);
        const downloadName = match ? match[1] : "archivo_convertido";
        currentObjectUrl = URL.createObjectURL(xhr.response);
        downloadLink.href = currentObjectUrl;
        downloadLink.setAttribute("download", downloadName);
        showStage(resultStage);
      } else {
        handleErrorResponse(xhr);
      }
    });

    xhr.addEventListener("error", () => {
      errorMessage.textContent = "No se pudo conectar con el servidor.";
      showStage(errorStage);
    });

    xhr.send(formData);
  }

  function handleErrorResponse(xhr) {
    const reader = new FileReader();
    reader.onload = () => {
      let message = "Ocurrio un error al convertir el archivo.";
      try {
        const data = JSON.parse(reader.result);
        if (data.error) message = data.error;
      } catch (err) {
        /* keep default message */
      }
      errorMessage.textContent = message;
      showStage(errorStage);
    };
    reader.readAsText(xhr.response);
  }

  convertBtn.addEventListener("click", startConversion);
  resetBtn.addEventListener("click", () => showStage(dropStage));
  errorRetry.addEventListener("click", () => showStage(dropStage));

  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.getAttribute("data-theme") || (prefersDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
})();
